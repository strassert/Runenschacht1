// Invarianten-Checker (Masterplan 13.3): jede Verletzung wird gemeldet,
// ein sauberer Zustand liefert die leere Liste.
import { describe, expect, it } from 'vitest'
import { checkCombatInvariants, checkInvariants } from '../../src/core/invariants'
import type { CombatState, PlayerCombatState, RunState } from '../../src/core/types/state'
import { MAX_HAND } from '../../src/core/constants'
import { makeCard, makeCards, makePlayer, makeRunState } from './helpers'

function withCombat(state: RunState, player: PlayerCombatState): RunState {
  const combat: CombatState = {
    turn: 1,
    phase: 'playerTurn',
    player,
    enemies: [],
    cardsPlayedThisTurn: [],
    cardsPlayedThisCombat: 0,
    counters: {},
    roomType: 'combat',
  }
  return { ...state, combat }
}

/** Konsistenter Kampf: 10-Karten-Deck, auf Stapel verteilt. */
function consistentCombatPlayer(): PlayerCombatState {
  return makePlayer({
    drawPile: makeCards(5, 'd_'),
    hand: makeCards(3, 'h_'),
    discardPile: makeCards(2, 'a_'),
  })
}

describe('checkInvariants', () => {
  it('sauberer Run ohne Kampf → keine Verletzungen', () => {
    expect(checkInvariants(makeRunState({ deck: makeCards(10) }))).toEqual([])
  })

  it('sauberer Kampf → keine Verletzungen', () => {
    const state = withCombat(makeRunState({ deck: makeCards(10) }), consistentCombatPlayer())
    expect(checkInvariants(state)).toEqual([])
  })

  it('Run-HP über Maximum wird gefunden', () => {
    const state = makeRunState({ hp: 80, maxHp: 75 })
    expect(checkInvariants(state).map((v) => v.rule)).toContain('hp<=maxHp')
  })

  it('negativer HP wird gefunden', () => {
    expect(checkInvariants(makeRunState({ hp: -1 })).map((v) => v.rule)).toContain('hp>=0')
  })

  it('negatives Gold wird gefunden', () => {
    expect(checkInvariants(makeRunState({ gold: -5 })).map((v) => v.rule)).toContain('gold>=0')
  })

  it('Tiefenstufe außerhalb 0–10 wird gefunden', () => {
    expect(checkInvariants(makeRunState({ ascension: 11 })).map((v) => v.rule)).toContain(
      'ascension<=10',
    )
  })

  it('doppelte UID im Deck wird gefunden', () => {
    const deck = [...makeCards(3, 'c_'), makeCard('c_1')]
    expect(checkInvariants(makeRunState({ deck })).map((v) => v.rule)).toContain('deckUidsUnique')
  })

  it('Karte in zwei Stapeln gleichzeitig wird gefunden', () => {
    const player = consistentCombatPlayer()
    player.discardPile.push(player.hand[0]!) // dieselbe Instanz in zwei Stapeln
    const state = withCombat(makeRunState({ deck: makeCards(10) }), player)
    expect(checkInvariants(state).map((v) => v.rule)).toContain('noCardInTwoPiles')
  })

  it('Stapelsumme ≠ Deck + generiert − entfernt wird gefunden', () => {
    const player = consistentCombatPlayer() // 10 Karten, aber Deck hat 12
    const state = withCombat(makeRunState({ deck: makeCards(12) }), player)
    expect(checkInvariants(state).map((v) => v.rule)).toContain('pileSum')
  })

  it('generierte Karten erhöhen die erlaubte Stapelsumme', () => {
    const player = consistentCombatPlayer()
    player.drawPile.push(makeCard('g_1', 'token'))
    player.cardsGeneratedThisCombat = 1
    const state = withCombat(makeRunState({ deck: makeCards(10) }), player)
    expect(checkInvariants(state)).toEqual([])
  })

  it('Hand über MAX_HAND wird gefunden', () => {
    const player = consistentCombatPlayer()
    player.hand = makeCards(MAX_HAND + 1, 'h_')
    const state = withCombat(makeRunState({ deck: makeCards(10) }), player)
    expect(checkInvariants(state).map((v) => v.rule)).toContain('hand<=maxHand')
  })

  it('negative Glut / Block / Stapel werden gefunden', () => {
    const player = consistentCombatPlayer()
    player.energy = -1
    player.block = -3
    player.statuses = [{ id: 'strength', stacks: -2 }]
    const rules = checkCombatInvariants(player, 10).map((v) => v.rule)
    expect(rules).toContain('energy>=0')
    expect(rules).toContain('block>=0')
    expect(rules).toContain('stacks>=0')
  })

  it('Glut über Maximum wird gefunden', () => {
    const player = consistentCombatPlayer()
    player.energy = player.maxEnergy + 1
    expect(checkCombatInvariants(player, 10).map((v) => v.rule)).toContain('energy<=maxEnergy')
  })

  it('negative Karten-Zähler werden gefunden', () => {
    const player = consistentCombatPlayer()
    player.cardsRemovedThisCombat = -1
    expect(checkCombatInvariants(player, 10).map((v) => v.rule)).toContain('counters>=0')
  })

  it('Entfernte Karten verringern die erwartete Stapelsumme', () => {
    const player = consistentCombatPlayer() // 10 Karten in den Stapeln
    player.exhaustPile.push(makeCard('x_1')) // jetzt 11 Karten im Stapel
    player.cardsRemovedThisCombat = 1 // erwartet: 10 + 0 − 1 = 9 → Verletzung
    expect(checkCombatInvariants(player, 10).map((v) => v.rule)).toContain('pileSum')
  })
})
