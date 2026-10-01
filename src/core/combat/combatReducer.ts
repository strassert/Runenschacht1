// Combat-Reducer (Masterplan 5.2): UI schickt ein Command, das Core
// verarbeitet alles und liefert {state, events}. state ist sofort korrekt,
// events sind das chronologische Animations-Protokoll. playCard → playCard();
// endTurn → endPlayerTurn → runEnemyTurn → startPlayerTurn (kette, bricht bei
// Kampfende ab); danach finishCombat (combatEnded, HP/Statistik im Run).
// chooseReward/chooseMapNode folgen in M6.
import type { Command } from '../types/commands'
import type { RunState } from '../types/state'
import type { GameEvent } from '../types/events'
import type { TurnResult } from './turn'
import { endPlayerTurn, runEnemyTurn, startPlayerTurn } from './turn'
import { playCard } from './playCard'
import { finishCombat, isCombatOver } from './victory'

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

export function combatReducer(state: RunState, cmd: Command): ReducerResult {
  const combat = state.combat
  if (combat === null) throw new Error('combatReducer: es ist kein Kampf aktiv')
  if (isCombatOver(combat)) {
    throw new Error(`combatReducer: der Kampf ist bereits beendet (Phase '${combat.phase}')`)
  }

  switch (cmd.type) {
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
