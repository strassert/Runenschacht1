// M2.4: Kampfaufbau (setupCombat), Rundenablauf (start/endPlayerTurn,
// runEnemyTurn), Gegner-KI (weighted maxRepeat, cycle) und ehrliche Intents.
import { describe, expect, it } from 'vitest'
import { registerAllContent } from '../../src/content'
import { getEnemy, registerCard, registerEnemy } from '../../src/core/registry'
import { setupCombat } from '../../src/core/combat/combatSetup'
import { startPlayerTurn, endPlayerTurn, runEnemyTurn } from '../../src/core/combat/turn'
import { chooseEnemyMove, previewIntent } from '../../src/core/combat/enemyAi'
import { DRAW_PER_TURN, MAX_ENERGY, START_HP } from '../../src/core/constants'
import { makeRngStates } from './helpers'
import type { CardInstance } from '../../src/core/types/cards'
import type { EnemyDef, EnemyMove } from '../../src/core/types/enemies'
import type { GameEvent } from '../../src/core/types/events'
import type { CombatState, EnemyState, PlayerCombatState } from '../../src/core/types/state'

registerAllContent()

// Test-Karten (nur für retain/ethereal/innate nötig, keine Werte).
registerCard({
  id: 't_innate',
  nameKey: 'card.t_innate.name',
  type: 'attack',
  rarity: 'common',
  cost: 1,
  target: 'enemy',
  keywords: ['innate'],
  effects: [{ type: 'damage', amount: 1 }],
  upgrade: {},
  descriptionKey: 'card.t_innate.desc',
  characterId: 'neutral',
})
registerCard({
  id: 't_retain',
  nameKey: 'card.t_retain.name',
  type: 'skill',
  rarity: 'common',
  cost: 0,
  target: 'none',
  keywords: ['retain'],
  effects: [],
  upgrade: {},
  descriptionKey: 'card.t_retain.desc',
  characterId: 'neutral',
})
registerCard({
  id: 't_ethereal',
  nameKey: 'card.t_ethereal.name',
  type: 'skill',
  rarity: 'common',
  cost: 0,
  target: 'none',
  keywords: ['ethereal'],
  effects: [],
  upgrade: {},
  descriptionKey: 'card.t_ethereal.desc',
  characterId: 'neutral',
})
// Gegner mit onSpawn (setzt dem Spieler Geschwächt).
registerEnemy({
  id: 't_spawner',
  nameKey: 'enemy.t_spawner.name',
  hp: [10, 10],
  moves: { hit: { id: 'hit', intent: 'attack', effects: [{ type: 'damage', amount: 5 }] } },
  ai: { kind: 'weighted', weights: { hit: 1 }, maxRepeat: 0 },
  onSpawn: [{ type: 'applyStatus', status: 'weak', stacks: 1, target: 'enemy' }],
  sizeClass: 'small',
})

const cycleDef: EnemyDef = {
  id: 't_cycle',
  nameKey: 'enemy.t_cycle.name',
  hp: [10, 10],
  moves: {
    a: { id: 'a', intent: 'attack', effects: [{ type: 'damage', amount: 1 }] },
    b: { id: 'b', intent: 'attack', effects: [{ type: 'damage', amount: 2 }] },
    c: { id: 'c', intent: 'attack', effects: [{ type: 'damage', amount: 3 }] },
  },
  ai: { kind: 'cycle', sequence: ['a', 'b', 'c'], startRandom: true },
  sizeClass: 'small',
}

const biteMove: EnemyMove = { id: 'bite', intent: 'attack', effects: [{ type: 'damage', amount: 6 }] }

function card(uid: string, defId: string): CardInstance {
  return { uid, defId, upgraded: false }
}

function deck(count = 10): CardInstance[] {
  return Array.from({ length: count }, (_, i) =>
    card(`c_${i + 1}`, i % 2 === 0 ? 'rs_schlag' : 'rs_parade'),
  )
}

function enemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: 'enemy-0',
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
    hp: START_HP,
    maxHp: START_HP,
    block: 0,
    statuses: [],
    energy: MAX_ENERGY,
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
    enemies: [enemy()],
    cardsPlayedThisTurn: [],
    cardsPlayedThisCombat: 0,
    counters: {},
    roomType: 'combat',
    ...overrides,
  }
}

function damageEvents(events: GameEvent[]): number[] {
  return events
    .filter((e): e is Extract<GameEvent, { type: 'damageDealt' }> => e.type === 'damageDealt')
    .map((e) => e.amount)
}

