// Stapel-Logik (Masterplan 7.2): ziehen (mit Nachmischen aus der Ablage),
// ablegen, erschöpfen, innate-Karten an die Stapelspitze.
// Stapel-Reihenfolge: Array-Ende = Stapelspitze (ziehen von hinten).
// Alle Funktionen sind pure: sie geben neue Objekte + Events zurück.
import type { CardInstance, CardUid } from '../types/cards'
import type { GameEvent } from '../types/events'
import type { PlayerCombatState } from '../types/state'
import { MAX_HAND } from '../constants'
import { withStream, type RngStates } from '../rng/streams'
import { shuffle } from './shuffle'

export interface DrawResult {
  player: PlayerCombatState
  rngStates: RngStates
  events: GameEvent[]
}

export interface MoveResult {
  player: PlayerCombatState
  events: GameEvent[]
}

function copyPiles(player: PlayerCombatState): PlayerCombatState {
  return {
    ...player,
    drawPile: [...player.drawPile],
    hand: [...player.hand],
    discardPile: [...player.discardPile],
    exhaustPile: [...player.exhaustPile],
    statuses: [...player.statuses],
    powers: [...player.powers],
  }
}

/**
 * Zieht `count` Karten. Ist der Nachziehstapel leer, wird der Ablagestapel
 * gemischt (Stream 'shuffle') und zum Nachziehstapel. Überzählige Karten
 * (Hand > MAX_HAND) landen in der Ablage.
 */
export function drawCards(
  player: PlayerCombatState,
  rngStates: RngStates,
  count: number,
): DrawResult {
  if (count < 0) {
    throw new Error(`drawCards: negative Anzahl ${count}`)
  }
  const p = copyPiles(player)
  const events: GameEvent[] = []
  let states = rngStates

  for (let i = 0; i < count; i++) {
    if (p.drawPile.length === 0) {
      if (p.discardPile.length === 0) {
        break // nichts mehr zu ziehen
      }
      const { value: mixed, states: nextStates } = withStream(states, 'shuffle', (rng) =>
        shuffle(p.discardPile, rng),
      )
      states = nextStates
      p.drawPile = mixed
      p.discardPile = []
      events.push({ type: 'drawPileRefilled', fromDiscard: true })
    }
    const card = p.drawPile.pop()
    if (card === undefined) {
      break
    }
    if (p.hand.length < MAX_HAND) {
      p.hand.push(card)
      events.push({ type: 'cardDrawn', cardUid: card.uid, cardId: card.defId })
    } else {
      p.discardPile.push(card)
      events.push({ type: 'cardDrawn', cardUid: card.uid, cardId: card.defId })
      events.push({ type: 'cardDiscarded', cardUid: card.uid, cardId: card.defId })
    }
  }

  return { player: p, rngStates: states, events }
}

/** Karte aus der Hand in die Ablage. */
export function discardCard(player: PlayerCombatState, uid: CardUid): MoveResult {
  return moveCard(player, uid, 'discardPile', 'cardDiscarded')
}

/** Karte aus der Hand erschöpfen (aus dem Kampfzyklus entfernt). */
export function exhaustCard(player: PlayerCombatState, uid: CardUid): MoveResult {
  return moveCard(player, uid, 'exhaustPile', 'cardExhausted')
}

function moveCard(
  player: PlayerCombatState,
  uid: CardUid,
  to: 'discardPile' | 'exhaustPile',
  eventType: 'cardDiscarded' | 'cardExhausted',
): MoveResult {
  const p = copyPiles(player)
  const index = p.hand.findIndex((c) => c.uid === uid)
  if (index === -1) {
    throw new Error(`Karte ${uid} nicht in der Hand gefunden`)
  }
  const card = p.hand.splice(index, 1)[0] as CardInstance
  p[to].push(card)
  return {
    player: p,
    events: [{ type: eventType, cardUid: card.uid, cardId: card.defId }],
  }
}

/**
 * Kampfvorbereitung: innate-Karten an die Spitze des Nachziehstapels
 * (Masterplan 7.2 – sie starten garantiert in der Anfangshand).
 * Die Intrinsik liegt auf der Karten-Definition (Keyword 'innate'); da die
 * Karten-Registry erst in M2 kommt, wird sie hier als Prädikat übergeben.
 */
export function prepareDrawPile(
  player: PlayerCombatState,
  isInnate: (card: CardInstance) => boolean,
): PlayerCombatState {
  const innate: CardInstance[] = []
  const rest: CardInstance[] = []
  for (const card of player.drawPile) {
    if (isInnate(card)) {
      innate.push(card)
    } else {
      rest.push(card)
    }
  }
  return { ...player, drawPile: [...rest, ...innate] }
}
