// Tests für M3.1a: alle Extended-EffectSpecs (moreEffects.ts), ValueExpr-
// Anbindung über counters (consumeHeat → var), ConditionExpr (conditions.ts)
// und registrierte script-Effekte. Basis-Effekte/evaluateValue: actionQueue.test.ts.
import { describe, expect, it } from 'vitest'
import type { CardDef } from '../../src/core/types/cards'
import type { ConditionExpr, EffectSpec } from '../../src/core/types/effects'
import type { CombatState, EnemyState, PlayerCombatState } from '../../src/core/types/state'
import { MAX_ENERGY, MAX_HAND, START_HP } from '../../src/core/constants'
import { registerCard, registerScript } from '../../src/core/registry'
import { runActionQueue } from '../../src/core/combat/actionQueue'
import { checkCombatInvariants } from '../../src/core/invariants'
import { executeEffect, type EffectInvocation } from '../../src/core/effects/basicEffects'
import { evaluateCondition } from '../../src/core/effects/conditions'
import { executeExtendedEffect, type EffectScriptCtx } from '../../src/core/effects/moreEffects'
import { makeCards, makeRngStates } from './helpers'

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

function inv(effect: EffectSpec, overrides: Partial<EffectInvocation> = {}): EffectInvocation {
  return { effect, sourceId: 'player', targetId: null, ...overrides }
}

const TOKEN: CardDef = {
  id: 'test_token',
  nameKey: 'card.test_token.name',
  type: 'status',
  rarity: 'special',
  cost: 0,
  target: 'none',
  keywords: ['unplayable'],
  effects: [],
  upgrade: {},
  descriptionKey: 'card.test_token.desc',
  characterId: 'neutral',
}

describe('consumeHeat', () => {
  it('entfernt Hitze und speichert die Menge in counters[store]', () => {
    const c = combat({ player: player({ statuses: [{ id: 'heat', stacks: 6 }] }) })
    const r = executeEffect(inv({ type: 'consumeHeat', store: 'hitze' }), c, makeRngStates())
    expect(r.combat.player.statuses).toEqual([])
    expect(r.combat.counters['hitze']).toBe(6)
    expect(r.events).toEqual([{ type: 'statusRemoved', targetId: 'player', status: 'heat' }])
  })
  it('var-Wert liest die gespeicherte Hitze (Action-Übergreifend)', () => {
    const c = combat({ player: player({ statuses: [{ id: 'heat', stacks: 6 }] }) })
    const consumed = executeEffect(inv({ type: 'consumeHeat', store: 'hitze' }), c, makeRngStates())
    const dealt = executeEffect(
      inv({ type: 'damage', amount: { kind: 'var', name: 'hitze' }, target: 'enemy' }),
      consumed.combat,
      consumed.rngStates,
    )
    expect(dealt.combat.enemies[0].hp).toBe(14) // 20 - 6
  })
  it('ohne Hitze: kein Event, Counter 0', () => {
    const r = executeEffect(inv({ type: 'consumeHeat', store: 'hitze' }), combat(), makeRngStates())
    expect(r.events).toEqual([])
    expect(r.combat.counters['hitze']).toBe(0)
  })
})

describe('heal', () => {
  it('heilt die Quelle, gedeckelt bei maxHp', () => {
    const c = combat({ player: player({ hp: 30 }) })
    const r = executeEffect(inv({ type: 'heal', amount: 10 }), c, makeRngStates())
    expect(r.combat.player.hp).toBe(40)
    expect(r.events).toEqual([{ type: 'hpChanged', entityId: 'player', delta: 10, total: 40 }])
    const capped = executeEffect(inv({ type: 'heal', amount: 100 }), c, makeRngStates())
    expect(capped.combat.player.hp).toBe(START_HP)
  })
})

