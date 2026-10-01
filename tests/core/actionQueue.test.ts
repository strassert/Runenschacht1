import { describe, expect, it } from 'vitest'
import { runActionQueue, type Action, type ActionStep } from '../../src/core/combat/actionQueue'
import { executeEffect, evaluateValue, type ValueContext } from '../../src/core/effects/basicEffects'
import { resolveTargets } from '../../src/core/effects/targeting'
import { MAX_ACTIONS_PER_COMMAND, MAX_ENERGY, START_HP } from '../../src/core/constants'
import { makeCard, makeRngStates } from './helpers'
import type { EffectSpec } from '../../src/core/types/effects'
import type { CombatState, EnemyState, PlayerCombatState } from '../../src/core/types/state'
import type { RngStates } from '../../src/core/rng/streams'

function enemy(id: string, overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id,
    hp: 20,
    maxHp: 20,
    block: 0,
    statuses: [],
    defId: 'grubenratte',
    intent: null,
    moveHistory: [],
    aiMemory: {},
    alive: true,
    ...overrides,
  }
}

function player(overrides: Partial<PlayerCombatState> = {}): PlayerCombatState {
  return {
    id: 'player',
    hp: 50,
    maxHp: START_HP,
    block: 0,
    statuses: [],
    energy: 1,
    maxEnergy: MAX_ENERGY,
    drawPile: [],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    powers: [],
    cardsGeneratedThisCombat: 0,
    cardsRemovedThisCombat: 0,
    ...overrides,
  }
}

function combat(overrides: Partial<CombatState> = {}): CombatState {
  return {
    turn: 1,
    phase: 'playerTurn',
    player: player(),
    enemies: [enemy('enemy-0')],
    cardsPlayedThisTurn: [],
    cardsPlayedThisCombat: 0,
    counters: {},
    roomType: 'combat',
    ...overrides,
  }
}

function action(effect: EffectSpec, overrides: Partial<Action> = {}): Action {
  return { effect, sourceId: 'player', targetId: null, ...overrides }
}

describe('runActionQueue – FIFO, Einreihen, Schutz, Tod', () => {
  it('Actions werden in Reihenfolge ausgeführt (FIFO)', () => {
    const c = combat({ player: player({ drawPile: [makeCard('c_01')] }) })
    const r = runActionQueue(
      [
        action({ type: 'damage', amount: 5, target: 'enemy' }),
        action({ type: 'block', amount: 3 }),
        action({ type: 'gainEnergy', amount: 1 }),
        action({ type: 'draw', count: 1 }),
      ],
      c,
      makeRngStates(),
    )
    expect(r.events.map((e) => e.type)).toEqual([
      'damageDealt',
      'hpChanged',
      'blockGained',
      'energyChanged',
      'cardDrawn',
    ])
    expect(r.actionsProcessed).toBe(4)
    expect(r.combat.enemies[0]?.hp).toBe(15)
    expect(r.combat.player.hand).toHaveLength(1)
  })

  it('„vorne einreihen": front-Actions kommen vor der restlichen Queue', () => {
    const c = combat({ player: player({ drawPile: [makeCard('c_01')] }) })
    const exec = (a: Action, cs: CombatState, states: RngStates): ActionStep => {
      const step: ActionStep = { ...executeEffect(a, cs, states) }
      if (a.effect.type === 'damage') {
        step.newActions = [
          action({ type: 'gainEnergy', amount: 1 }, { front: true }),
          action({ type: 'draw', count: 1 }),
        ]
      }
      return step
    }
    const r = runActionQueue(
      [action({ type: 'damage', amount: 5, target: 'enemy' }), action({ type: 'block', amount: 3 })],
      c,
      makeRngStates(),
      exec,
    )
    expect(r.events.map((e) => e.type)).toEqual([
      'damageDealt',
      'hpChanged',
      'energyChanged',
      'blockGained',
      'cardDrawn',
    ])
  })

  it('Endlosschleifenschutz: nach MAX_ACTIONS_PER_COMMAND Actions Fehler', () => {
    const exec = (a: Action, cs: CombatState, states: RngStates): ActionStep => ({
      ...executeEffect(a, cs, states),
      newActions: [action({ type: 'gainEnergy', amount: 0 })],
    })
    expect(() =>
      runActionQueue([action({ type: 'gainEnergy', amount: 0 })], combat(), makeRngStates(), exec),
    ).toThrow(/1000/)
  })

  it('genau MAX_ACTIONS_PER_COMMAND Actions sind erlaubt', () => {
    let enqueued = 0
    const exec = (a: Action, cs: CombatState, states: RngStates): ActionStep => {
      const step: ActionStep = { ...executeEffect(a, cs, states) }
      if (enqueued < MAX_ACTIONS_PER_COMMAND - 1) {
        enqueued++
        step.newActions = [a]
      }
      return step
    }
    const r = runActionQueue(
      [action({ type: 'gainEnergy', amount: 0 })],
      combat(),
      makeRngStates(),
      exec,
    )
    expect(r.actionsProcessed).toBe(MAX_ACTIONS_PER_COMMAND)
  })

  it('Tod mitten in der Queue: alle Gegner tot → victory, Queue verworfen', () => {
    const c = combat({ enemies: [enemy('enemy-0', { hp: 3 }), enemy('enemy-1', { hp: 3 })] })
    const r = runActionQueue(
      [action({ type: 'damage', amount: 5, target: 'allEnemies' }), action({ type: 'block', amount: 3 })],
      c,
      makeRngStates(),
    )
    expect(r.actionsProcessed).toBe(1)
    expect(r.combat.phase).toBe('victory')
    expect(r.combat.enemies.every((e) => !e.alive)).toBe(true)
    expect(r.events).toContainEqual({ type: 'enemyDied', enemyId: 'enemy-0' })
    expect(r.events).toContainEqual({ type: 'enemyDied', enemyId: 'enemy-1' })
    expect(r.events.filter((e) => e.type === 'blockGained')).toHaveLength(0)
  })

  it('Spieler-Tod mitten in der Queue → defeat (Gegner-Action)', () => {
    const c = combat({ player: player({ hp: 3 }) })
    const r = runActionQueue(
      [action({ type: 'damage', amount: 5, target: 'enemy' }, { sourceId: 'enemy-0' })],
      c,
      makeRngStates(),
    )
    expect(r.combat.phase).toBe('defeat')
    expect(r.combat.player.hp).toBe(0)
  })

  it('Tod-Priorität: Dornen töten mich mit dem letzten Gegner → defeat', () => {
    const c = combat({
      player: player({ hp: 3 }),
      enemies: [enemy('enemy-0', { hp: 1, statuses: [{ id: 'thorns', stacks: 5 }] })],
    })
    const r = runActionQueue([action({ type: 'damage', amount: 5, target: 'enemy' })], c, makeRngStates())
    expect(r.combat.phase).toBe('defeat')
    expect(r.combat.enemies[0]?.alive).toBe(false)
  })
})

