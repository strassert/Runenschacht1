// Zielauflösung (Masterplan 8.1/8.2): TargetMode → konkrete Entity-Ids.
// Perspektive ist die Gegenseite des Action-Absenders: Spieler-Actions
// zielen auf Gegner, Gegner-Actions (M2.4) zielen auf den Spieler.
import type { TargetMode } from '../types/cards'
import type { CombatState, EntityId } from '../types/state'
import { withStream, type RngStates } from '../rng/streams'

export interface TargetResolution {
  targets: EntityId[]
  rngStates: RngStates
}

function opposingSide(combat: CombatState, sourceId: EntityId): EntityId[] {
  if (sourceId === combat.player.id) {
    return combat.enemies.filter((e) => e.alive).map((e) => e.id)
  }
  return combat.player.hp > 0 ? [combat.player.id] : []
}

export function resolveTargets(
  mode: TargetMode,
  combat: CombatState,
  sourceId: EntityId,
  explicitTargetId: EntityId | null,
  rngStates: RngStates,
): TargetResolution {
  switch (mode) {
    case 'self':
      return { targets: [sourceId], rngStates }
    case 'none':
      return { targets: [], rngStates }
    case 'allEnemies':
      return { targets: opposingSide(combat, sourceId), rngStates }
    case 'randomEnemy': {
      const candidates = opposingSide(combat, sourceId)
      if (candidates.length === 0) return { targets: [], rngStates }
      const { value, states } = withStream(rngStates, 'combat', (rng) => rng.pick(candidates))
      return { targets: [value], rngStates: states }
    }
    case 'enemy': {
      const candidates = opposingSide(combat, sourceId)
      if (explicitTargetId !== null && candidates.includes(explicitTargetId)) {
        return { targets: [explicitTargetId], rngStates }
      }
      const first = candidates[0]
      return { targets: first === undefined ? [] : [first], rngStates }
    }
  }
}
