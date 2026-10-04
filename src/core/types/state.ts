// Kampf- und Run-Zustand gemäß Masterplan 6. Die in Abschnitt 6 nur
// vorwärts referenzierten Typen (IntentPreview aus enemies.ts, sowie
// RelicInstance, PotionId, MapState, ScreenState, RewardState, ShopState,
// EventState, RunStats) sind hier minimal definiert und werden in den
// jeweiligen Meilensteinen (M3–M8) ausgebaut.
import type { CardId, CardInstance, CardUid, TargetMode } from './cards'
import type { EffectSpec, StatusId } from './effects'
import type { IntentPreview } from './enemies'

export type EntityId = string // "player", "enemy-0", "enemy-1", ...

export interface StatusInstance {
  id: StatusId
  stacks: number
}

// ---------- Kampf-Entitäten ----------
export interface Combatant {
  id: EntityId
  hp: number
  maxHp: number
  block: number
  statuses: StatusInstance[]
}

export interface EnemyState extends Combatant {
  defId: string
  intent: IntentPreview | null // was der Gegner als Nächstes tut
  moveHistory: string[] // für KI-Regeln (keine 3× gleich etc.)
  aiMemory: Record<string, number> // freie Zähler für Skript-KI
  alive: boolean
}

export interface PlayerCombatState extends Combatant {
  energy: number // „Glut“
  maxEnergy: number
  drawPile: CardInstance[]
  hand: CardInstance[]
  discardPile: CardInstance[]
  exhaustPile: CardInstance[]
  powers: StatusInstance[] // aktive Kraft-Karten als Status
  // Erweiterung (DECISIONS.md): Zähler für den Invarianten-Check
  // „Summe aller Stapel = Deckgröße + generierte − entfernte“ (Masterplan 13.3).
  cardsGeneratedThisCombat: number
  cardsRemovedThisCombat: number
}

/** Auswahl-Arten für Effekte mit choice:'player' (8.5). */
export type ChoiceKind = 'discard' | 'exhaustFromHand' | 'upgradeInHand'

/** Serialisierte Action der Action-Queue (8.2) – Queue-Rest während einer Pause. */
export interface QueuedAction {
  effect: EffectSpec
  sourceId: EntityId
  targetId: EntityId | null
  targetMode?: TargetMode
  front?: boolean
  /** UID der Karte, die den Effekt auslöste (Kandidaten schließen sie aus). */
  sourceCardUid?: CardUid
}

/** Offene Spieler-Auswahl (8.5): die Queue pausiert bis Command 'ChooseCards'. */
export interface PendingChoice {
  kind: ChoiceKind
  count: number
  /** wählbare Karten-UIDs (Hand, ohne die gespielte Karte). */
  candidates: CardUid[]
  sourceCardUid: CardUid | null
  /** Queue-Rest, läuft nach der Auswahl weiter. */
  remainingActions: QueuedAction[]
}

export interface CombatState {
  turn: number
  phase: 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat'
  player: PlayerCombatState
  enemies: EnemyState[]
  cardsPlayedThisTurn: CardInstance[]
  cardsPlayedThisCombat: number
  counters: Record<string, number> // für Artefakte/Karten („3. Angriff pro Runde”)
  roomType: 'combat' | 'elite' | 'boss'
  /** Offene choice:'player'-Auswahl (8.5); solange gesetzt, nur 'ChooseCards' erlaubt. */
  pendingChoice?: PendingChoice | null
}

// ---------- Run ----------
export type RngStream =
  | 'map'
  | 'encounters'
  | 'cardRewards'
  | 'shuffle'
  | 'combat'
  | 'enemyAi'
  | 'loot'
  | 'events'
  | 'shop'
  | 'misc'

export interface RelicInstance {
  defId: string
  counters?: Record<string, number> // z. B. „Karten gespielt“ für Trickle-Relikte
}

export type PotionId = string

export type MapRoomType = 'combat' | 'event' | 'elite' | 'rest' | 'shop' | 'treasure' | 'boss'

export interface MapNode {
  id: string
  floor: number
  column: number
  type: MapRoomType
  next: string[] // Node-Ids des nächsten Stockwerks
}

export interface MapState {
  nodes: MapNode[]
  visitedNodeIds: string[]
}

export type ScreenState =
  | { kind: 'menu' }
  | { kind: 'characterSelect' }
  | { kind: 'map' }
  | { kind: 'combat' }
  | { kind: 'reward' }
  | { kind: 'rest' }
  | { kind: 'shop' }
  | { kind: 'event' }
  | { kind: 'treasure' }
  | { kind: 'gameOver' }
  | { kind: 'victory' }

export interface CardRewardOption {
  cardId: CardId
  upgraded: boolean
}

export interface RewardState {
  gold: number
  cardOptions: CardRewardOption[] // 1 aus 3; leer, wenn keine Karte angeboten wird
  potionId: PotionId | null
  relicDefId: string | null
}

export interface ShopOffer {
  kind: 'card' | 'relic' | 'potion'
  defId: string
  price: number
  upgraded?: boolean
  discounted?: boolean
  sold?: boolean
}

export interface ShopState {
  offers: ShopOffer[]
  removeCost: number // 75, +25 je Entfernung im Run (Masterplan 9.4)
}

export interface EventState {
  defId: string
  chosenOptionId: string | null
}

export interface RunStats {
  damageDealt: number
  damageTaken: number
  kills: number
  cardsPlayed: number
  combatsWon: number
  floorsEntered: number
  goldEarned: number
}

export interface RunState {
  schemaVersion: number
  seed: string
  rngStates: Record<RngStream, number[]>
  characterId: string
  ascension: number // „Tiefenstufe“ 0–10
  layer: 1 | 2 | 3 // Schicht (Akt)
  floor: number // Stockwerk innerhalb der Schicht
  hp: number
  maxHp: number
  gold: number
  deck: CardInstance[]
  relics: RelicInstance[]
  potions: (PotionId | null)[] // feste Anzahl Slots
  map: MapState
  currentNodeId: string | null
  screen: ScreenState // welcher Raum/Screen gerade aktiv ist
  combat: CombatState | null
  rewardState: RewardState | null
  shopState: ShopState | null
  eventState: EventState | null
  stats: RunStats // Schaden, Kills, gespielte Karten …
  pity: { rareCardOffset: number; potionChance: number }
  nextUid: number
}
