// M3.1b (Masterplan 8.5): pendingChoice/ChooseCards – Effekte mit
// choice:'player' pausieren die Action-Queue; der Command 'ChooseCards'
// validiert die Auswahl und setzt den Queue-Rest fort. Auto-Wahl, wenn es
// höchstens so viele Kandidaten wie count gibt. Dazu die Run-Rückkopplung:
// gainGold/gainMaxHp (counters/maxHp im Kampf) wirken auf den RunState.
import { describe, expect, it } from 'vitest'
import { registerAllContent } from '../../src/content'
import { registerCard } from '../../src/core/registry'
import { combatReducer } from '../../src/core/combat/combatReducer'
import { finishCombat } from '../../src/core/combat/victory'
import {
  applyPlayerChoice,
  runActionQueue,
  type Action,
} from '../../src/core/combat/actionQueue'
import { makeCard, makeCards, makePlayer, makeRngStates, makeRunState } from './helpers'
import type { CombatState, EnemyState } from '../../src/core/types/state'
import { MAX_ENERGY } from '../../src/core/constants'

registerAllContent()

// Test-Karten (nur hier registriert): 1 Schaden, dann 1 Karte ablegen
// (Spieler-Auswahl), dann 2 Glut – der Glut-Effekt ist der Queue-Rest.
registerCard({
  id: 't_wahl_discard',
  nameKey: 'card.t_wahl_discard.name',
  type: 'skill',
  rarity: 'common',
  cost: 1,
  target: 'enemy',
  keywords: [],
  effects: [
    { type: 'damage', amount: 5 },
    { type: 'discard', count: 1, choice: 'player' },
    { type: 'gainEnergy', amount: 2 },
  ],
  upgrade: {},
  descriptionKey: 'card.t_wahl_discard.desc',
  characterId: 'neutral',
})

function enemy(id = 'enemy-0', hp = 30): EnemyState {
  return {
    id,
    hp,
    maxHp: 30,
    block: 0,
    statuses: [],
    defId: 'grubenratte',
    intent: null,
    moveHistory: [],
    aiMemory: {},
    alive: true,
  }
}

function fixture(overrides: Partial<CombatState> = {}): CombatState {
  return {
    turn: 1,
    phase: 'playerTurn',
    player: makePlayer({ hand: makeCards(3) }),
    enemies: [enemy()],
    cardsPlayedThisTurn: [],
    cardsPlayedThisCombat: 0,
    counters: {},
    roomType: 'combat',
    ...overrides,
  }
}

function discardAction(count: number, sourceCardUid?: string): Action {
  return {
    effect: { type: 'discard', count, choice: 'player' },
    sourceId: 'player',
    targetId: null,
    ...(sourceCardUid !== undefined ? { sourceCardUid } : {}),
  }
}

describe('Action-Queue: choice:\'player\' pausiert als pendingChoice (8.5)', () => {
  it('Pause setzt pendingChoice mit Kandidaten (ohne gespielte Karte) und Queue-Rest', () => {
    const res = runActionQueue(
      [
        { effect: { type: 'damage', amount: 5 }, sourceId: 'player', targetId: 'enemy-0' },
        discardAction(1, 'c_play'),
        { effect: { type: 'gainEnergy', amount: 2 }, sourceId: 'player', targetId: null },
      ],
      fixture(),
      makeRngStates(),
    )
    const pending = res.combat.pendingChoice
    expect(pending).not.toBeUndefined()
    expect(pending?.kind).toBe('discard')
    expect(pending?.count).toBe(1)
    expect(pending?.candidates).toEqual(['c_1', 'c_2', 'c_3'])
    expect(pending?.sourceCardUid).toBe('c_play')
    expect(pending?.remainingActions).toHaveLength(1) // gainEnergy läuft nach der Wahl
    expect(res.combat.enemies[0].hp).toBe(25) // Schaden vor der Pause ausgeführt
    expect(res.combat.player.energy).toBe(MAX_ENERGY) // gainEnergy noch nicht
  })

  it('Kandidaten ≤ count → automatische Auswahl ohne Pause', () => {
    const c = fixture({ player: makePlayer({ hand: makeCards(2) }) })
    const res = runActionQueue([discardAction(3)], c, makeRngStates())
    expect(res.combat.pendingChoice).toBeUndefined()
    expect(res.combat.player.hand).toHaveLength(0)
    expect(res.combat.player.discardPile).toHaveLength(2)
  })

  it('count 0 oder leere Hand → Effekt verpufft, Queue läuft weiter', () => {
    const empty = runActionQueue([discardAction(1)], fixture({ player: makePlayer() }), makeRngStates())
    expect(empty.combat.pendingChoice).toBeUndefined()
    expect(empty.actionsProcessed).toBe(1)

    const zero = runActionQueue([discardAction(0)], fixture(), makeRngStates())
    expect(zero.combat.pendingChoice).toBeUndefined()
    expect(zero.combat.player.hand).toHaveLength(3)
  })

  it('Ketten-Pause: Queue-Rest darf erneut pausieren', () => {
    const first = runActionQueue(
      [discardAction(1), { effect: { type: 'exhaustFromHand', count: 1, choice: 'player' }, sourceId: 'player', targetId: null }],
      fixture(),
      makeRngStates(),
    )
    expect(first.combat.pendingChoice?.remainingActions).toHaveLength(1)
    const applied = applyPlayerChoice('discard', first.combat, ['c_1'])
    const second = runActionQueue(
      first.combat.pendingChoice?.remainingActions ?? [],
      applied.combat,
      first.rngStates,
    )
    expect(second.combat.pendingChoice?.kind).toBe('exhaustFromHand')
    expect(second.combat.pendingChoice?.candidates).toEqual(['c_2', 'c_3'])
  })
})