describe('loseHp', () => {
  it('direkter HP-Verlust ignoriert Block', () => {
    const c = combat({ enemies: [enemy('enemy-0', { block: 5 })] })
    const r = executeEffect(inv({ type: 'loseHp', amount: 8, target: 'enemy' }), c, makeRngStates())
    expect(r.combat.enemies[0].hp).toBe(12)
    expect(r.combat.enemies[0].block).toBe(5)
  })
  it('tödlicher Selbst-Schaden → defeat (über Action-Queue)', () => {
    const c = combat({ player: player({ hp: 5 }) })
    const r = runActionQueue([inv({ type: 'loseHp', amount: 10, target: 'self' })], c, makeRngStates())
    expect(r.combat.player.hp).toBe(0)
    expect(r.combat.phase).toBe('defeat')
  })
})

describe('addCard', () => {
  it('erzeugt Karte auf der Hand (UID c_gen<N>, cardGenerated-Event)', () => {
    registerCard(TOKEN)
    const r = executeEffect(
      inv({ type: 'addCard', cardId: 'test_token', to: 'hand', count: 1 }),
      combat(),
      makeRngStates(),
    )
    expect(r.combat.player.hand).toEqual([{ uid: 'c_gen1', defId: 'test_token', upgraded: false }])
    expect(r.combat.player.cardsGeneratedThisCombat).toBe(1)
    expect(r.events).toEqual([
      { type: 'cardGenerated', cardUid: 'c_gen1', cardId: 'test_token', to: 'hand' },
    ])
  })
  it('to draw / to discard (upgraded möglich)', () => {
    registerCard(TOKEN)
    const draw = executeEffect(
      inv({ type: 'addCard', cardId: 'test_token', to: 'draw', count: 2 }),
      combat(),
      makeRngStates(),
    )
    expect(draw.combat.player.drawPile).toHaveLength(2)
    const disc = executeEffect(
      inv({ type: 'addCard', cardId: 'test_token', to: 'discard', count: 1, upgraded: true }),
      combat(),
      makeRngStates(),
    )
    expect(disc.combat.player.discardPile[0].upgraded).toBe(true)
  })
  it('volle Hand → Überlauf in die Ablage, Invarianten halten', () => {
    registerCard(TOKEN)
    const c = combat({ player: player({ hand: makeCards(MAX_HAND) }) })
    const r = executeEffect(
      inv({ type: 'addCard', cardId: 'test_token', to: 'hand', count: 1 }),
      c,
      makeRngStates(),
    )
    expect(r.combat.player.hand).toHaveLength(MAX_HAND)
    expect(r.combat.player.discardPile).toHaveLength(1)
    expect(r.events[0]).toMatchObject({ type: 'cardGenerated', to: 'discard' })
    expect(checkCombatInvariants(r.combat.player, MAX_HAND)).toEqual([])
  })
  it('unbekannte Karten-ID → Fehler mit ID', () => {
    expect(() =>
      executeEffect(
        inv({ type: 'addCard', cardId: 'rs_unbekannt', to: 'hand', count: 1 }),
        combat(),
        makeRngStates(),
      ),
    ).toThrow('rs_unbekannt')
  })
})

describe('discard (choice random)', () => {
  it('wirft zufällig Karten aus der Hand in die Ablage', () => {
    const c = combat({ player: player({ hand: makeCards(3) }) })
    const r = executeEffect(inv({ type: 'discard', count: 2, choice: 'random' }), c, makeRngStates())
    expect(r.combat.player.hand).toHaveLength(1)
    expect(r.combat.player.discardPile).toHaveLength(2)
    expect(r.events.filter((e) => e.type === 'cardDiscarded')).toHaveLength(2)
  })
  it('gleicher Seed → gleiche Auswahl (Stream combat)', () => {
    const c = combat({ player: player({ hand: makeCards(3) }) })
    const a = executeEffect(inv({ type: 'discard', count: 2, choice: 'random' }), c, makeRngStates('TEST1'))
    const b = executeEffect(inv({ type: 'discard', count: 2, choice: 'random' }), c, makeRngStates('TEST1'))
    expect(a.combat.player.hand[0].uid).toBe(b.combat.player.hand[0].uid)
  })
  it('choice player → Fehler bis M3.1b (pendingChoice)', () => {
    const c = combat({ player: player({ hand: makeCards(2) }) })
    expect(() =>
      executeEffect(inv({ type: 'discard', count: 1, choice: 'player' }), c, makeRngStates()),
    ).toThrow(/M3\.1b/)
  })
})

