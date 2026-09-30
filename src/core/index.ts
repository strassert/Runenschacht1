// Öffentliche API des Core (Masterplan 4: UI spricht nur mit dem Core).
// Von außen importiert man ausschließlich aus 'src/core' – nie tiefere Pfade.
export type {
  CardId,
  CardUid,
  CardType,
  Rarity,
  TargetMode,
  Keyword,
  CardDef,
  CardUpgradeSpec,
  CardInstance,
} from './types/cards'
export type { StatusId, EffectSpec, ValueExpr, ConditionExpr } from './types/effects'
export type { EnemyDef, EnemyMove, IntentType, EnemyAiSpec, IntentPreview } from './types/enemies'
export type { GameEvent } from './types/events'
export type { Command } from './types/commands'
export type {
  EntityId,
  StatusInstance,
  Combatant,
  EnemyState,
  PlayerCombatState,
  CombatState,
  RngStream,
  RelicInstance,
  PotionId,
  MapRoomType,
  MapNode,
  MapState,
  ScreenState,
  CardRewardOption,
  RewardState,
  ShopOffer,
  ShopState,
  EventState,
  RunStats,
  RunState,
} from './types/state'

export { cyrb128, hashSeed, Rng, type RngState } from './rng/Rng'
export { RNG_STREAMS, initialRngStates, withStream, type RngStates } from './rng/streams'

export { shuffle } from './deck/shuffle'
export { drawCards, discardCard, exhaustCard, prepareDrawPile } from './deck/piles'
export type { DrawResult, MoveResult } from './deck/piles'
export { upgradeCard, upgradeInPlace, upgradeAll } from './deck/upgrade'

export { computeDamage, applyDamage, type DamageOptions, type DamageResult } from './combat/damage'
export { computeBlock, applyBlock, type BlockResult } from './combat/block'
export {
  DEBUFF_STATUSES,
  getStatusStacks,
  applyStatus,
  endOfOwnerTurn,
  startOfOwnerTurn,
  type StatusResult,
  type TurnTickResult,
} from './combat/statuses'

export { checkInvariants, checkCombatInvariants, type InvariantViolation } from './invariants'

export {
  registerCard,
  getCard,
  registerEnemy,
  getEnemy,
  registerEncounter,
  getEncounter,
  registerRelic,
  getRelic,
  registerPotion,
  getPotion,
  registerEvent,
  getEvent,
  registerScript,
  getScript,
  type EncounterDef,
  type RelicDef,
  type PotionDef,
  type EventDef,
  type ScriptFn,
} from './registry'

export {
  START_HP,
  MAX_ENERGY,
  DRAW_PER_TURN,
  MAX_HAND,
  POTION_SLOTS,
  START_GOLD,
  SAVE_SCHEMA_VERSION,
  UID_PREFIX,
  ASCENSION_MAX,
  LAYERS,
} from './constants'