describe('applyPlayerChoice (8.5)', () => {
  it('upgradeInHand verbessert nur die gewählten Karten', () => {
    const res = applyPlayerChoice('upgradeInHand', fixture(), ['c_1', 'c_3'])
    expect(res.combat.player.hand.map((k) => k.upgraded)).toEqual([true, false, true])
    expect(res.events).toEqual([])
  })
})

describe('combatReducer: Gate und ChooseCards (8.5)', () => {
  const paused: CombatState = {
    ...fixture(),
    pendingChoice: {
      kind: 'discard',
      count: 2,
      candidates: ['c_1', 'c_2', 'c_3'],
      sourceCardUid: 'c_play',
      remainingActions: [],
    },
  }

  it('solange pendingChoice offen ist, sind nur ChooseCards erlaubt', () => {
    const run = makeRunState({ combat: paused })
    expect(() => combatReducer(run, { type: 'endTurn' })).toThrow(/pendingChoice/)
    expect(() =>
      combatReducer(run, { type: 'playCard', cardUid: 'c_1', targetId: 'enemy-0' }),
    ).toThrow(/pendingChoice/)
  })

  it('ChooseCards validiert Anzahl, Wiederholungen und Kandidaten', () => {
    const run = makeRunState({ combat: paused })
    expect(() => combatReducer(run, { type: 'ChooseCards', uids: ['c_1'] })).toThrow(/erwartet/)
    expect(() => combatReducer(run, { type: 'ChooseCards', uids: ['c_1', 'c_1'] })).toThrow(
      /Wiederholungen/,
    )
    expect(() => combatReducer(run, { type: 'ChooseCards', uids: ['c_1', 'c_9'] })).toThrow(
      /Kandidaten/,
    )
  })

  it('ChooseCards ohne offene pendingChoice ist ein Fehler', () => {
    const run = makeRunState({ combat: fixture() })
    expect(() => combatReducer(run, { type: 'ChooseCards', uids: ['c_1'] })).toThrow(
      /braucht eine offene pendingChoice/,
    )
  })

  it('Voller Ablauf: playCard pausiert, ChooseCards legt ab und setzt Queue fort', () => {
    const c0 = fixture({
      player: makePlayer({ hand: [makeCard('c_play', 't_wahl_discard'), ...makeCards(3)] }),
    })
    const r1 = combatReducer(makeRunState({ combat: c0 }), {
      type: 'playCard',
      cardUid: 'c_play',
      targetId: 'enemy-0',
    })
    const c1 = r1.state.combat
    if (c1 === null) throw new Error('erwarteter aktiver Kampf')
    expect(c1.pendingChoice?.candidates).toEqual(['c_1', 'c_2', 'c_3']) // c_play ausgeschlossen
    expect(c1.pendingChoice?.remainingActions).toHaveLength(1)
    expect(c1.enemies[0].hp).toBe(25)
    expect(c1.player.discardPile.map((k) => k.uid)).toEqual(['c_play']) // gespielte Karte abgelegt
    expect(c1.player.energy).toBe(MAX_ENERGY - 1)

    const r2 = combatReducer(r1.state, { type: 'ChooseCards', uids: ['c_2'] })
    const c2 = r2.state.combat
    if (c2 === null) throw new Error('erwarteter aktiver Kampf')
    expect(c2.pendingChoice).toBeNull()
    expect(c2.player.hand.map((k) => k.uid)).toEqual(['c_1', 'c_3'])
    expect(c2.player.discardPile.map((k) => k.uid)).toEqual(['c_play', 'c_2'])
    expect(c2.player.energy).toBe(MAX_ENERGY + 1) // gainEnergy aus dem Queue-Rest
    expect(r2.events.some((e) => e.type === 'cardDiscarded')).toBe(true)
  })
})

describe('Run-Rückkopplung in finishCombat (M3.1b)', () => {
  it('counters.goldGained und Kampf-maxHp wirken auf den RunState', () => {
    const c: CombatState = {
      ...fixture({
        enemies: [{ ...enemy(), hp: 0, alive: false }],
        player: makePlayer({ hp: 42, maxHp: 80 }),
        counters: { goldGained: 17 },
      }),
      phase: 'victory',
      cardsPlayedThisCombat: 5,
    }
    const run = makeRunState({ gold: 99 })
    const finished = finishCombat(run, c)
    expect(finished.run.gold).toBe(116)
    expect(finished.run.stats.goldEarned).toBe(17)
    expect(finished.run.maxHp).toBe(80) // gainMaxHp im Kampf wirkt auf den Run
    expect(finished.run.hp).toBe(42)
    expect(finished.run.stats.kills).toBe(1)
    expect(finished.run.stats.combatsWon).toBe(1)
    expect(finished.run.stats.cardsPlayed).toBe(5)
    expect(finished.events).toEqual([{ type: 'combatEnded', victory: true }])
  })

  it('finishCombat vor Kampfende ist ein Fehler', () => {
    expect(() => finishCombat(makeRunState(), fixture())).toThrow(/nicht beendet/)
  })
})
