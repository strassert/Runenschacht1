// Test-Bausteine: minimale, aber vollständige Zustands-Builder.
// (Kein *.test.ts → wird von Vitest nicht als Testdatei behandelt.)
import type { CardInstance } from '../../src/core/types/cards'
import type { PlayerCombatState, RunState } from '../../src/core/types/state'
import { initialRngStates, type RngStates } from '../../src/core/rng/streams'
import {
  MAX_ENERGY,
  POTION_SLOTS,
  SAVE_SCHEMA_VERSION,
  START_GOLD,
  START_HP,
} from '../../src/core/constants'

export function makeCard(uid: string, defId = 'strike', upgraded = false): CardInstance {
  return { uid, defId, upgraded }
}

/** Karten c_1..c_n (Array-Reihenfolge: Ende = Stapelspitze). */
export function makeCards(count: number, prefix = 'c_'): CardInstance[] {
  const cards: CardInstance[] = []
  for (let i = 1; i <= count; i++) {
    cards.push(makeCard(`${prefix}${i}`))
  }
  return cards
}

export function makePlayer(overrides: Partial<PlayerCombatState> = {}): PlayerCombatState {
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

export function makeRngStates(seed = 'TEST1'): RngStates {
  return initialRngStates(seed)
}

export function makeRunState(overrides: Partial<RunState> = {}): RunState {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    seed: 'TEST1',
    rngStates: makeRngStates('TEST1'),
    characterId: 'runenschmiedin',
    ascension: 0,
    layer: 1,
    floor: 1,
    hp: START_HP,
    maxHp: START_HP,
    gold: START_GOLD,
    deck: [],
    relics: [],
    potions: Array.from({ length: POTION_SLOTS }, () => null),
    map: { nodes: [], visitedNodeIds: [] },
    currentNodeId: null,
    screen: { kind: 'menu' },
    combat: null,
    rewardState: null,
    shopState: null,
    eventState: null,
    stats: {
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      cardsPlayed: 0,
      combatsWon: 0,
      floorsEntered: 0,
      goldEarned: 0,
    },
    pity: { rareCardOffset: 0, potionChance: 0 },
    nextUid: 1,
    ...overrides,
  }
}
