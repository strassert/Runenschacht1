// Kampfende (Masterplan 7.2 'Kampfende'): combatEnded-Event genau einmal,
// HP aus dem Kampf zurück in den Run, Statistik, Screen-Wechsel. Der
// finale Kampf bleibt als Brett in state.combat stehen (UI zeigt ihn);
// rewardState (Belohnungskarten) und onCombatEnd-Trigger folgen in M4/M6.
import type { GameEvent } from '../types/events'
import type { CombatState, RunState, RunStats } from '../types/state'

export interface EndCombatResult {
  state: RunState
  events: GameEvent[]
}

export function endCombat(state: RunState, combat: CombatState): EndCombatResult {
  const victory = combat.phase === 'victory'
  const stats: RunStats = {
    ...state.stats,
    cardsPlayed: state.stats.cardsPlayed + combat.cardsPlayedThisCombat,
    kills: state.stats.kills + combat.enemies.filter((e) => !e.alive).length,
    combatsWon: state.stats.combatsWon + (victory ? 1 : 0),
    // damageDealt/damageTaken folgen mit der Trigger-Engine (M4) – Offener Punkt.
  }
  const next: RunState = {
    ...state,
    hp: Math.max(0, combat.player.hp), // Run-HP bleibt ≥ 0 (Invariante)
    combat,
    stats,
    screen: victory ? { kind: 'reward' } : { kind: 'gameOver' },
  }
  return { state: next, events: [{ type: 'combatEnded', victory }] }
}
