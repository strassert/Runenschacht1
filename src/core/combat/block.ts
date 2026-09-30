// Block-Formel (Masterplan 7.3): basis + Gewandtheit, ×0,75 bei
// Zerbrechlich, abrunden, Minimum 0. Pure wie die Schadenslogik.
import type { GameEvent } from '../types/events'
import type { Combatant } from '../types/state'
import { getStatusStacks } from './statuses'

export function computeBlock(base: number, owner: Combatant): number {
  let block = base + getStatusStacks(owner, 'dexterity')
  if (getStatusStacks(owner, 'frail') > 0) block *= 0.75
  return Math.max(0, Math.floor(block))
}

export interface BlockResult<C extends Combatant> {
  combatant: C
  events: GameEvent[]
  gained: number
}

/** Block anwenden (additiv, verfällt am Rundenanfang – siehe 7.2, M2.3). */
export function applyBlock<C extends Combatant>(owner: C, base: number): BlockResult<C> {
  const gained = computeBlock(base, owner)
  const total = owner.block + gained
  const combatant = { ...owner, block: total }
  const events: GameEvent[] = [{ type: 'blockGained', entityId: owner.id, amount: gained, total }]
  return { combatant, events, gained }
}
