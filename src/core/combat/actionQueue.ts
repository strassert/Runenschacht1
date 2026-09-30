// Action-Queue (Masterplan 8.2): Effekte werden nicht direkt ausgeführt,
// sondern als Actions in eine FIFO-Queue gelegt und abgearbeitet, bis die
// Queue leer ist. Trigger-Reaktionen (M4) können neue Actions ans Ende
// oder nach vorne einreihen. Schutz: max. MAX_ACTIONS_PER_COMMAND Actions
// pro Command (Endlosschleife → Fehler). Nach jeder Action folgt die
// Tod-Prüfung: Kampfabschluss → Queue leeren und Kampf beenden.
import type { GameEvent } from '../types/events'
import type { CombatState } from '../types/state'
import type { RngStates } from '../rng/streams'
import { MAX_ACTIONS_PER_COMMAND } from '../constants'
import { executeEffect, type EffectInvocation } from '../effects/basicEffects'

export interface Action extends EffectInvocation {
  /** true = nach vorne einreihen (Sofortreaktion), sonst ans Ende (Standard). */
  front?: boolean
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