describe('exhaustFromHand (choice random)', () => {
  it('erschöpft zufällig eine Karte vom Stapel', () => {
    const c = combat({ player: player({ hand: makeCards(2) }) })
    const r = executeEffect(inv({ type: 'exhaustFromHand', count: 1, choice: 'random' }), c, makeRngStates())
    expect(r.combat.player.hand).toHaveLength(1)
    expect(r.combat.player.exhaustPile).toHaveLength(1)
    // Karte bleibt im Kampf (Exhauststapel zählt weiter) → kein cardsRemoved.
    expect(r.combat.player.cardsRemovedThisCombat).toBe(0)
  })
})

describe('upgradeInHand', () => {
  it("'all' upgraded die ganze Hand", () => {
    const c = combat({ player: player({ hand: makeCards(2) }) })
    const r = executeEffect(inv({ type: 'upgradeInHand', count: 'all', choice: 'random' }), c, makeRngStates())
    expect(r.combat.player.hand.every((card) => card.upgraded)).toBe(true)
  })
  it('random 1 upgraded genau eine Karte', () => {
    const c = combat({ player: player({ hand: makeCards(3) }) })
    const r = executeEffect(inv({ type: 'upgradeInHand', count: 1, choice: 'random' }), c, makeRngStates())
    expect(r.combat.player.hand.filter((card) => card.upgraded)).toHaveLength(1)
  })
})

describe('gainGold / gainMaxHp', () => {
  it('gainGold puffert in counters + goldChanged-Event', () => {
    const r = executeEffect(inv({ type: 'gainGold', amount: 15 }), combat(), makeRngStates())
    expect(r.combat.counters['goldGained']).toBe(15)
    expect(r.events).toEqual([{ type: 'goldChanged', delta: 15, total: 15 }])
  })
  it('gainMaxHp hebt maxHp und aktuelle HP', () => {
    const r = executeEffect(inv({ type: 'gainMaxHp', amount: 10 }), combat(), makeRngStates())
    expect(r.combat.player.maxHp).toBe(START_HP + 10)
    expect(r.combat.player.hp).toBe(60)
    expect(r.events).toEqual([{ type: 'hpChanged', entityId: 'player', delta: 10, total: 60 }])
  })
})

describe('conditional', () => {
  const effect: EffectSpec = {
    type: 'conditional',
    if: { kind: 'selfStatusAtLeast', status: 'heat', value: 3 },
    then: [{ type: 'block', amount: 4 }],
    else: [{ type: 'gainEnergy', amount: 1 }],
  }
  it('then-Zweig bei erfüllter Bedingung', () => {
    const c = combat({ player: player({ statuses: [{ id: 'heat', stacks: 5 }] }) })
    const r = executeEffect(inv(effect), c, makeRngStates())
    expect(r.combat.player.block).toBe(4)
    expect(r.combat.player.energy).toBe(1) // else-Zweig nicht ausgeführt
  })
  it('else-Zweig sonst', () => {
    const r = executeEffect(inv(effect), combat(), makeRngStates())
    expect(r.combat.player.block).toBe(0)
    expect(r.combat.player.energy).toBe(2)
  })
  it('targetHasStatus + damage im then-Zweig', () => {
    const c = combat({ enemies: [enemy('enemy-0', { statuses: [{ id: 'vulnerable', stacks: 1 }] })] })
    const r = executeEffect(
      inv(
        {
          type: 'conditional',
          if: { kind: 'targetHasStatus', status: 'vulnerable' },
          then: [{ type: 'damage', amount: 5, target: 'enemy' }],
        },
        { targetId: 'enemy-0' },
      ),
      c,
      makeRngStates(),
    )
    expect(r.combat.enemies[0].hp).toBe(13) // 5 × 1,5 (Verwundbar) = 7,5 → 7
  })
})

