// playCard (Masterplan 7.2 'Spielerrunde' + 5.2): Karte aus der Hand prüfen
// (nur in der Spielerrunde, nur aus der Hand), Glut abziehen, Effekte über
// die Action-Queue ausführen, Karte danach immer ablegen (exhaust →
// Erschöpfung, sonst Ablage) – auch wenn der Kampf endete. Kampfabschluss
// (combatEnded) übernimmt combatReducer/victory.ts.
import type { CardInstance, CardUid } from '../types/cards'
import type { CombatState, EntityId } from '../types/state'
import type { GameEvent } from '../types/events'
import type { RngStates } from '../rng/streams'
import { getCard } from '../registry'
import { discardCard, exhaustCard } from '../deck/piles'
import { runActionQueue, type Action } from './actionQueue'

export interface PlayCardResult {
  combat: CombatState
  rngStates: RngStates
  events: GameEvent[]
}

/** Kosten einer Karte (costOverride schlägt Def-Kosten; 'X' = ganze Glut). */
export function cardCost(card: CardInstance, energy: number): number {
  const cost = card.costOverride?.value ?? getCard(card.defId).cost
  return cost === 'X' ? energy : cost
}

export function playCard(
  combat: CombatState,
  rngStates: RngStates,
  cardUid: CardUid,
  targetId: EntityId | null = null,
): PlayCardResult {
  if (combat.phase !== 'playerTurn') {
    throw new Error(`playCard: Phase '${combat.phase}' ist keine Spielerrunde`)
  }
  const card = combat.player.hand.find((c) => c.uid === cardUid)
  if (card === undefined) throw new Error(`playCard: Karte '${cardUid}' ist nicht auf der Hand`)
  const def = getCard(card.defId)
  if (def.keywords.includes('unplayable')) {
    throw new Error(`playCard: '${def.id}' ist nicht spielbar (unplayable)`)
  }

  const energy = combat.player.energy
  const cost = cardCost(card, energy)
  if (cost > energy) {
    throw new Error(`playCard: '${def.id}' kostet ${cost}, es bleiben nur ${energy} Glut`)
  }

  const events: GameEvent[] = [
    { type: 'cardPlayed', cardUid: card.uid, cardId: def.id, targetId, energySpent: cost },
    { type: 'energyChanged', entityId: combat.player.id, delta: -cost, total: energy - cost },
  ]
  let c: CombatState = {
    ...combat,
    player: { ...combat.player, energy: energy - cost },
    cardsPlayedThisTurn: [...combat.cardsPlayedThisTurn, card],
    cardsPlayedThisCombat: combat.cardsPlayedThisCombat + 1,
  }

  // Effekte ausführen (Ziel-Auflösung übernimmt targeting.ts).
  const actions: Action[] = def.effects.map((effect) => ({
    effect,
    sourceId: combat.player.id,
    targetId,
  }))
  const queue = runActionQueue(actions, c, rngStates)
  c = queue.combat
  events.push(...queue.events)

  // Ablage: erschöpfen oder ablegen – auch nach Kampfende (Karte ist gespielt).
  let player = c.player
  const moved = def.keywords.includes('exhaust')
    ? exhaustCard(player, card.uid)
    : discardCard(player, card.uid)
  player = moved.player
  events.push(...moved.events)

  return { combat: { ...c, player }, rngStates: queue.rngStates, events }
}
