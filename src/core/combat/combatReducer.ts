// Combat-Reducer (Masterplan 5.2): UI schickt ein Command, das Core
// verarbeitet alles und liefert {state, events}. state ist sofort korrekt,
// events sind das chronologische Animations-Protokoll. playCard → playCard();
// endTurn → endPlayerTurn → runEnemyTurn → startPlayerTurn (kette, bricht bei
// Kampfende ab); danach finishCombat (combatEnded, HP/Statistik im Run).
// ChooseCards (8.5) setzt eine pausierte Action-Queue fort;
// chooseReward/chooseMapNode folgen in M6.
import type { CardUid } from '../types/cards'
import type { Command } from '../types/commands'
import type { CombatState, PendingChoice, RunState } from '../types/state'
import type { GameEvent } from '../types/events'
import type { TurnResult } from './turn'
import { endPlayerTurn, runEnemyTurn, startPlayerTurn } from './turn'
import { playCard } from './playCard'
import { finishCombat, isCombatOver } from './victory'
import { applyPlayerChoice, runActionQueue } from './actionQueue'

export interface ReducerResult {
  state: RunState
  events: GameEvent[]
}

/** Turn-Ergebnis in den RunState schreiben; bei Kampfende finishCombat anhängen. */
function applyTurnResult(state: RunState, result: TurnResult): ReducerResult {
  const mid: RunState = { ...state, combat: result.combat, rngStates: result.rngStates }
  if (!isCombatOver(result.combat)) return { state: mid, events: result.events }
  const finished = finishCombat(mid, result.combat)
  return { state: finished.run, events: [...result.events, ...finished.events] }
}

/** ChooseCards (8.5): Auswahl validieren, anwenden, Queue-Rest fortsetzen. */
function resumeChoice(
  state: RunState,
  combat: CombatState,
  pending: PendingChoice,
  uids: readonly CardUid[],
): ReducerResult {
  if (uids.length !== pending.count) {
    throw new Error(`ChooseCards: ${pending.count} Karten erwartet, erhalten: ${uids.length}`)
  }
  if (new Set(uids).size !== uids.length) {
    throw new Error('ChooseCards: UID-Wiederholungen sind nicht erlaubt')
  }
  const candidates = new Set(pending.candidates)
  for (const uid of uids) {
    if (!candidates.has(uid)) {
      throw new Error(`ChooseCards: Karte '${uid}' ist keine der Kandidaten`)
    }
  }
  const cleared: CombatState = { ...combat, pendingChoice: null }
  const applied = applyPlayerChoice(pending.kind, cleared, uids)
  const queue = runActionQueue(pending.remainingActions, applied.combat, state.rngStates)
  const merged: TurnResult = {
    combat: queue.combat,
    rngStates: queue.rngStates,
    events: [...applied.events, ...queue.events],
  }
  return applyTurnResult(state, merged)
}

export function combatReducer(state: RunState, cmd: Command): ReducerResult {
  const combat = state.combat
  if (combat === null) throw new Error('combatReducer: es ist kein Kampf aktiv')
  if (isCombatOver(combat)) {
    throw new Error(`combatReducer: der Kampf ist bereits beendet (Phase '${combat.phase}')`)
  }
  const pending = combat.pendingChoice ?? null
  if (pending !== null && cmd.type !== 'ChooseCards') {
    throw new Error(
      "combatReducer: offene Spieler-Auswahl (pendingChoice) – nur 'ChooseCards' ist erlaubt",
    )
  }

  switch (cmd.type) {
    case 'ChooseCards': {
      if (pending === null) {
        throw new Error("combatReducer: 'ChooseCards' braucht eine offene pendingChoice")
      }
      return resumeChoice(state, combat, pending, cmd.uids)
    }
    case 'playCard': {
      const result = playCard(combat, state.rngStates, cmd.cardUid, cmd.targetId ?? null)
      return applyTurnResult(state, result)
    }
    case 'endTurn': {
      if (combat.phase !== 'playerTurn') {
        throw new Error(`combatReducer: endTurn in Phase '${combat.phase}' ist nicht erlaubt`)
      }
      const ended = endPlayerTurn(combat, state.rngStates)
      if (isCombatOver(ended.combat)) return applyTurnResult(state, ended)
      const enemies = runEnemyTurn(ended.combat, ended.rngStates)
      if (isCombatOver(enemies.combat)) return applyTurnResult(state, enemies)
      const next = startPlayerTurn(enemies.combat, enemies.rngStates)
      const events = [...ended.events, ...enemies.events, ...next.events]
      const merged: TurnResult = { combat: next.combat, rngStates: next.rngStates, events }
      return applyTurnResult(state, merged)
    }
    case 'chooseReward':
    case 'chooseMapNode':
      throw new Error(`combatReducer: Command '${cmd.type}' ist bis M6 nicht implementiert`)
  }
}
