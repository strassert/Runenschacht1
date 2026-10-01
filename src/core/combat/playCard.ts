// PlayCard-Command (Masterplan 5.2 + 7.2 Schritt 6): Glut prüfen, Ziel
// prüfen, Effekte über die Action-Queue ausführen, Karte danach in die
// Ablage (exhaust → Erschöpfungsstapel). Zählt cardsPlayedThisTurn/-Combat.
// Ungültige Commands (falsche Phase, Karte nicht auf der Hand, zu teuer)
// werfen – die UI darf nur legale Commands senden.
import type { CardUid } from '../types/cards'
import type { CombatState, EntityId } from '../types/state'
import type { GameEvent } from '../types/events'
import type { RngStates } from '../rng/streams'
import { getCard } from '../registry'
import { discardCard, exhaustCard } from '../deck/piles'
import { resolveTargets } from '../effects/targeting'
import { runActionQueue, type Action } from './actionQueue'

export interface PlayCardResult {
  combat: CombatState
  rngStates: RngStates
  events: GameEvent[]
}

export function playCard(
  combat: CombatState,
  rngStates: RngStates,
  cardUid: CardUid,
  targetId: EntityId | null = null,
): PlayCardResult {
  if (combat.phase !== 'playerTurn') {
    throw new Error('Karten können nur während der Spielerrunde gespielt werden')
  }
  const card = combat.player.hand.find((c) => c.uid === cardUid)
  if (card === undefined) throw new Error(`Karte '${cardUid}' ist nicht auf der Hand`)
  const def = getCard(card.defId)
  if (def.keywords.includes('unplayable')) throw new Error(`Karte '${def.id}' ist unspielbar`)
  if (def.cost === 'X') throw new Error(`X-Kosten ('${def.id}') sind erst ab M3 implementiert`)

  const cost = card.costOverride?.value ?? def.cost
  if (cost > combat.player.energy) {
    throw new Error(`Zu wenig Glut für '${def.id}': ${cost} nötig, ${combat.player.energy} vorhanden`)
  }

  // Zielauflösung + Prüfung: ein explizites Ziel muss zu den erlaubten
  // Zielen dieser Karte gehören (sonst ist der Command illegal).
  const resolved = resolveTargets(def.target, combat, combat.player.id, targetId, rngStates)
  if (targetId !== null && !resolved.targets.includes(targetId)) {
    throw new Error(`Ziel '${targetId}' ist für '${def.id}' nicht gültig`)
  }
  const primaryTarget = resolved.targets[0] ?? null

  const events: GameEvent[] = [
    { type: 'cardPlayed', cardUid: card.uid, cardId: def.id, targetId: primaryTarget, energySpent: cost },
    { type: 'energyChanged', entityId: combat.player.id, delta: -cost, total: combat.player.energy - cost },
  ]

  // Glut abziehen, Effekte über die Queue; targetMode übersteuert Effekte
  // ohne eigenes Ziel (z. B. allEnemies-Karten treffen alle Gegner).
  let c: CombatState = {
    ...combat,
    player: { ...combat.player, energy: combat.player.energy - cost },
  }
  const actions: Action[] = def.effects.map((effect) => ({
    effect,
    sourceId: combat.player.id,
    targetId: primaryTarget,
    targetMode: def.target,
  }))
  const queue = runActionQueue(actions, c, rngStates)
  c = queue.combat
  const states = queue.rngStates
  events.push(...queue.events)

  // Karte ablegen: exhaust → Erschöpfungsstapel (zählt nicht als entfernt,
  // der Stapel bleibt in der Stapel-Summe der Invariante).
  let player = c.player
  const moved = def.keywords.includes('exhaust')
    ? exhaustCard(player, card.uid)
    : discardCard(player, card.uid)
  player = moved.player
  events.push(...moved.events)

  c = {
    ...c,
    player,
    cardsPlayedThisTurn: [...c.cardsPlayedThisTurn, card],
    cardsPlayedThisCombat: c.cardsPlayedThisCombat + 1,
  }
  return { combat: c, rngStates: states, events }
}
