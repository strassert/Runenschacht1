// Action-Queue (Masterplan 8.2): Effekte werden nicht direkt ausgeführt,
// sondern als Actions in eine FIFO-Queue gelegt und abgearbeitet, bis die
// Queue leer ist. Trigger-Reaktionen (M4) können neue Actions ans Ende
// oder nach vorne einreihen. Schutz: max. MAX_ACTIONS_PER_COMMAND Actions
// pro Command (Endlosschleife → Fehler). Nach jeder Action folgt die
// Tod-Prüfung: Kampfabschluss → Queue leeren und Kampf beenden.
// Actions mit choice:'player' pausieren die Queue als pendingChoice (8.5);
// der Command 'ChooseCards' (combatReducer) setzt sie fort.
import type { CardUid } from '../types/cards'
import type { EffectSpec } from '../types/effects'
import type { GameEvent } from '../types/events'
import type { ChoiceKind, CombatState } from '../types/state'
import type { RngStates } from '../rng/streams'
import { MAX_ACTIONS_PER_COMMAND } from '../constants'
import { discardCard, exhaustCard } from '../deck/piles'
import { upgradeCard } from '../deck/upgrade'
import { executeEffect, type EffectInvocation } from '../effects/basicEffects'

export interface Action extends EffectInvocation {
  /** true = nach vorne einreihen (Sofortreaktion), sonst ans Ende (Standard). */
  front?: boolean
  /** UID der Karte, die die Action auslöste (choice-Kandidaten schließen sie aus). */
  sourceCardUid?: CardUid
}

export interface ActionStep {
  combat: CombatState
  rngStates: RngStates
  events: GameEvent[]
  /** Von Triggern (M4) nachgereichte Actions. */
  newActions?: Action[]
}

export type ActionExecutor = (
  action: Action,
  combat: CombatState,
  rngStates: RngStates,
) => ActionStep

/** Standard-Ausführer: führt den Effect der Action aus (M2.3: 5 Basis-Effekte). */
export const executeBasicAction: ActionExecutor = (action, combat, rngStates) => ({
  ...executeEffect(action, combat, rngStates),
})

export interface QueueResult {
  combat: CombatState
  rngStates: RngStates
  events: GameEvent[]
  actionsProcessed: number
}

type ChoiceEffect = Extract<EffectSpec, { type: ChoiceKind }>

/** choice:'player'-Action? (discard/exhaustFromHand/upgradeInHand, 8.5). */
function choiceSpecOf(action: Action): ChoiceEffect | null {
  const e = action.effect
  const isChoice =
    (e.type === 'discard' || e.type === 'exhaustFromHand' || e.type === 'upgradeInHand') &&
    e.choice === 'player'
  return isChoice ? e : null
}

function choiceCount(effect: ChoiceEffect, candidates: number): number {
  if (effect.count === 'all') return candidates
  return Math.max(0, Math.floor(effect.count))
}

/** Wählbare Hand-UIDs – die gespielte Karte ist während der Queue noch auf der Hand. */
function handCandidates(combat: CombatState, sourceCardUid: CardUid | undefined): CardUid[] {
  return combat.player.hand.filter((c) => c.uid !== sourceCardUid).map((c) => c.uid)
}

export interface ChoiceApplyResult {
  combat: CombatState
  events: GameEvent[]
}

/** Auswahl anwenden (8.5): gewählte UIDs ablegen/erschöpfen/verbessern. */
export function applyPlayerChoice(
  kind: ChoiceKind,
  combat: CombatState,
  uids: readonly CardUid[],
): ChoiceApplyResult {
  if (kind === 'upgradeInHand') {
    const chosen = new Set(uids)
    const player = {
      ...combat.player,
      hand: combat.player.hand.map((c) => (chosen.has(c.uid) ? upgradeCard(c) : c)),
    }
    // cardUpgraded-Event gibt es noch nicht (Offener Punkt) – state ist sofort korrekt.
    return { combat: { ...combat, player }, events: [] }
  }
  let player = combat.player
  const events: GameEvent[] = []
  for (const uid of uids) {
    const moved = kind === 'discard' ? discardCard(player, uid) : exhaustCard(player, uid)
    player = moved.player
    events.push(...moved.events)
  }
  return { combat: { ...combat, player }, events }
}

/**
 * Nach jeder Action: tote Gegner alive=false + enemyDied; Spieler HP<=0 →
 * 'defeat' (zuerst geprüft – Dornen können mich mit dem letzten Gegner töten),
 * alle Gegner tot → 'victory'. combatEnded bleibt M2.5 (combatReducer).
 */
function checkDeaths(
  combat: CombatState,
  events: GameEvent[],
): { combat: CombatState; combatOver: boolean } {
  const enemies = combat.enemies.map((e) => {
    if (e.alive && e.hp <= 0) {
      events.push({ type: 'enemyDied', enemyId: e.id })
      return { ...e, alive: false }
    }
    return e
  })
  const c = { ...combat, enemies }
  if (c.player.hp <= 0) return { combat: { ...c, phase: 'defeat' }, combatOver: true }
  if (c.enemies.every((e) => !e.alive)) return { combat: { ...c, phase: 'victory' }, combatOver: true }
  return { combat: c, combatOver: false }
}

export function runActionQueue(
  initialActions: readonly Action[],
  combat: CombatState,
  rngStates: RngStates,
  execute: ActionExecutor = executeBasicAction,
): QueueResult {
  const queue: Action[] = [...initialActions]
  const events: GameEvent[] = []
  let c = combat
  let states = rngStates
  let processed = 0

  while (queue.length > 0) {
    if (processed >= MAX_ACTIONS_PER_COMMAND) {
      throw new Error(
        `Action-Queue: Limit von ${MAX_ACTIONS_PER_COMMAND} Actions pro Command überschritten – Endlosschleife?`,
      )
    }
    const action = queue.shift()
    if (action === undefined) break

    const choice = choiceSpecOf(action)
    if (choice !== null) {
      const candidates = handCandidates(c, action.sourceCardUid)
      const count = choiceCount(choice, candidates.length)
      if (count === 0 || candidates.length === 0) {
        processed++ // nichts wählbar – der Effekt verpufft
        continue
      }
      if (candidates.length <= count) {
        // Höchstens count Kandidaten → alles automatisch, ohne Pause (8.5).
        const applied = applyPlayerChoice(choice.type, c, candidates)
        c = applied.combat
        events.push(...applied.events)
        processed++
        continue
      }
      // Pause: Queue-Rest in pendingChoice; 'ChooseCards' (combatReducer) fährt fort.
      c = {
        ...c,
        pendingChoice: {
          kind: choice.type,
          count,
          candidates,
          sourceCardUid: action.sourceCardUid ?? null,
          remainingActions: [...queue],
        },
      }
      break
    }

    const step = execute(action, c, states)
    c = step.combat
    states = step.rngStates
    events.push(...step.events)
    processed++

    const death = checkDeaths(c, events)
    c = death.combat
    if (death.combatOver) {
      queue.length = 0 // Queue leeren, der Kampf ist vorbei
      break
    }

    for (const newAction of step.newActions ?? []) {
      if (newAction.front) queue.unshift(newAction)
      else queue.push(newAction)
    }
  }

  return { combat: c, rngStates: states, events, actionsProcessed: processed }
}
