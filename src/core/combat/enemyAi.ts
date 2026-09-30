// Gegner-KI (Masterplan 7.5): 'weighted' (Stream 'enemyAi', maxRepeat als
// Grenze für direkte Wiederholungen) und 'cycle' (feste Reihenfolge, optional
// zufälliger Start, im aiMemory gemerkt). 'script' folgt später (M8.2).
// Ehrliche Intents: damagePreview = tatsächlicher Schaden pro Treffer nach
// Formel 7.3 (Kraft/Geschwächt des Gegners, Verwundbar des Spielers).
import type { EnemyDef, EnemyMove, IntentPreview } from '../types/enemies'
import type { EnemyState, PlayerCombatState } from '../types/state'
import type { RngStates } from '../rng/streams'
import { withStream } from '../rng/streams'
import { computeDamage } from './damage'

export interface MoveChoice {
  moveId: string
  /** Aktualisiertes aiMemory (cycle merkt sich den ausgewürfelten Start). */
  aiMemory: Record<string, number>
  rngStates: RngStates
}

/** Wie oft wurde moveId am Ende der Historie direkt hintereinander gewählt? */
function trailingRepeat(history: readonly string[], moveId: string): number {
  let n = 0
  for (let i = history.length - 1; i >= 0 && history[i] === moveId; i--) n++
  return n
}

export function chooseEnemyMove(
  def: EnemyDef,
  enemy: EnemyState,
  rngStates: RngStates,
): MoveChoice {
  const ai = def.ai

  if (ai.kind === 'cycle') {
    if (ai.sequence.length === 0) {
      throw new Error(`Gegner '${def.id}': cycle-KI mit leerer Sequenz`)
    }
    const { value, states } = withStream(rngStates, 'enemyAi', (rng) => {
      const stored = enemy.aiMemory['cycleStart']
      const start = ai.startRandom ? (stored ?? rng.nextInt(0, ai.sequence.length)) : 0
      const index = (start + enemy.moveHistory.length) % ai.sequence.length
      return { moveId: ai.sequence[index] as string, start }
    })
    return {
      moveId: value.moveId,
      aiMemory: { ...enemy.aiMemory, cycleStart: value.start },
      rngStates: states,
    }
  }

  if (ai.kind === 'weighted') {
    const entries = Object.entries(ai.weights).filter(([, w]) => w > 0)
    if (entries.length === 0) {
      throw new Error(`Gegner '${def.id}': weighted-KI ohne Moves mit Gewicht > 0`)
    }
    const { value: moveId, states } = withStream(rngStates, 'enemyAi', (rng) => {
      const last = enemy.moveHistory[enemy.moveHistory.length - 1]
      // maxRepeat verbietet dieselbe Wahl direkt hintereinander über dem Limit.
      const candidates = entries.filter(
        ([id]) => !(id === last && trailingRepeat(enemy.moveHistory, id) >= ai.maxRepeat),
      )
      // Alle Kandidaten gesperrt (z. B. nur ein Move) → alle Gewichte wieder zulässig.
      const pool = candidates.length > 0 ? candidates : entries
      const total = pool.reduce((sum, [, w]) => sum + w, 0)
      const roll = rng.nextInt(0, total)
      let acc = 0
      for (const [id, w] of pool) {
        acc += w
        if (roll < acc) return id
      }
      return pool[pool.length - 1]?.[0] ?? entries[0]?.[0] ?? ''
    })
    if (moveId === '') throw new Error(`Gegner '${def.id}': weighted-KI traf keine Wahl`)
    return { moveId, aiMemory: enemy.aiMemory, rngStates: states }
  }

  throw new Error(`Gegner-KI '${ai.kind}' ist bis M2.4 nicht implementiert`)
}

/**
 * Ehrlicher Intent (7.5): für alle Schadens-Effekte mit festem Zahlenwert
 * der tatsächliche Schaden pro Treffer (Formel 7.3, 'raw' ohne attackLike).
 * Dynamische ValueExpr (M3+) lässt damagePreview offen (DECISIONS.md).
 */
export function previewIntent(
  move: EnemyMove,
  enemy: EnemyState,
  player: PlayerCombatState,
): IntentPreview {
  const preview: IntentPreview = { moveId: move.id, intent: move.intent }
  const damages: number[] = []
  for (const effect of move.effects) {
    if (effect.type !== 'damage') continue
    if (typeof effect.amount !== 'number') return preview
    const attackLike = !effect.tags?.includes('raw')
    for (let hit = 0; hit < (effect.hits ?? 1); hit++) {
      damages.push(computeDamage(effect.amount, enemy, player, { attackLike }))
    }
  }
  if (damages.length > 0) preview.damagePreview = damages
  return preview
}