describe('setupCombat', () => {
  it('baut den Kampf deterministisch auf (gleicher Seed → gleicher Zustand)', () => {
    const a = setupCombat({ deck: deck(), enemyIds: ['grubenratte', 'grubenratte'], rngStates: makeRngStates('SEED-A') })
    const b = setupCombat({ deck: deck(), enemyIds: ['grubenratte', 'grubenratte'], rngStates: makeRngStates('SEED-A') })
    expect(a.combat).toEqual(b.combat)
    expect(a.events).toEqual(b.events)
  })

  it('würfelt Gegner-HP im Bereich und legt Intents für Runde 1', () => {
    const r = setupCombat({ deck: deck(), enemyIds: ['grubenratte'], rngStates: makeRngStates('S1') })
    const e = r.combat.enemies[0]
    expect(e?.hp).toBeGreaterThanOrEqual(12)
    expect(e?.hp).toBeLessThanOrEqual(15)
    expect(e?.maxHp).toBe(e?.hp)
    expect(e?.intent).not.toBeNull()
    expect(r.events.some((ev) => ev.type === 'combatStarted')).toBe(true)
    expect(r.events.some((ev) => ev.type === 'enemyIntent')).toBe(true)
  })

  it('startet die erste Spielerrunde: 5 Karten, volle Glut, innate zuerst gezogen', () => {
    const r = setupCombat({
      deck: [...deck(9), card('c_inn', 't_innate')],
      enemyIds: ['grubenratte'],
      rngStates: makeRngStates('S2'),
    })
    expect(r.combat.turn).toBe(1)
    expect(r.combat.phase).toBe('playerTurn')
    expect(r.combat.player.hand).toHaveLength(DRAW_PER_TURN)
    expect(r.combat.player.energy).toBe(MAX_ENERGY)
    expect(r.combat.player.hand[0]?.defId).toBe('t_innate')
  })

  it('übernimmt Spieler-Startwerte aus dem Run', () => {
    const r = setupCombat({
      deck: deck(),
      enemyIds: ['grubenratte'],
      rngStates: makeRngStates('S3'),
      player: { hp: 40, maxHp: 80 },
    })
    expect(r.combat.player.hp).toBe(40)
    expect(r.combat.player.maxHp).toBe(80)
  })

  it('führt onSpawn-Effekte der Gegner aus', () => {
    const r = setupCombat({ deck: deck(), enemyIds: ['t_spawner'], rngStates: makeRngStates('S4') })
    expect(r.combat.player.statuses.find((s) => s.id === 'weak')?.stacks).toBe(1)
  })
})

describe('startPlayerTurn', () => {
  it('erhöht turn, setzt Glut, lässt Block verfallen und zieht 5 Karten', () => {
    const c = combat({ turn: 2, player: player({ block: 8, energy: 0, drawPile: deck(10) }) })
    const r = startPlayerTurn(c, makeRngStates('T1'))
    expect(r.combat.turn).toBe(3)
    expect(r.combat.player.block).toBe(0)
    expect(r.combat.player.energy).toBe(MAX_ENERGY)
    expect(r.combat.player.hand).toHaveLength(5)
    expect(r.events.some((ev) => ev.type === 'turnStarted')).toBe(true)
  })

  it('mischt die Ablage, wenn der Nachziehstapel leer ist', () => {
    const c = combat({ player: player({ drawPile: [], discardPile: deck(8) }) })
    const r = startPlayerTurn(c, makeRngStates('T2'))
    expect(r.combat.player.hand).toHaveLength(5)
    expect(r.events.some((ev) => ev.type === 'drawPileRefilled')).toBe(true)
  })

  it('Brand schädigt zu Rundenbeginn und ignoriert Block', () => {
    const c = combat({ player: player({ hp: 30, block: 10, statuses: [{ id: 'burn', stacks: 3 }] }) })
    const r = startPlayerTurn(c, makeRngStates('T3'))
    expect(r.combat.player.hp).toBe(27)
    expect(r.combat.player.statuses.find((s) => s.id === 'burn')?.stacks).toBe(2)
  })

  it('Brand-Tod des Spielers führt zu defeat', () => {
    const c = combat({ player: player({ hp: 2, statuses: [{ id: 'burn', stacks: 5 }] }) })
    const r = startPlayerTurn(c, makeRngStates('T4'))
    expect(r.combat.phase).toBe('defeat')
  })
})