describe('repeat', () => {
  it('führt Unter-Effekte mehrfach aus', () => {
    const r = executeEffect(
      inv({ type: 'repeat', times: 3, effects: [{ type: 'block', amount: 2 }] }),
      combat(),
      makeRngStates(),
    )
    expect(r.combat.player.block).toBe(6)
  })
  it('über dem Maximum → Fehler (Endlosschleifenschutz)', () => {
    expect(() =>
      executeEffect(
        inv({ type: 'repeat', times: 101, effects: [{ type: 'block', amount: 1 }] }),
        combat(),
        makeRngStates(),
      ),
    ).toThrow(/Maximum/)
  })
})

describe('script', () => {
  it('registrierte Script-Funktion deklariert Extra-Effekte (ctx.effects)', () => {
    registerScript('test_script', (ctx, params) => {
      const c = ctx as EffectScriptCtx
      c.effects.push({ type: 'gainEnergy', amount: params?.n ?? 1 })
    })
    const r = executeExtendedEffect(
      inv({ type: 'script', scriptId: 'test_script', params: { n: 2 } }),
      combat(),
      makeRngStates(),
    )
    expect(r.combat.player.energy).toBe(3) // 1 + 2
  })
  it('unbekanntes Script → Fehler mit ID', () => {
    expect(() =>
      executeExtendedEffect(inv({ type: 'script', scriptId: 'rs_missing' }), combat(), makeRngStates()),
    ).toThrow('rs_missing')
  })
})

describe('evaluateCondition (alle vier ConditionExpr-Arten)', () => {
  const source = player({ statuses: [{ id: 'heat', stacks: 5 }] })
  const target = enemy('enemy-0', { hp: 20, maxHp: 100, statuses: [{ id: 'vulnerable', stacks: 2 }] })
  const base = { combat: combat({ enemies: [target] }), source, target }
  const check = (cond: ConditionExpr, ctx = base) => evaluateCondition(cond, ctx)

  it('targetHasStatus', () => {
    expect(check({ kind: 'targetHasStatus', status: 'vulnerable' })).toBe(true)
    expect(check({ kind: 'targetHasStatus', status: 'weak' })).toBe(false)
    expect(check({ kind: 'targetHasStatus', status: 'vulnerable' }, { ...base, target: null })).toBe(false)
  })
  it('selfStatusAtLeast', () => {
    expect(check({ kind: 'selfStatusAtLeast', status: 'heat', value: 5 })).toBe(true)
    expect(check({ kind: 'selfStatusAtLeast', status: 'heat', value: 6 })).toBe(false)
  })
  it('targetWillDie (hp <= 0 zum Auswertungszeitpunkt)', () => {
    expect(check({ kind: 'targetWillDie' }, { ...base, target: { ...target, hp: 0 } })).toBe(true)
    expect(check({ kind: 'targetWillDie' }, { ...base, target: { ...target, hp: 1 } })).toBe(false)
  })
  it('hpBelowPercent (bezieht sich auf Ziel-HP)', () => {
    expect(check({ kind: 'hpBelowPercent', percent: 30 })).toBe(true) // 20 < 30 % von 100
    expect(check({ kind: 'hpBelowPercent', percent: 20 })).toBe(false) // 20 ist nicht < 20 %
    expect(check({ kind: 'hpBelowPercent', percent: 30 }, { ...base, target: null })).toBe(false)
  })
})
