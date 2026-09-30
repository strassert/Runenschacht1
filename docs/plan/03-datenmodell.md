# Datenmodell

> Teil des Runenschacht-Masterplans (Abschnitte 6). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

> **Stand M1:** Die Typen sind in `src/core/types/*.ts` umgesetzt. **Der Code ist maßgeblich**, diese Datei ist die ursprüngliche Spezifikation. Bei Abweichungen gilt der Code (plus `docs/DECISIONS.md`). Lies die Typen gezielt im Code nach, statt diese Datei komplett zu laden.

## 6. Datenmodell (TypeScript-Typen)

Diese Typen sind die verbindliche Grundlage. Du darfst sie erweitern, aber nicht grundlegend umbauen, ohne `DECISIONS.md` zu aktualisieren.

```ts
// ---------- Grundtypen ----------
export type EntityId = string;            // "player", "enemy-0", "enemy-1", ...
export type CardId = string;              // Definitions-ID, z. B. "rs_hammer_blow"
export type CardUid = string;             // Instanz-ID im Deck, z. B. "c_0042"

export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special';
export type TargetMode = 'enemy' | 'allEnemies' | 'randomEnemy' | 'self' | 'none';

export type Keyword =
  | 'exhaust'      // Erschöpfen: nach dem Spielen aus dem Kampf entfernt
  | 'ethereal'     // Flüchtig: wird am Rundenende erschöpft, wenn noch auf der Hand
  | 'retain'       // Beibehalten: bleibt am Rundenende auf der Hand
  | 'innate'       // Angeboren: startet in der Anfangshand
  | 'unplayable';  // Unspielbar

// ---------- Karten ----------
export interface CardDef {
  id: CardId;
  nameKey: string;                        // i18n-Schlüssel
  type: CardType;
  rarity: Rarity;
  cost: number | 'X';                     // 'X' = verbraucht gesamte Glut
  target: TargetMode;
  keywords: Keyword[];
  effects: EffectSpec[];                  // deklarativ, siehe Abschnitt 8
  upgrade: CardUpgradeSpec;               // Unterschiede der verbesserten Version
  descriptionKey: string;                 // Text mit Platzhaltern {damage}, {block}, …
  characterId: string | 'neutral';
}

export interface CardUpgradeSpec {
  cost?: number | 'X';
  effects?: EffectSpec[];                 // ersetzt effects komplett, falls gesetzt
  addKeywords?: Keyword[];
  removeKeywords?: Keyword[];
}

export interface CardInstance {
  uid: CardUid;
  defId: CardId;
  upgraded: boolean;
  costOverride?: { value: number; until: 'turn' | 'combat' | 'played' };
}

// ---------- Status (Buffs/Debuffs) ----------
export type StatusId =
  | 'strength' | 'dexterity' | 'vulnerable' | 'weak' | 'frail'
  | 'burn' | 'thorns' | 'heat' | 'ritual' | 'artifact' | 'intangible'
  | string;                                // erweiterbar für Powers

export interface StatusInstance { id: StatusId; stacks: number; }

// ---------- Kampf-Entitäten ----------
export interface Combatant {
  id: EntityId;
  hp: number;
  maxHp: number;
  block: number;
  statuses: StatusInstance[];
}

export interface EnemyState extends Combatant {
  defId: string;
  intent: IntentPreview | null;           // was der Gegner als Nächstes tut
  moveHistory: string[];                  // für KI-Regeln (keine 3× gleich etc.)
  aiMemory: Record<string, number>;       // freie Zähler für Skript-KI
  alive: boolean;
}

export interface PlayerCombatState extends Combatant {
  energy: number;                          // „Glut“
  maxEnergy: number;
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  powers: StatusInstance[];                // aktive Kraft-Karten als Status
}

export interface CombatState {
  turn: number;
  phase: 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat';
  player: PlayerCombatState;
  enemies: EnemyState[];
  cardsPlayedThisTurn: CardInstance[];
  cardsPlayedThisCombat: number;
  counters: Record<string, number>;       // für Artefakte/Karten („3. Angriff pro Runde“)
  roomType: 'combat' | 'elite' | 'boss';
}

// ---------- Run ----------
export interface RunState {
  schemaVersion: number;
  seed: string;
  rngStates: Record<RngStream, number[]>;
  characterId: string;
  ascension: number;                       // „Tiefenstufe“ 0–10
  layer: 1 | 2 | 3;                        // Schicht (Akt)
  floor: number;                           // Stockwerk innerhalb der Schicht
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInstance[];
  relics: RelicInstance[];
  potions: (PotionId | null)[];            // feste Anzahl Slots
  map: MapState;
  currentNodeId: string | null;
  screen: ScreenState;                     // welcher Raum/Screen gerade aktiv ist
  combat: CombatState | null;
  rewardState: RewardState | null;
  shopState: ShopState | null;
  eventState: EventState | null;
  stats: RunStats;                         // Schaden, Kills, gespielte Karten …
  pity: { rareCardOffset: number; potionChance: number };
  nextUid: number;
}

export type RngStream =
  | 'map' | 'encounters' | 'cardRewards' | 'shuffle' | 'combat'
  | 'enemyAi' | 'loot' | 'events' | 'shop' | 'misc';
```

**Gegner-Definition:**
```ts
export interface EnemyDef {
  id: string;
  nameKey: string;
  hp: [number, number];                    // Min/Max, per RNG gewürfelt
  moves: Record<string, EnemyMove>;
  ai: EnemyAiSpec;                         // deklarativ ODER scriptId
  onSpawn?: EffectSpec[];                  // z. B. Startstatus
  sizeClass: 'small' | 'medium' | 'large' | 'boss';
}

export interface EnemyMove {
  id: string;
  intent: IntentType;                      // Icon/Anzeige
  effects: EffectSpec[];
}

export type IntentType =
  | 'attack' | 'attackMulti' | 'defend' | 'buff' | 'debuff'
  | 'attackDefend' | 'attackDebuff' | 'strongDebuff' | 'escape' | 'sleep' | 'unknown';

export type EnemyAiSpec =
  | { kind: 'weighted'; weights: Record<string, number>; maxRepeat: number }
  | { kind: 'cycle'; sequence: string[]; startRandom?: boolean }
  | { kind: 'script'; scriptId: string };
```