describe('endPlayerTurn', () => {
  it('legt Handkarten ab: retain bleibt, ethereal erschöpft, Rest in die Ablage', () => {
    const c = combat({
      player: player({
        hand: [card('c_a', 'rs_schlag'), card('c_b', 't_retain'), card('c_c', 't_ethereal')],
      }),
    })
    const r = endPlayerTurn(c, makeRngStates('E1'))
    expect(r.combat.player.hand.map((x) => x.uid)).toEqual(['c_b'])
    expect(r.combat.player.discardPile.map((x) => x.uid)).toEqual(['c_a'])
    expect(r.combat.player.exhaustPile.map((x) => x.uid)).toEqual(['c_c'])
    expect(r.combat.phase).toBe('enemyTurn')
  })

  it('halbiert Hitze, baut Debuffs ab und Ritual gibt Kraft', () => {
    const c = combat({
      player: player({
        statuses: [
          { id: 'heat', stacks: 7 },
          { id: 'vulnerable', stacks: 2 },
          { id: 'ritual', stacks: 1 },
        ],
      }),
    })
    const r = endPlayerTurn(c, makeRngStates('E2'))
    expect(r.combat.player.statuses.find((s) => s.id === 'heat')?.stacks).toBe(3)
    expect(r.combat.player.statuses.find((s) => s.id === 'vulnerable')?.stacks).toBe(1)
    expect(r.combat.player.statuses.find((s) => s.id === 'strength')?.stacks).toBe(1)
  })
})

describe('runEnemyTurn', () => {
  it('führt den angekündigten Move aus (Block-Verfall zuerst, Kraft ehrlich)', () => {
    const e = enemy({
      block: 5,
      statuses: [{ id: 'strength', stacks: 2 }],
      intent: { moveId: 'bite', intent: 'attack', damagePreview: [8] },
    })
    const c = combat({ phase: 'enemyTurn', enemies: [e], player: player({ hp: 50 }) })
    const r = runEnemyTurn(c, makeRngStates('R1'))
    expect(damageEvents(r.events)).toEqual([8])
    expect(r.combat.player.hp).toBe(42)
    expect(r.combat.enemies[0]?.moveHistory).toEqual(['bite'])
    expect(r.combat.enemies[0]?.intent).not.toBeNull()
    expect(r.combat.phase).toBe('playerTurn')
  })

  it('Brand tötet Gegner zu Rundenbeginn → victory', () => {
    const c = combat({ phase: 'enemyTurn', enemies: [enemy({ hp: 2, statuses: [{ id: 'burn', stacks: 3 }] })] })
    const r = runEnemyTurn(c, makeRngStates('R2'))
    expect(r.combat.phase).toBe('victory')
    expect(r.events.some((ev) => ev.type === 'enemyDied')).toBe(true)
  })

  it('baut Debuffs der Gegner am Ende der Gegnerrunde ab', () => {
    const c = combat({ phase: 'enemyTurn', enemies: [enemy({ statuses: [{ id: 'vulnerable', stacks: 2 }] })] })
    const r = runEnemyTurn(c, makeRngStates('R3'))
    expect(r.combat.enemies[0]?.statuses.find((s) => s.id === 'vulnerable')?.stacks).toBe(1)
  })

  it('tote Gegner handeln nicht und erhalten keine Intents', () => {
    const c = combat({
      phase: 'enemyTurn',
      enemies: [enemy({ alive: false, hp: 0 }), enemy({ intent: { moveId: 'bite', intent: 'attack' } })],
    })
    const r = runEnemyTurn(c, makeRngStates('R4'))
    expect(r.combat.enemies[0]?.intent).toBeNull()
    expect(r.combat.player.hp).toBe(START_HP - 6)
  })

  it('Intent-Vorschau entspricht dem tatsächlich ausgeführten Schaden', () => {
    const e = enemy({ statuses: [{ id: 'strength', stacks: 2 }] })
    const intent = previewIntent(biteMove, e, player())
    const c = combat({ phase: 'enemyTurn', enemies: [{ ...e, intent }], player: player({ hp: 50 }) })
    const r = runEnemyTurn(c, makeRngStates('R5'))
    expect(damageEvents(r.events)).toEqual(intent.damagePreview ?? [])
  })
})