describe('executeEffect – die fünf Basis-Effekte', () => {
  it('damage: Kraft skaliert, tags [raw] ignoriert Kraft', () => {
    const c = combat({ player: player({ statuses: [{ id: 'strength', stacks: 2 }] }) })
    const r = runActionQueue(
      [
        action({ type: 'damage', amount: 5, target: 'enemy' }),
        action({ type: 'damage', amount: 5, target: 'enemy', tags: ['raw'] }),
      ],
      c,
      makeRngStates(),
    )
    const damages = r.events.filter((e) => e.type === 'damageDealt')
    expect(damages[0]?.amount).toBe(7)
    expect(damages[1]?.amount).toBe(5)
  })

  it('damage hits=3: drei Einzel-Treffer', () => {
    const r = runActionQueue(
      [action({ type: 'damage', amount: 5, hits: 3, target: 'enemy' })],
      combat(),
      makeRngStates(),
    )
    expect(r.events.filter((e) => e.type === 'damageDealt')).toHaveLength(3)
    expect(r.combat.enemies[0]?.hp).toBe(5)
  })

  it('block: Gewandtheit + Zerbrechlich (Abrundung)', () => {
    const c = combat({
      player: player({ statuses: [{ id: 'dexterity', stacks: 2 }, { id: 'frail', stacks: 3 }] }),
    })
    const r = runActionQueue([action({ type: 'block', amount: 5 })], c, makeRngStates())
    expect(r.events).toEqual([{ type: 'blockGained', entityId: 'player', amount: 5, total: 5 }])
    expect(r.combat.player.block).toBe(5)
  })

  it('applyStatus: Bannrune blockt den Debuff', () => {
    const c = combat({ enemies: [enemy('enemy-0', { statuses: [{ id: 'artifact', stacks: 2 }] })] })
    const r = runActionQueue(
      [action({ type: 'applyStatus', status: 'vulnerable', stacks: 2, target: 'enemy' })],
      c,
      makeRngStates(),
    )
    expect(r.combat.enemies[0]?.statuses).toEqual([{ id: 'artifact', stacks: 1 }])
    expect(r.events).toEqual([
      { type: 'statusApplied', targetId: 'enemy-0', status: 'artifact', stacks: -1, total: 1 },
    ])
  })

  it('applyStatus target self wirkt auf den Absender', () => {
    const r = runActionQueue(
      [action({ type: 'applyStatus', status: 'strength', stacks: 2, target: 'self' })],
      combat(),
      makeRngStates(),
    )
    expect(r.combat.player.statuses).toEqual([{ id: 'strength', stacks: 2 }])
  })

  it('draw: leerer Nachzugstapel mischt die Ablage (drawPileRefilled)', () => {
    const c = combat({
      player: player({ drawPile: [makeCard('c_01')], discardPile: [makeCard('c_02'), makeCard('c_03')] }),
    })
    const r = runActionQueue([action({ type: 'draw', count: 3 })], c, makeRngStates())
    expect(r.combat.player.hand).toHaveLength(3)
    expect(r.events.map((e) => e.type)).toContain('drawPileRefilled')
  })

  it('gainEnergy: energyChanged Event', () => {
    const r = runActionQueue([action({ type: 'gainEnergy', amount: 2 })], combat(), makeRngStates())
    expect(r.combat.player.energy).toBe(3)
    expect(r.events).toEqual([{ type: 'energyChanged', entityId: 'player', delta: 2, total: 3 }])
  })

  it('nicht implementierter Effect wirft Fehler (heal ist seit M3.1a implementiert)', () => {
    const unknown = { type: 'rs_zukunft', amount: 5 } as unknown as EffectSpec
    expect(() => executeEffect(action(unknown), combat(), makeRngStates())).toThrow(/rs_zukunft/)
  })
})

