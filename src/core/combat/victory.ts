// Kampfende (Masterplan 7.2 'Kampfende'): combatEnded-Event, HP-Rückkopplung
// in den RunState, Statistik (Kills, gespielte Karten, Siege). Der Kampf-
// zustand bleibt erhalten (Phase victory/defeat) – Belohnungs-Screen und
// Map-Rückkehr folgen in M6; damageDealt/-Taken-Statistik kommt mit M7.
import type { CombatState, RunState } from '../types/state'
import type { GameEvent } from '../types/events'

export interface FinishResult {
  run: RunState
  events: GameEvent[]
}

export function isCombatOver(combat: CombatState): boolean {
  return combat.phase === 'victory' || combat.phase === 'defeat'
}

/** Einmaliger Abschluss: combatEnded + Run-Anpassung (Kampf bleibt sichtbar). */
export function finishCombat(run: RunState, combat: CombatState): FinishResult {
  if (!isCombatOver(combat)) {
    throw new Error(`finishCombat: Kampf ist nicht beendet (Phase '${combat.phase}')`)
  }
  const victory = combat.phase === 'victory'
  const kills = combat.enemies.filter((e) => !e.alive).length
  const goldGained = combat.counters['goldGained'] ?? 0
  const run2: RunState = {
    ...run,
    hp: Math.max(0, combat.player.hp),
    maxHp: combat.player.maxHp, // gainMaxHp im Kampf wirkt auf den Run
    gold: run.gold + goldGained,
    combat,
    stats: {
      ...run.stats,
      goldEarned: run.stats.goldEarned + goldGained,
      kills: run.stats.kills + kills,
      cardsPlayed: run.stats.cardsPlayed + combat.cardsPlayedThisCombat,
      combatsWon: run.stats.combatsWon + (victory ? 1 : 0),
    },
  }
  return { run: run2, events: [{ type: 'combatEnded', victory }] }
}
