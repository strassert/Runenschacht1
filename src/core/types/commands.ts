// Commands gemäß Masterplan 5.2: Die UI sendet Commands, der Core
// verarbeitet sie vollständig und gibt { newState, events } zurück.
import type { CardUid } from './cards'
import type { EntityId } from './state'

export type Command =
  | { type: 'playCard'; cardUid: CardUid; targetId?: EntityId }
  | { type: 'endTurn' }
  | { type: 'chooseReward'; index: number | 'skip' }
  | { type: 'chooseMapNode'; nodeId: string }