describe('resolveTargets', () => {
  const c = combat({ enemies: [enemy('e1'), enemy('e2'), enemy('e3', { alive: false })] })

  it('allEnemies: alle lebenden Gegner der Gegenseite', () => {
    expect(resolveTargets('allEnemies', c, 'player', null, makeRngStates()).targets).toEqual(['e1', 'e2'])
  })

  it('randomEnemy: seedbestimmt, RNG-Zustand Fortschritt', () => {
    const states = makeRngStates('WUERFEL')
    const a = resolveTargets('randomEnemy', c, 'player', null, states)
    const b = resolveTargets('randomEnemy', c, 'player', null, states)
    expect(a.targets).toHaveLength(1)
    expect(a.targets).toEqual(b.targets)
    expect(JSON.stringify(a.rngStates)).not.toBe(JSON.stringify(states))
  })

  it('enemy: explizites Ziel, sonst erster lebender Kandidat', () => {
    expect(resolveTargets('enemy', c, 'player', 'e2', makeRngStates()).targets).toEqual(['e2'])
    expect(resolveTargets('enemy', c, 'player', 'e3', makeRngStates()).targets).toEqual(['e1'])
    expect(resolveTargets('enemy', c, 'player', null, makeRngStates()).targets).toEqual(['e1'])
  })

  it('self/none und Perspektive des Absenders', () => {
    expect(resolveTargets('self', c, 'player', null, makeRngStates()).targets).toEqual(['player'])
    expect(resolveTargets('none', c, 'player', null, makeRngStates()).targets).toEqual([])
    expect(resolveTargets('enemy', c, 'e1', null, makeRngStates()).targets).toEqual(['player'])
  })
})

describe('evaluateValue', () => {
  const c = combat({
    player: player({
      block: 6,
      statuses: [{ id: 'strength', stacks: 3 }],
      drawPile: [makeCard('c_01'), makeCard('c_02')],
    }),
    enemies: [enemy('e1', { statuses: [{ id: 'vulnerable', stacks: 2 }] })],
  })
  const ctx: ValueContext = {
    combat: c,
    source: c.player,
    target: c.enemies[0] ?? null,
    vars: { heat: 4 },
    xValue: 3,
  }

  it('alle ValueExpr-Arten', () => {
    expect(evaluateValue(5, ctx)).toBe(5)
    expect(
      evaluateValue({ kind: 'perStatus', status: 'vulnerable', of: 'target', base: 5, per: 2 }, ctx),
    ).toBe(9)
    expect(evaluateValue({ kind: 'perStatus', status: 'strength', of: 'self', base: 1, per: 2 }, ctx)).toBe(7)
    expect(evaluateValue({ kind: 'var', name: 'heat', mul: 2, add: 1 }, ctx)).toBe(9)
    expect(evaluateValue({ kind: 'x', mul: 3, add: 2 }, ctx)).toBe(11)
    expect(evaluateValue({ kind: 'currentBlock', mul: 0.5 }, ctx)).toBe(3)
    expect(evaluateValue({ kind: 'cardsInPile', pile: 'draw' }, ctx)).toBe(2)
  })
})
