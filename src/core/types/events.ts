// Chronologisches Event-Protokoll gemäß Masterplan 5.2.
// Die UI spielt diese Events nacheinander als Animationen ab; der State ist
// sofort korrekt. Neue Event-Arten werden hier ergänzt (Erweiterung erlaubt).
import type { CardId, CardUid } from './cards'
import type { StatusId } from './effects'
import type { EntityId } from './state'
import type { IntentPreview } from './enemies'

export type GameEvent =
  | { type: 'combatStarted'; roomType: 'combat' | 'elite' | 'boss' }
  | { type: 'combatEnded'; victory: boolean }
  | { type: 'turnStarted'; entityId: EntityId; turn: number }
  | { type: 'turnEnded'; entityId: EntityId; turn: number }
  | { type: 'cardPlayed'; cardUid: CardUid; cardId: CardId; targetId: EntityId | null; energySpent: number }
  | { type: 'cardDrawn'; cardUid: CardUid; cardId: CardId }
  | { type: 'cardDiscarded'; cardUid: CardUid; cardId: CardId }
  | { type: 'cardExhausted'; cardUid: CardUid; cardId: CardId }
  | { type: 'cardGenerated'; cardUid: CardUid; cardId: CardId; to: 'hand' | 'draw' | 'discard' }
  | { type: 'drawPileRefilled'; fromDiscard: boolean }
  | { type: 'damageDealt'; sourceId: EntityId; targetId: EntityId; amount: number; blocked: number }
  | { type: 'blockGained'; entityId: EntityId; amount: number; total: number }
  | { type: 'statusApplied'; targetId: EntityId; status: StatusId; stacks: number; total: number }
  | { type: 'statusRemoved'; targetId: EntityId; status: StatusId }
  | { type: 'energyChanged'; entityId: EntityId; delta: number; total: number }
  | { type: 'hpChanged'; entityId: EntityId; delta: number; total: number }
  | { type: 'goldChanged'; delta: number; total: number }
  | { type: 'enemyIntent'; enemyId: EntityId; intent: IntentPreview }
  | { type: 'enemyDied'; enemyId: EntityId }