describe('Gegner-KI weighted', () => {
  it('würfelt gemäß Gewichten (beide Moves erscheinen)', () => {
    const def = getEnemy('grubenratte')
    const seen = new Set<string>()
    for (let seed = 0; seed < 30; seed++) {
      seen.add(chooseEnemyMove(def, enemy(), makeRngStates(`W-${seed}`)).moveId)
    }
    expect(seen.has('bite')).toBe(true)
    expect(seen.has('scratch')).toBe(true)
  })

  it('maxRepeat sperrt bite direkt nach bite, bite', () => {
    const def = getEnemy('grubenratte')
    const e = enemy({ moveHistory: ['bite', 'bite'] })
    for (let seed = 0; seed < 8; seed++) {
      expect(chooseEnemyMove(def, e, makeRngStates(`AI-${seed}`)).moveId).toBe('scratch')
    }
  })
})

describe('Gegner-KI cycle', () => {
  it('folgt der festen Reihenfolge und merkt sich den zufälligen Start', () => {
    let e = enemy({ defId: 't_cycle' })
    let states = makeRngStates('CYCLE')
    const ids: string[] = []
    for (let i = 0; i < 4; i++) {
      const choice = chooseEnemyMove(cycleDef, e, states)
      ids.push(choice.moveId)
      e = { ...e, moveHistory: [...e.moveHistory, choice.moveId], aiMemory: choice.aiMemory }
      states = choice.rngStates
    }
    const seq = ['a', 'b', 'c']
    const start = e.aiMemory['cycleStart'] ?? 0
    expect(start).toBeGreaterThanOrEqual(0)
    expect(start).toBeLessThan(3)
    expect(ids).toEqual([0, 1, 2, 3].map((i) => seq[(start + i) % 3]))
  })

  it('ohne startRandom beginnt die Sequenz bei 0', () => {
    const def: EnemyDef = { ...cycleDef, ai: { kind: 'cycle', sequence: ['a', 'b', 'c'] } }
    let e = enemy({ defId: 't_cycle' })
    let states = makeRngStates('CYCLE2')
    const ids: string[] = []
    for (let i = 0; i < 4; i++) {
      const choice = chooseEnemyMove(def, e, states)
      ids.push(choice.moveId)
      e = { ...e, moveHistory: [...e.moveHistory, choice.moveId] }
      states = choice.rngStates
    }
    expect(ids).toEqual(['a', 'b', 'c', 'a'])
  })
})

describe('ehrliche Intents (previewIntent)', () => {
  it('rechnet Kraft des Gegners ein', () => {
    const e = enemy({ statuses: [{ id: 'strength', stacks: 3 }] })
    expect(previewIntent(biteMove, e, player()).damagePreview).toEqual([9])
  })

  it('rechnet Verwundbar des Spielers ein', () => {
    const p = player({ statuses: [{ id: 'vulnerable', stacks: 1 }] })
    expect(previewIntent(biteMove, enemy(), p).damagePreview).toEqual([9])
  })

  it('rechnet Geschwächt des Gegners ein', () => {
    const e = enemy({ statuses: [{ id: 'weak', stacks: 1 }] })
    expect(previewIntent(biteMove, e, player()).damagePreview).toEqual([4])
  })

  it('raw-Effekte ignorieren Kraft (Vorschau bleibt base)', () => {
    const raw: EnemyMove = {
      id: 'raw',
      intent: 'attack',
      effects: [{ type: 'damage', amount: 6, tags: ['raw'] }],
    }
    const e = enemy({ statuses: [{ id: 'strength', stacks: 3 }] })
    expect(previewIntent(raw, e, player()).damagePreview).toEqual([6])
  })

  it('mehrere Treffer erscheinen einzeln in der Vorschau', () => {
    const multi: EnemyMove = {
      id: 'multi',
      intent: 'attack',
      effects: [{ type: 'damage', amount: 5, hits: 2 }],
    }
    expect(previewIntent(multi, enemy(), player()).damagePreview).toEqual([5, 5])
  })

  it('dynamische ValueExpr lässt die Vorschau offen (DECISIONS.md)', () => {
    const dyn: EnemyMove = {
      id: 'dyn',
      intent: 'attack',
      effects: [{ type: 'damage', amount: { kind: 'perStatus', status: 'strength', of: 'self', base: 2, per: 1 } }],
    }
    expect(previewIntent(dyn, enemy(), player()).damagePreview).toBeUndefined()
  })
})
