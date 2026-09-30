# MASTERPLAN: „RUNENSCHACHT“ – Roguelike-Deckbuilder

> **An das Modell (Qwen):** Dieses Dokument ist deine vollständige Arbeitsanweisung und die einzige verbindliche Quelle (Single Source of Truth) für das Projekt. Lies es komplett, bevor du irgendetwas schreibst. Lege es im Repo als `docs/MASTERPLAN.md` ab. Arbeite die Meilensteine (Abschnitt 14) **strikt der Reihe nach** ab. Halte dich an die Arbeitsregeln (Abschnitt 15). Wenn dieses Dokument etwas nicht regelt, triff die einfachste sinnvolle Entscheidung und dokumentiere sie in `docs/DECISIONS.md`.

---

## 0. Inhaltsverzeichnis

1. Rolle & Auftrag
2. Spielkonzept
3. Harte Randbedingungen
4. Technologie-Stack
5. Architektur & Ordnerstruktur
6. Datenmodell (TypeScript-Typen)
7. Kampf-Engine (Regeln, Ablauf, Formeln)
8. Effekt- & Trigger-System
9. Run-Struktur: Karte, Knoten, Belohnungen, Shop, Rast, Events
10. Inhalte: Charakter, Karten, Gegner, Bosse, Artefakte, Tränke, Events
11. Schwierigkeit & Skalierung
12. UI/UX, Grafik, Audio
13. Speichern, RNG, Tests, Balancing-Simulator
14. Meilensteine mit Abnahmekriterien
15. Arbeitsregeln für dich (Qwen)
16. Definition of Done
17. Startbefehl

---

## 1. Rolle & Auftrag

Du bist ein erfahrener Senior-Game-Developer und Software-Architekt (TypeScript, React, Spielmechanik-Design, testgetriebene Entwicklung). Deine Aufgabe: Baue schrittweise ein vollständig spielbares, poliertes Roguelike-Deckbuilding-Spiel namens **„Runenschacht“**, das im Browser läuft (und optional als Desktop-App gepackt werden kann).

Du lieferst **lauffähigen, getesteten, vollständigen Code** – keine Pseudo-Implementierungen, keine „…rest bleibt gleich“-Auslassungen, keine leeren Funktionsrümpfe.

---

## 2. Spielkonzept

### 2.1 Pitch
Der Spieler steigt als **Runenschmiedin** in einen uralten Bergwerksschacht hinab. Der Schacht besteht aus **3 Schichten** (Akten). Jede Schicht ist eine verzweigte Karte aus Räumen. Am Ende jeder Schicht wartet ein Boss. Gekämpft wird rundenbasiert mit einem **Kartendeck**. Nach jedem Sieg darf der Spieler aus **3 zufälligen Karten eine** wählen (oder überspringen) und so sein Deck Schritt für Schritt zum „perfekten Deck“ formen. Gegner werden von Raum zu Raum und von Schicht zu Schicht stärker. Stirbt der Spieler, beginnt ein neuer Lauf (Run) von vorne – jeder Run ist durch Zufall anders.

### 2.2 Kern-Loop
```
Run starten → Karte wählen/Pfad wählen → Raum betreten
   ├─ Kampf  → Sieg → Belohnung (Gold, Kartenwahl 1 aus 3, evtl. Trank/Artefakt)
   ├─ Elite  → schwerer Kampf → bessere Belohnung + Artefakt
   ├─ Rast   → heilen ODER Karte verbessern
   ├─ Shop   → Karten/Artefakte/Tränke kaufen, Karte entfernen
   ├─ Event  → Textereignis mit Entscheidungen
   └─ Schatz → Artefakt
→ Boss → nächste Schicht … → Sieg nach Boss Schicht 3  (oder Tod → Game Over)
```

### 2.3 Design-Säulen
1. **Entscheidungen zählen:** Jede Kartenwahl, jeder Pfad, jede gespielte Karte ist eine echte Abwägung.
2. **Synergien entdecken:** Karten, Artefakte und Mechaniken greifen ineinander (Kern-Mechanik „Hitze“, siehe 10.1).
3. **Transparenz:** Gegner zeigen ihre Absicht (Intent) für den nächsten Zug. Alle Zahlen sind sichtbar und nachvollziehbar.
4. **Wiederspielbarkeit:** Seed-basierter Zufall, viele Karten, verschiedene Pfade, Schwierigkeitsstufen.

### 2.4 Referenz
Das Spielgefühl orientiert sich am Genre von *Slay the Spire / Slay the Spire 2*. **Wichtig:** Es werden **keine** Namen, Texte, Grafiken, Charaktere, Karten oder Gegner aus diesen Spielen übernommen. Alle Inhalte in diesem Plan und alles, was du ergänzt, sind eigene Schöpfungen. Allgemeine Genre-Mechaniken (Energie, Block, Intents, Kartenwahl) sind erlaubt.

---

## 3. Harte Randbedingungen

- **Sprache im Spiel:** Deutsch (alle Texte über ein i18n-Modul, damit Englisch später ergänzt werden kann).
- **Sprache im Code:** Englische Bezeichner, deutsche Kommentare erlaubt.
- **Keine externen Assets mit Lizenzproblemen.** Grafik = CSS + selbst erzeugte SVGs + prozedurale Farbverläufe. Audio = prozedural per WebAudio-API.
- **Deterministisch:** Gleicher Seed + gleiche Spielerentscheidungen = identischer Run.
- **Spiellogik strikt getrennt von der Darstellung.** Der Ordner `src/core` darf **nichts** aus React, DOM oder Browser-APIs importieren.
- **TypeScript strict mode**, keine `any` (Ausnahme mit Kommentar-Begründung).
- **Jede Datei < ~300 Zeilen.** Größere Dateien aufteilen.
- **Performance:** 60 FPS bei Animationen auf einem normalen Laptop.
- **Offline lauffähig**, kein Backend.

---

## 4. Technologie-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache | TypeScript (strict) | Typsicherheit für komplexe Regeln |
| Build | Vite | schnell, einfach |
| UI | React 18+ (Funktionskomponenten + Hooks) | Kartenspiele sind UI-lastig, DOM ist ideal |
| State (UI) | Zustand | minimal, keine Boilerplate |
| Animation | CSS-Transitions + Framer Motion | Karten fliegen, Schaden-Zahlen, Shake |
| Tests | Vitest | nativ mit Vite |
| Lint/Format | ESLint + Prettier | Konsistenz |
| Audio | WebAudio (eigene kleine Synth-Klasse) | keine Assets nötig |
| Speichern | localStorage (hinter einem `SaveStorage`-Interface) | austauschbar |
| Desktop (optional, M12) | Tauri | kleine Binaries |

Verwende die stabilen Versionen, die `npm create vite@latest` (Template `react-ts`) liefert. Keine weiteren Libraries ohne Eintrag in `docs/DECISIONS.md`.

**npm-Scripts (Pflicht):**
```
dev, build, preview, test, test:watch, typecheck (tsc --noEmit), lint, format, sim (Balancing-Simulator)
```

---

## 5. Architektur & Ordnerstruktur

### 5.1 Schichten
```
┌──────────────────────────────────────────────┐
│ src/ui        React-Komponenten, Screens,    │  ← liest State, schickt Commands
│               Animationen, Audio             │
├──────────────────────────────────────────────┤
│ src/store     Zustand-Store: hält RunState,  │  ← einzige Brücke UI ↔ Core
│               ruft core-Funktionen auf,      │
│               verwaltet Event-Queue für Anim.│
├──────────────────────────────────────────────┤
│ src/core      REINE Spiellogik (keine DOM-   │  ← deterministisch, voll getestet
│               /React-Imports), RNG, Regeln   │
├──────────────────────────────────────────────┤
│ src/content   Daten: Karten, Gegner, Arte-   │  ← deklarativ, + registrierte
│               fakte, Tränke, Events, Texte   │     Skript-Effekte
└──────────────────────────────────────────────┘
src/sim        Headless-Bot + Statistik (nutzt nur core + content)
```

### 5.2 Kommunikationsprinzip (Command → Events)
- Die UI sendet **Commands** (z. B. `PlayCard{cardUid, targetId}`, `EndTurn`, `ChooseReward{index}`, `ChooseMapNode{nodeId}`).
- Der Core verarbeitet einen Command vollständig und gibt zurück: `{ newState, events: GameEvent[] }`.
- `events` ist ein chronologisches Protokoll (`CardPlayed`, `DamageDealt`, `BlockGained`, `StatusApplied`, `EnemyDied`, `CardDrawn`, …). Die UI spielt diese Events **nacheinander als Animationen** ab; der State ist sofort korrekt, die Animation ist nur Darstellung.
- Während Animationen laufen, sind Eingaben gesperrt (oder beschleunigt, Einstellung „Schnellmodus“).

### 5.3 Ordnerstruktur
```
runenschacht/
├─ docs/
│  ├─ MASTERPLAN.md          (dieses Dokument)
│  ├─ PROGRESS.md            (Fortschritt, von dir gepflegt)
│  ├─ DECISIONS.md           (Architekturentscheidungen)
│  └─ CONTENT_GUIDE.md       (wie man Karten/Gegner hinzufügt)
├─ src/
│  ├─ core/
│  │  ├─ rng/                Rng.ts, streams.ts
│  │  ├─ types/              state.ts, cards.ts, enemies.ts, effects.ts, events.ts, commands.ts
│  │  ├─ combat/             combatSetup.ts, turn.ts, playCard.ts, damage.ts, block.ts,
│  │  │                      statuses.ts, enemyAi.ts, actionQueue.ts, victory.ts
│  │  ├─ effects/            effectRegistry.ts, basicEffects.ts, targeting.ts
│  │  ├─ triggers/           hooks.ts, dispatch.ts
│  │  ├─ deck/               piles.ts, shuffle.ts, upgrade.ts
│  │  ├─ map/                generateMap.ts, mapRules.ts
│  │  ├─ rewards/            cardRewards.ts, goldRewards.ts, potionDrops.ts, relicDrops.ts
│  │  ├─ rooms/              rest.ts, shop.ts, event.ts, treasure.ts
│  │  ├─ run/                newRun.ts, runReducer.ts, progression.ts
│  │  ├─ save/               serialize.ts, migrations.ts
│  │  └─ index.ts            öffentliche API des Cores
│  ├─ content/
│  │  ├─ characters/         runesmith.ts
│  │  ├─ cards/              runesmith/*.ts, neutral.ts, curses.ts, status.ts
│  │  ├─ enemies/            layer1.ts, layer2.ts, layer3.ts, bosses.ts, encounters.ts
│  │  ├─ relics/             relics.ts
│  │  ├─ potions/            potions.ts
│  │  ├─ events/             events.ts
│  │  ├─ scripts/            scripted effects (Sonderfälle) mit ID-Registrierung
│  │  └─ i18n/               de.ts (alle Texte), keywords.ts
│  ├─ store/                 gameStore.ts, animationQueue.ts, settingsStore.ts
│  ├─ ui/
│  │  ├─ screens/            MainMenu, CharacterSelect, MapScreen, CombatScreen,
│  │  │                      RewardScreen, ShopScreen, RestScreen, EventScreen,
│  │  │                      TreasureScreen, GameOverScreen, VictoryScreen,
│  │  │                      SettingsScreen, CompendiumScreen
│  │  ├─ components/         Card, CardHand, EnemyView, PlayerView, IntentIcon,
│  │  │                      HealthBar, StatusIcons, EnergyOrb, PileButton,
│  │  │                      Tooltip, RelicBar, PotionBar, DeckViewer, MapNode
│  │  ├─ anim/               useEventPlayer.ts, floatingNumbers.tsx, shake.ts
│  │  ├─ audio/              synth.ts, sfx.ts
│  │  ├─ icons/              SVG-Icons als React-Komponenten
│  │  └─ styles/             tokens.css, card.css, …
│  ├─ sim/                   bot.ts, runSimulator.ts, report.ts, cli.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ tests/                    spiegelt src/core-Struktur, + golden/ (Seed-Snapshots)
└─ package.json
```

---

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

---

## 7. Kampf-Engine

### 7.1 Grundwerte
| Wert | Standard |
|---|---|
| Start-HP Runenschmiedin | 75 |
| Glut (Energie) pro Runde | 3 |
| Karten ziehen pro Runde | 5 |
| Max. Handgröße | 10 (Überzählige gezogene Karten → Ablagestapel) |
| Trank-Slots | 3 |
| Start-Gold | 99 |

### 7.2 Kampfablauf
```
Kampfbeginn:
  1. Gegner erzeugen (HP würfeln, onSpawn-Effekte)
  2. Deck kopieren → Nachziehstapel mischen (Stream 'shuffle'); 'innate'-Karten nach oben
  3. Trigger: onCombatStart (Artefakte, z. B. +3 Hitze)
  4. Gegner-Intents für Runde 1 bestimmen
  5. → Spielerrunde

Spielerrunde:
  1. turn += 1; Glut = maxEnergy (+ Boni)
  2. Block des Spielers verfällt (außer Effekte wie „Runenbarriere“)
  3. Trigger: onPlayerTurnStart (Powers, Artefakte, Brand/Status-Ticks auf dem Spieler)
  4. 5 Karten ziehen (Nachziehstapel leer → Ablagestapel mischen und nachziehen)
  5. Spieler spielt beliebig Karten (Glut prüfen, Ziel prüfen) / nutzt Tränke
  6. Spieler drückt „Zug beenden“
  7. Trigger: onPlayerTurnEnd (z. B. Hitze halbieren, Verbrennung-Karten)
  8. Handkarten: 'ethereal' → erschöpfen; 'retain' → bleiben; Rest → Ablage
  9. Debuff-Dauer auf dem Spieler (vulnerable/weak/frail) −1

Gegnerrunde:
  1. Block aller Gegner verfällt
  2. Trigger: onEnemyTurnStart pro Gegner (Brand-Schaden, Ritual usw.)
  3. Jeder lebende Gegner führt seinen angekündigten Move aus (links → rechts)
  4. Debuff-Dauer auf Gegnern −1
  5. Neue Intents würfeln
  6. → Spielerrunde

Kampfende:
  - Alle Gegner tot (oder geflohen) → victory → Trigger onCombatEnd → Belohnungs-Screen
  - Spieler-HP ≤ 0 → defeat (vorher: Trigger onWouldDie für Artefakte/Tränke mit Wiederbelebung)
```

### 7.3 Schadensformel (Reihenfolge ist verbindlich!)
```
Angriffsschaden eines Angreifers A auf Ziel Z:
  1. basis = Kartenwert (inkl. Upgrade und dynamischer Werte wie „+1 pro Hitze“)
  2. + Kraft(A)                                   (Kraft kann negativ sein)
  3. × 0,75 wenn A „Geschwächt“ hat
  4. × 1,5  wenn Z „Verwundbar“ hat
  5. Modifikatoren aus Artefakten/Powers (Hooks modifyOutgoingDamage / modifyIncomingDamage)
  6. abrunden (floor), Minimum 0
  7. Z „Körperlos“ (intangible) → auf 1 begrenzen
  8. Block von Z zieht ab; Rest reduziert HP
  9. Trigger: onDamageDealt / onHpLost / onBlockBroken / Dornen

Nicht-Angriffs-Schaden (Brand, Dornen, Karten wie „Inferno“ mit Vermerk 'raw'):
  - ignoriert Kraft/Geschwächt, Verwundbar gilt NUR bei Angriffen und Karteneffekten mit Tag 'attackLike'

Block-Formel:
  basis + Gewandtheit(dexterity), × 0,75 bei „Zerbrechlich“ (frail), floor, min 0
```
Die im Kartentext angezeigte Zahl muss **live** diese Formel widerspiegeln (grün = erhöht, rot = verringert), bezogen auf das aktuell anvisierte Ziel.

### 7.4 Status-Effekte
| ID | Name (DE) | Wirkung | Abbau |
|---|---|---|---|
| strength | Kraft | +X Angriffsschaden je Treffer | dauerhaft im Kampf |
| dexterity | Gewandtheit | +X Block je Blockkarte | dauerhaft im Kampf |
| vulnerable | Verwundbar | erhält 50 % mehr Angriffsschaden | −1 pro Runde |
| weak | Geschwächt | verursacht 25 % weniger Angriffsschaden | −1 pro Runde |
| frail | Zerbrechlich | erhält 25 % weniger Block | −1 pro Runde |
| burn | Brand | verliert X HP zu Rundenbeginn, dann −1 | −1 pro Runde |
| thorns | Dornen | Angreifer erleidet X Schaden pro Treffer | dauerhaft |
| heat | Hitze | Ressource der Runenschmiedin (siehe 10.1) | wird am Rundenende halbiert (abrunden) |
| ritual | Ritual | +X Kraft am Ende jeder eigenen Runde | dauerhaft |
| artifact | Bannrune | blockiert den nächsten Debuff, −1 | pro geblocktem Debuff |
| intangible | Körperlos | aller Schaden/HP-Verlust auf 1 begrenzt | −1 pro Runde |

Debuffs, die in derselben Runde angewendet werden, in der sie abgebaut würden, dürfen nicht sofort verfallen: Abbau passiert am **Ende der eigenen Runde des Trägers** (Spieler: nach Spielerrunde, Gegner: nach Gegnerrunde).

### 7.5 Gegner-KI
- **weighted:** Moves nach Gewichten würfeln (Stream 'enemyAi'), kein Move öfter als `maxRepeat` hintereinander.
- **cycle:** feste Reihenfolge, optional zufälliger Startpunkt.
- **script:** registrierte Funktion `(enemy, combat, rng) => moveId` für Bosse und Spezialgegner (Phasen, HP-Schwellen, Aufteilen).
- Intents sind **immer ehrlich**: Der angezeigte Schaden = tatsächlicher Schaden nach Formel (inkl. Kraft des Gegners, Geschwächt, Verwundbar des Spielers).

---

## 8. Effekt- & Trigger-System

### 8.1 Deklarative Effekte (EffectSpec)
Karten, Gegner-Moves, Tränke, Artefakte und Events verwenden dieselben Bausteine:

```ts
export type EffectSpec =
  | { type: 'damage'; amount: ValueExpr; hits?: number; target?: TargetMode; tags?: string[] }
  | { type: 'block'; amount: ValueExpr; target?: 'self' }
  | { type: 'applyStatus'; status: StatusId; stacks: ValueExpr; target: TargetMode | 'self' }
  | { type: 'draw'; count: ValueExpr }
  | { type: 'gainEnergy'; amount: ValueExpr }
  | { type: 'gainHeat'; amount: ValueExpr }
  | { type: 'consumeHeat'; store: string }           // speichert Menge in Kontextvariable
  | { type: 'heal'; amount: ValueExpr }
  | { type: 'loseHp'; amount: ValueExpr; target: TargetMode | 'self' }
  | { type: 'addCard'; cardId: CardId; to: 'hand' | 'draw' | 'discard'; count: number; upgraded?: boolean }
  | { type: 'discard'; count: number; choice: 'player' | 'random' }
  | { type: 'exhaustFromHand'; count: number; choice: 'player' | 'random' }
  | { type: 'upgradeInHand'; count: number | 'all'; choice: 'player' | 'random' }
  | { type: 'gainGold'; amount: ValueExpr }
  | { type: 'gainMaxHp'; amount: ValueExpr }
  | { type: 'conditional'; if: ConditionExpr; then: EffectSpec[]; else?: EffectSpec[] }
  | { type: 'repeat'; times: ValueExpr; effects: EffectSpec[] }
  | { type: 'script'; scriptId: string; params?: Record<string, number> };

export type ValueExpr =
  | number
  | { kind: 'perStatus'; status: StatusId; of: 'self' | 'target'; base: number; per: number }
  | { kind: 'var'; name: string; mul?: number; add?: number }     // z. B. verbrauchte Hitze
  | { kind: 'x'; mul?: number; add?: number }                      // X-Kosten-Karten
  | { kind: 'currentBlock'; mul?: number }
  | { kind: 'cardsInPile'; pile: 'hand' | 'draw' | 'discard' | 'exhaust'; mul?: number };

export type ConditionExpr =
  | { kind: 'targetHasStatus'; status: StatusId }
  | { kind: 'selfStatusAtLeast'; status: StatusId; value: number }
  | { kind: 'targetWillDie' }                   // „Wenn tödlich …“
  | { kind: 'hpBelowPercent'; percent: number };
```

**Regel:** Mindestens 90 % aller Karten müssen rein deklarativ umsetzbar sein. Für den Rest gibt es `script`-Effekte, registriert in `src/content/scripts/` mit eindeutiger ID.

### 8.2 Action-Queue
Effekte werden nicht direkt ausgeführt, sondern als Actions in eine **FIFO-Queue** gelegt. Trigger können neue Actions **ans Ende** oder **nach vorne** (für Reaktionen wie Dornen) einreihen. Die Queue wird abgearbeitet, bis sie leer ist. Schutz gegen Endlosschleifen: max. 1000 Actions pro Command → Fehler werfen und loggen.

Nach jeder Action wird geprüft: Gegner tot? Spieler tot? Kampf vorbei? → Queue leeren und Kampf beenden.

### 8.3 Trigger-Hooks
Artefakte, Powers und Status registrieren Handler für diese Hooks (feste Reihenfolge: Status → Powers → Artefakte in Erhaltsreihenfolge):

```
onCombatStart, onCombatEnd,
onPlayerTurnStart, onPlayerTurnEnd, onEnemyTurnStart, onEnemyTurnEnd,
onCardPlayed(card), onCardDrawn(card), onCardExhausted(card), onCardDiscarded(card),
onAttackPlayed, onSkillPlayed, onPowerPlayed,
modifyOutgoingDamage(ctx) → number, modifyIncomingDamage(ctx) → number, modifyBlock(ctx) → number,
onDamageDealt(ctx), onHpLost(entity, amount), onBlockGained, onBlockBroken,
onStatusApplied(entity, status), onHeatGained(amount), onHeatLost(amount),
onEnemyDied(enemy), onWouldDie(entity) → boolean (Rettung),
onShuffle, onGoldGained, onRestSite, onShopEnter, onRewardGenerated, onPotionUsed
```

---

## 9. Run-Struktur

### 9.1 Kartengenerierung (pro Schicht)
- Raster: **15 Stockwerke** × **7 Spalten**. Danach Boss-Knoten (Stockwerk 16).
- **6 Pfade** starten auf zufälligen Spalten in Stockwerk 1 (mind. 2 unterschiedliche Startspalten) und laufen nach oben, je Schritt Spalte −1/0/+1.
- Pfade dürfen sich **nicht kreuzen** (Kanten dürfen sich nicht überschneiden).
- Knoten, die von keinem Pfad erreicht werden, werden entfernt.

**Raumtypen & Regeln:**
| Typ | Symbol | Gewicht | Regeln |
|---|---|---|---|
| Kampf | ⚔ | 45 % | Stockwerk 1 immer Kampf |
| Event | ? | 22 % | – |
| Elite | ☠ | 8 % (Tiefenstufe ≥1: 10 %) | nicht in Stockwerk 1–5 |
| Rast | 🔥 | 12 % | nicht in Stockwerk 1–5; nicht Stockwerk 14 |
| Shop | $ | 5 % | – |
| Schatz | ◆ | – | Stockwerk 9 immer Schatz |
| (Rest) | | Rest → Kampf | Stockwerk 15 immer Rast |

Zusatzregeln: Elite, Rast und Shop nicht direkt hintereinander auf demselben Pfad. Knoten mit mehreren Ausgängen dürfen nicht zwei gleiche Spezialtypen als direkte Nachfolger haben.

**Symbole im Code:** Nutze eigene SVG-Icons statt Emojis. Emojis hier nur zur Veranschaulichung.

### 9.2 Kampfbelohnungen
| Raum | Gold | Karte | Trank | Artefakt |
|---|---|---|---|---|
| Kampf | 10–20 | 1 aus 3 | Chance (s. u.) | – |
| Elite | 25–35 | 1 aus 3 (bessere Seltenheit) | Chance | 1 (Seltenheit gewürfelt) |
| Boss | 95–105 | 1 aus 3, **nur selten** | – | 1 aus 3 Boss-Artefakten |

**Seltenheit der Kartenbelohnung (normaler Kampf):** Selten 3 %, Ungewöhnlich 37 %, Gewöhnlich 60 %.
**Elite:** Selten 10 %, Ungewöhnlich 40 %, Gewöhnlich 50 %.
**Pity-Mechanik:** Startwert `rareCardOffset = −5 %`. Jede angebotene gewöhnliche Karte erhöht den Offset um +1 % (max. +40 %). Wird eine seltene Karte angeboten → Offset zurück auf −5 %. Offset wird auf die Selten-Chance addiert.
**Keine Duplikate** innerhalb eines Angebots.
**Verbesserte Karten:** In Schicht 2: 25 % Chance, dass eine nicht-seltene angebotene Karte bereits verbessert ist; Schicht 3: 50 %.
**Überspringen** ist immer erlaubt.

**Trank-Chance:** Start 40 %. Kein Trank gedroppt → +10 %, Trank gedroppt → −10 %. Nur wenn freier Slot oder Spieler ersetzen will.

### 9.3 Rastplatz
Wahl (genau eine):
- **Ausruhen:** 30 % der max. HP heilen.
- **Schmieden:** Eine Karte dauerhaft verbessern (Vorschau alt/neu nebeneinander).
- (Später per Artefakt freischaltbar: „Entschlacken“ – Karte entfernen, „Graben“ – Artefakt finden.)

### 9.4 Shop
- 5 Charakterkarten (2 Angriff, 2 Fertigkeit, 1 Kraft), 2 neutrale Karten, 3 Artefakte, 3 Tränke.
- Eine zufällige Karte im Angebot ist **50 % reduziert**.
- **Karte entfernen:** 75 Gold, jedes weitere Mal +25 Gold (Zähler gilt für den ganzen Run).
- Preise (±10 % Zufall): Karte gewöhnlich 50, ungewöhnlich 75, selten 150; Artefakt gewöhnlich 150, ungewöhnlich 250, selten 300; Trank 50/75/100.

### 9.5 Events
Ein Event = Titel, Text, 2–4 Optionen; jede Option hat Bedingungen (z. B. Gold ≥ 50), Kosten und Ergebnis (EffectSpecs + evtl. Folge-Seite). Events werden pro Schicht aus einem Pool ohne Wiederholung im Run gezogen. Manche „?“-Räume werden stattdessen Kampf (10 %), Shop (3 %) oder Schatz (2 %); die Chance auf Kampf steigt pro Event ohne Kampf um +10 %.

### 9.6 Schatz
1 Artefakt (Seltenheit: 50 % gewöhnlich, 33 % ungewöhnlich, 17 % selten) + 25–50 Gold.

### 9.7 Nach dem Boss
Volle Heilung auf max. HP beim Betreten der nächsten Schicht (Tiefenstufe ≥5: nur 75 % des fehlenden HP).

---

## 10. Inhalte

### 10.1 Charakter: Die Runenschmiedin
- 75 HP, Start-Artefakt **Schmiedeherz** (nach jedem Kampf 6 HP heilen).
- **Kernmechanik „Hitze“:** Viele Karten erzeugen Hitze (Status `heat` auf dem Spieler). Andere Karten **verbrauchen** Hitze („Abschrecken“) für starke Effekte. Hitze wird am Ende jeder Spielerrunde **halbiert (abgerundet)**. Damit entsteht die Abwägung: Hitze aufbauen und sofort nutzen vs. über Runden halten mit Verlust.
- **Startdeck (10 Karten):** 5× Schlag, 4× Parade, 1× Funkenschlag.

### 10.2 Kartenliste (Runenschmiedin) – 48 Karten

Format: **Name** | Typ | Kosten | Effekt | Verbessert (+)
Typen: A = Angriff, F = Fertigkeit, K = Kraft (Power, bleibt den Kampf über aktiv)

**Starter**
| # | Name | Typ | Kosten | Effekt | + |
|---|---|---|---|---|---|
| 1 | Schlag | A | 1 | 6 Schaden | 9 Schaden |
| 2 | Parade | F | 1 | 5 Schild | 8 Schild |
| 3 | Funkenschlag | A | 1 | 5 Schaden, +2 Hitze | 7 Schaden, +3 Hitze |

**Gewöhnlich (18)**
| # | Name | Typ | Kosten | Effekt | + |
|---|---|---|---|---|---|
| 4 | Hammerschlag | A | 2 | 12 Schaden, 2 Verwundbar | 15 Schaden, 3 Verwundbar |
| 5 | Doppelhieb | A | 1 | 2× 4 Schaden | 2× 6 Schaden |
| 6 | Glutstoß | A | 1 | 7 Schaden, +1 Hitze | 10 Schaden, +2 Hitze |
| 7 | Rundschlag | A | 1 | 5 Schaden an ALLE | 8 an ALLE |
| 8 | Schildstoß | A | 1 | Schaden = dein aktueller Schild | Kosten 0 |
| 9 | Schlackewurf | A | 1 | 6 Schaden, 1 Geschwächt | 8 Schaden, 2 Geschwächt |
| 10 | Funkenregen | A | 1 | 3× 3 Schaden an zufällige Gegner | 4× 3 |
| 11 | Glühende Klinge | A | 1 | 5 Schaden +1 pro Hitze | +2 pro Hitze |
| 12 | Kerbe | A | 0 | 3 Schaden, 1 Verwundbar | 5 Schaden, 2 Verwundbar |
| 13 | Amboss-Deckung | F | 1 | 8 Schild | 11 Schild |
| 14 | Blasebalg | F | 1 | +3 Hitze, ziehe 1 | +4 Hitze, ziehe 1 |
| 15 | Abkühlen | F | 1 | Verbrauche alle Hitze: 5 Schild + 2 pro Hitze | + 3 pro Hitze |
| 16 | Nachschärfen | F | 0 | Verbessere 1 Handkarte für diesen Kampf | + ziehe 1 |
| 17 | Werkzeugwechsel | F | 1 | Ziehe 2, wirf 1 ab | Kosten 0 |
| 18 | Stählerne Haut | F | 1 | 6 Schild, nächste Runde 4 Schild | 8 / 6 |
| 19 | Vorbereitung | F | 0 | Nächste Runde +1 Glut. Erschöpfen | + ziehe 1 |
| 20 | Eisenwall | F | 2 | 13 Schild | 17 Schild |
| 21 | Aufheizen | F | 0 | +2 Hitze | +3 Hitze |

**Ungewöhnlich (18)**
| # | Name | Typ | Kosten | Effekt | + |
|---|---|---|---|---|---|
| 22 | Esse | K | 1 | Rundenbeginn: +2 Hitze | +3 Hitze |
| 23 | Härten | K | 1 | Immer wenn du Hitze verlierst: 1 Schild pro verlorenem Punkt | Kosten 0 |
| 24 | Schmiedefeuer | F | 1 | Verdopple deine Hitze. Erschöpfen | ohne Erschöpfen |
| 25 | Abschreckstoß | A | 2 | Verbrauche alle Hitze: 8 Schaden + 3 pro Hitze | + 4 pro Hitze |
| 26 | Runengravur | K | 2 | +2 Kraft | +3 Kraft |
| 27 | Funkenflug | K | 1 | Wenn du eine Fertigkeit spielst: 2 Schaden an zufälligen Gegner | 3 Schaden |
| 28 | Wuchtige Kette | A | 2 | 3× 5 Schaden | 3× 7 |
| 29 | Spiegelnde Platte | F | 2 | 10 Schild, +3 Dornen | 14 Schild, +4 Dornen |
| 30 | Glutreserve | F | 1 | 6 Schild. Dein Schild verfällt nächste Runde nicht | 9 Schild |
| 31 | Hitzestau | F | X | +3 Hitze pro ausgegebener Glut | +4 pro Glut |
| 32 | Glühende Rüstung | K | 2 | Rundenende: Schild in Höhe deiner Hitze | Kosten 1 |
| 33 | Überschlag | A | 1 | 9 Schaden. Ist das Ziel verwundbar: +1 Glut | 12 Schaden |
| 34 | Schrottregen | A | 2 | 10 Schaden an ALLE, 1 Geschwächt an ALLE | 14 Schaden |
| 35 | Werkstück | F | 1 | Lege 2 „Rohling“ auf die Hand | 3 Rohlinge |
| 36 | Kühles Kalkül | F | 1 | Ziehe 2. Hast du ≥5 Hitze: ziehe 1 weitere | Ziehe 3 (+1) |
| 37 | Lodern | A | 1 | 4 Schaden, 3 Brand | 6 Schaden, 4 Brand |
| 38 | Zunder | F | 1 | 5 Brand | 7 Brand |
| 39 | Scharnierwache | F | 1 | 7 Schild. Nächster Angriff diese Runde kostet 0 | 10 Schild |

**Selten (9)**
| # | Name | Typ | Kosten | Effekt | + |
|---|---|---|---|---|---|
| 40 | Meisterwerk | A | 3 | 30 Schaden. Kostet 1 weniger pro 5 Hitze | 40 Schaden |
| 41 | Unauslöschlich | K | 3 | Hitze wird am Rundenende nicht mehr halbiert | Kosten 2 |
| 42 | Titanenhammer | A | 2 | 20 Schaden. Wenn tödlich: dauerhaft +3 max. HP. Erschöpfen | 26 Schaden, +4 max. HP |
| 43 | Feuerseele | K | 2 | Immer wenn du Hitze erhältst: 1 Schaden an ALLE | Kosten 1 |
| 44 | Kettenreaktion | F | 1 | Wiederhole den zuletzt in dieser Runde gespielten Angriff | Kosten 0 |
| 45 | Zerschmettern | A | 3 | 16 Schaden an ALLE, 2 Verwundbar an ALLE | 22 Schaden |
| 46 | Letzte Glut | F | 0 | +2 Glut. Erschöpfen | +3 Glut |
| 47 | Runenbarriere | K | 3 | Dein Schild verfällt nicht mehr am Rundenbeginn | Kosten 2 |
| 48 | Inferno | A | 2 | Verbrauche alle Hitze: 2× Hitze Schaden an ALLE | 3× Hitze |

**Generierte / Status- / Fluchkarten**
| Name | Typ | Kosten | Effekt |
|---|---|---|---|
| Rohling | A | 0 | 4 Schaden. Erschöpfen |
| Schlacke | Status | – | Unspielbar. Flüchtig |
| Wunde | Status | – | Unspielbar |
| Verbrennung | Status | – | Unspielbar. Rundenende auf der Hand: 2 Schaden an dich |
| Rostfluch | Fluch | – | Unspielbar. Kann nur im Shop entfernt werden |
| Bleierne Last | Fluch | – | Unspielbar. Rundenbeginn auf der Hand: −1 Glut |

**Neutrale Karten (8, im Shop/Events):** Erste Hilfe (F, 1: heile 6, Erschöpfen), Glücksgriff (F, 0: ziehe 1), Spiegelbild (F, 1: nächste Karte wird doppelt gespielt, Erschöpfen), Rauchbombe (F, 1: fliehe aus nicht-Boss-Kampf ohne Belohnung), Schweres Werkzeug (A, 2: 14 Schaden), Kopfnuss (A, 0: 4 Schaden, Erschöpfen), Blitzableiter (F, 1: 12 Schild, Erschöpfen), Weitblick (F, 1: sieh die oberen 3 Karten, nimm 1 auf die Hand).

> Die Zahlen sind Startwerte. Nach M11 (Simulator) werden sie datengetrieben angepasst. Du darfst **keine** neuen Karten einführen, bevor diese 48 funktionieren und getestet sind.

### 10.3 Gegner

**Schicht 1 – „Die Stollen“**
| Gegner | HP | Moves | KI |
|---|---|---|---|
| Grubenratte | 12–15 | Beißen: 6 Schaden · Kratzen: 3 Schaden + 1 Geschwächt | weighted 70/30, maxRepeat 2 |
| Schlammling (klein) | 10–13 | Spucken: 4 Schaden + 1 Schlacke in Ablage · Klatschen: 6 Schaden | weighted 50/50 |
| Schlammling (groß) | 28–32 | Wucht: 11 Schaden · Schlammflut: 2 Schlacke in Ablage | cycle; **Script:** bei ≤50 % HP teilt er sich (stirbt, spawnt 2 kleine mit je seinen aktuellen HP/2) |
| Stollenkäfer | 40–44 | Panzern: +9 Block · Rammen: 12 Schaden | cycle A-B, Start zufällig |
| Kobold-Plünderer | 20–24 | Stehlen: 8 Schaden + stiehlt 15 Gold · Flucht (Runde 4): verlässt Kampf mit Gold | script; getötet → Gold zurück |
| Pilzhüter | 22–26 | Sporen: 2 Verwundbar · Schlag: 7 Schaden | cycle, beginnt mit Sporen |
| Tunnelgräber | 28–32 | Eingraben: +12 Block, +2 Kraft · Klaue: 8 Schaden | weighted 35/65, maxRepeat 1 für Eingraben |

**Begegnungen Schicht 1:**
- *Leicht (erste 3 Kämpfe):* 1 Stollenkäfer · 2 Grubenratten · 1 großer Schlammling · 1 Pilzhüter + 1 Grubenratte
- *Schwer (danach):* 3 kleine Schlammlinge · Kobold + Grubenratte · Tunnelgräber + Pilzhüter · 2 Stollenkäfer · großer Schlammling + 2 Ratten
- Keine Begegnung zweimal direkt hintereinander.

**Eliten Schicht 1:**
| Elite | HP | Verhalten |
|---|---|---|
| Vorarbeiter-Golem | 82–86 | Runde 1: Aufladen (buff). Dann: Stampfen 24 Schaden · Hieb 12 Schaden + 1 Zerbrechlich (abwechselnd). Passiv „Zorn“: +1 Kraft, wenn der Spieler eine Fertigkeit spielt |
| Laternenschwestern (2 Gegner) | je 38–42 | Eine greift an (9 Schaden), die andere schützt (+10 Block auf Schwester) – tauschen jede Runde. Stirbt eine: Überlebende +3 Kraft |
| Kristallwächter | 70–74 | Start: 3 Dornen. Splitter: 4× 3 Schaden · Verhärten: +15 Block, +1 Dornen |

**Boss Schicht 1: Der Schlackenkönig** (HP 200, Tiefenstufe ≥9: 220)
- Zyklus: *Schlackenflut* (3 Schlacke in Nachziehstapel) → *Hammer des Königs* (22 Schaden) → *Krone schmieden* (+15 Block, +2 Kraft) → wiederholen.
- Phase 2 bei ≤50 % HP: entfernt alle Debuffs, Intent „Zornausbruch“ (6× 4 Schaden) wird in den Zyklus eingefügt.

**Schicht 2 – „Die Kristallhallen“** (HP-Niveau ca. ×1,6 von Schicht 1)
- Kristallspinne (45–50): Netz (2 Geschwächt) · Biss 13.
- Resonanzgeist (38–42, startet mit 1 Körperlos jede 3. Runde): Heulen (2 Verwundbar an Spieler, +1 Kraft an alle Gegner) · Schlag 10.
- Glaswurm (60–65): Schlingen 2× 8 · Häuten (+20 Block).
- Schmugglerpaar (2× 35): Messer 7 + stiehlt 20 Gold · Rauch (Block 12).
- Echo-Kobold (30): kopiert den Intent des stärksten anderen Gegners.
- **Eliten:** Kristalldrache (140; Odem 18 an Spieler + 2 Wunden), Spiegelritter (110; reflektiert 50 % des Schadens einer Karte pro Runde), Hexenzirkel (3× 45; heilen sich gegenseitig).
- **Boss: Die Facettenkönigin** (HP 300): wechselt jede Runde ihre „Facette“ (Angriff / Verteidigung / Fluch) – wird im Intent angezeigt. Ab 50 %: 2 Kristalldrohnen (25 HP) beschwören.

**Schicht 3 – „Das Glutherz“** (HP-Niveau ca. ×2,4 von Schicht 1)
- Lavageborener (80–85): Eruption 20 · Magma-Schild (Block 15, 3 Dornen).
- Aschenpriester (60): Ritual 3 (Kraft pro Runde) · Feuerpeitsche 3× 6.
- Obsidiangolem (110): Langsam (jede 2. Runde Angriff 30).
- Glutschwarm (3× 20): je 5 Schaden, bei Tod 3 Brand auf Spieler.
- **Eliten:** Wächter des Herzens (220), Zwillingsflammen (2× 110), Der Vergessene Schmied (180; spielt eigene „Karten“ aus einem sichtbaren Mini-Deck).
- **Finalboss: Das Glutherz** (HP 500, 3 Phasen): Phase 1 Pulse (Schaden steigt jede Runde +3), Phase 2 legt Verbrennungskarten in das Deck, Phase 3 „Überhitzung“: Spieler erhält jede Runde 3 Hitze, das Herz erleidet Schaden in Höhe der Spieler-Hitze bei Rundenende (Konterspiel zur Kernmechanik!).

> Schicht 2/3: Moves und Zahlen sind als Rahmen vorgegeben. Du detaillierst sie in M10 nach denselben Mustern wie Schicht 1 und dokumentierst sie in `CONTENT_GUIDE.md`.

### 10.4 Artefakte (24)
| Name | Seltenheit | Wirkung |
|---|---|---|
| Schmiedeherz | Starter | Nach jedem Kampf 6 HP heilen |
| Zündholzschachtel | Gewöhnlich | Kampfbeginn: +3 Hitze |
| Eisenring | Gewöhnlich | Kampfbeginn: +1 Kraft |
| Ankerkette | Gewöhnlich | Runde 1: +10 Schild |
| Schleifstein | Gewöhnlich | Beim Aufheben: verbessere 2 zufällige Angriffe |
| Polierstein | Gewöhnlich | Beim Aufheben: verbessere 2 zufällige Fertigkeiten |
| Ledergeldbeutel | Gewöhnlich | +10 % Gold aus Kämpfen |
| Murmelsack | Gewöhnlich | Kampfbeginn: 1 Verwundbar auf ALLE Gegner |
| Kupfermünze | Gewöhnlich | Sofort 100 Gold |
| Grubenlampe | Gewöhnlich | Kampfbeginn: ziehe 2 zusätzliche Karten |
| Rußige Handschuhe | Ungewöhnlich | Jeder 3. Angriff pro Runde: +1 Glut |
| Blasebalgherz | Ungewöhnlich | Erste Fertigkeit pro Runde: +2 Hitze |
| Kühlkristall | Ungewöhnlich | Wenn du Hitze verbrauchst: ziehe 1 (1× pro Runde) |
| Dornenkranz | Ungewöhnlich | Kampfbeginn: 3 Dornen |
| Taschensanduhr | Ungewöhnlich | Jede 3. Runde: +1 Glut, ziehe 1 |
| Glücksfeder | Ungewöhnlich | Kartenbelohnungen haben 4 statt 3 Karten |
| Silberamboss | Selten | Rastplatz: Schmieden verbessert 2 Karten |
| Phönixfeder | Selten | Einmalig: bei Tod stattdessen 30 % max. HP heilen |
| Glutkern | Selten | Hitze wird am Rundenende nur um ⅓ reduziert statt halbiert |
| Meisterhammer | Selten | Angriffe mit Kosten ≥2 verursachen +5 Schaden |
| Runenkrone | Boss | +1 Glut pro Runde. Kartenbelohnungen: nur 2 Karten |
| Schwarzes Herz | Boss | +1 Glut pro Runde. Rastplätze: kein Ausruhen |
| Ewige Esse | Boss | Ersetzt Schmiedeherz: nach Kampf 12 HP heilen, Kampfbeginn +2 Hitze |
| Kettenhemd des Titanen | Boss | +1 Glut pro Runde. Jede Runde: erste gespielte Karte kostet 1 mehr |

### 10.5 Tränke (10)
Heiltrank (heile 20 % max. HP) · Feuertrank (20 Schaden an 1 Gegner) · Schildtrank (12 Schild) · Krafttrank (+2 Kraft) · Gluttrank (+2 Glut) · Rußphiole (3 Geschwächt an ALLE) · Klarsichttrank (ziehe 3) · Hitzetrank (+6 Hitze) · Gifttopf (6 Brand) · Flaschengeist (zufällige seltene Karte auf die Hand, kostet 0 diese Runde).
Tränke sind im Kampf jederzeit in der Spielerrunde nutzbar, außerhalb nur Heiltrank. Abwerfen jederzeit.

### 10.6 Events (Beispiele, je Schicht mind. 6 – du ergänzt nach diesem Muster)
1. **Der verlassene Amboss:** [Schmieden] verbessere 1 Karte · [Einschmelzen] entferne 1 Karte, verliere 6 HP · [Weitergehen].
2. **Flüsternde Ader:** [Graben] 50 % Chance auf 75 Gold, sonst 10 Schaden · [Lauschen] erhalte Fluch „Rostfluch“ + zufälliges seltenes Artefakt · [Gehen].
3. **Händler im Dunkeln:** [Kaufen] 60 Gold → zufälliger ungewöhnlicher Trank + Karte · [Ausrauben] Kampf gegen 2 Schmuggler, danach Doppelbelohnung · [Gehen].
4. **Heiße Quelle:** [Baden] heile 25 HP · [Abfüllen] erhalte Heiltrank · [Kosten] +5 max. HP, aber Fluch „Bleierne Last“.
5. **Verschüttete Kameraden:** [Helfen] verliere 8 HP, erhalte 1 zufällige ungewöhnliche Karte · [Ignorieren] –.
6. **Die Runenwand:** [Entziffern] wähle 1 aus 3 Karten deines Charakters, alle verbessert · [Zerschlagen] 30 Gold.

---

## 11. Schwierigkeit & Skalierung

### 11.1 Innerhalb eines Runs
- Schicht 1 → 2 → 3: Gegner-HP ca. ×1,6 / ×2,4, Schaden ca. ×1,4 / ×1,8 (bereits in den Werten enthalten, nicht zusätzlich multiplizieren).
- Innerhalb einer Schicht: erste 3 Kämpfe aus „leicht“-Pool, danach „schwer“-Pool.

### 11.2 Tiefenstufen (Ascension, 0–10, freischaltbar)
Jede Stufe enthält alle vorherigen:
1. Mehr Eliten auf der Karte
2. Normale Gegner +10 % Schaden
3. Eliten +10 % Schaden
4. Bosse +10 % Schaden
5. Nach Boss nur 75 % des fehlenden HP geheilt
6. Start mit 90 % HP
7. Normale Gegner +10 % HP
8. Eliten +10 % HP
9. Bosse +10 % HP, neue Boss-Moves
10. Start mit Fluch „Rostfluch“ im Deck

### 11.3 Meta-Progression (leicht, kein Pay-to-Win)
- Nach jedem Run: Punkte basierend auf Stockwerken, Eliten, Bossen.
- Freischaltungen: zusätzliche Karten in den Belohnungspool (2. Satz 10 Karten), neue Artefakte, Tiefenstufen, später zweiter Charakter (Platzhalter, nicht in dieser Version).
- Kompendium: alle gesehenen Karten/Gegner/Artefakte.

---

## 12. UI/UX, Grafik, Audio

### 12.1 Screens
Hauptmenü (Neuer Run / Fortsetzen / Kompendium / Einstellungen / Beenden) · Charakterwahl (+ Seed-Eingabe optional, Tiefenstufe) · Karte · Kampf · Belohnung · Shop · Rast · Event · Schatz · Deck-Ansicht (Overlay, jederzeit) · Game Over (Statistik) · Sieg · Einstellungen · Kompendium.

### 12.2 Kampf-Screen Layout (1920×1080 Referenz, skaliert responsiv bis 1280×720)
```
┌──────────────────────────────────────────────────────────────┐
│ HP 62/75 | Gold 143 | Tränke [●][●][ ] | Artefakte ▢▢▢▢  | Schicht 1 · Stockwerk 6 | ⚙ │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│     [Spieler]                         [Gegner1] [Gegner2]    │
│     HP-Balken + Schild               Intent-Icon + Zahl      │
│     Status-Icons                     HP-Balken, Status       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ (Glut 3/3)  [Nachzieh 12]    ── Hand (Fächer) ──    [Ablage 4] [Erschöpft 1]  [ZUG BEENDEN] │
└──────────────────────────────────────────────────────────────┘
```

### 12.3 Interaktion
- Karte hovern → vergrößern, Tooltip mit Keywords.
- Karte ziehen (Drag) oder klicken → bei Ziel-Karten erscheint ein Zielpfeil; Loslassen auf Gegner = spielen. Rechtsklick/Esc = abbrechen.
- Nicht spielbare Karten (zu wenig Glut) sind ausgegraut.
- Tastatur: 1–9 Karte wählen, Q/W/E Ziel, Leertaste/E = Zug beenden.
- Intents hovern → exakter Text („Greift für 14 Schaden an“).
- Stapel anklicken → Inhalt anzeigen (Nachziehstapel **sortiert**, nicht in echter Reihenfolge!).

### 12.4 Grafikstil
- „Dunkle Mine mit glühender Runenschrift“: Farbpalette Anthrazit, Kupfer, Glutorange, Kristallblau (Schicht 2), Lavarot (Schicht 3). Design-Tokens in `tokens.css`.
- Karten: CSS-Rahmen nach Typ (Angriff = Kupfer, Fertigkeit = Stahlblau, Kraft = Gold), Seltenheit als Edelstein-Farbe. Kosten oben links in Glut-Kugel. Bildfeld = prozedurales SVG-Motiv (einfache Formen, abhängig von Karten-ID gehasht) – kein Platzhalter-Grau.
- Gegner: stilisierte SVG-Silhouetten aus geometrischen Formen, mit Idle-Animation (leichtes Atmen), Treffer-Flash, Tod-Auflösung.
- Animationen: Karte fliegt zum Ziel, Schadenszahlen schweben, Bildschirm-Shake bei ≥20 Schaden, Schild-Glanz, Hitze als Glut-Partikel um den Spieler.

### 12.5 Audio (prozedural, WebAudio)
Kartenziehen, Karte spielen, Treffer (je nach Stärke), Block, Hitze, Sieg, Niederlage, Button-Klick. Lautstärke-Regler Master/SFX. Optional: einfache generative Ambient-Schleife pro Schicht.

### 12.6 Einstellungen & Barrierefreiheit
Lautstärke, Animationsgeschwindigkeit (normal/schnell/sofort), Bildschirm-Shake an/aus, Schriftgröße, Farbenblind-Modus (Intents zusätzlich mit Form, nicht nur Farbe), Run abbrechen.

---

## 13. Speichern, RNG, Tests, Balancing

### 13.1 RNG
- Eigener seedbarer PRNG (z. B. `sfc32` oder `xoshiro128**`), Seed aus Text per Hash (`cyrb128`).
- **Getrennte Streams** (siehe `RngStream`), damit z. B. eine andere Kampfentscheidung nicht die Kartenbelohnungen verändert.
- RNG-Zustände sind Teil des `RunState` und werden gespeichert.
- **Niemals** `Math.random()` im Core. (ESLint-Regel `no-restricted-properties` dafür einrichten.)

### 13.2 Speichern
- Autosave beim Betreten jedes Knotens und nach jeder Belohnungsauswahl (nicht mitten im Kampf; beim Fortsetzen startet der Kampf neu mit gleichem RNG-Zustand → identischer Kampfbeginn).
- JSON mit `schemaVersion` + Migrationsfunktionen.
- Speicher-Interface `SaveStorage { load(); save(); clear(); }` mit localStorage-Implementierung.
- Meta-Progression separat gespeichert.

### 13.3 Tests (Pflicht)
- **Unit-Tests** für: RNG-Determinismus, Mischen, Ziehen/Nachmischen, Schadensformel (alle Kombinationen Kraft/Geschwächt/Verwundbar/Block), Status-Abbau-Zeitpunkte, jede der 48 Karten (mindestens 1 Test pro Karte + Upgrade), jeder Gegner-KI-Typ, Map-Regeln, Belohnungs-Wahrscheinlichkeiten (statistisch über 10.000 Würfe mit Toleranz), Shop-Preise, Speichern/Laden-Roundtrip.
- **Golden-Seed-Tests:** Für Seeds `"TEST1"`, `"TEST2"`: Karte von Schicht 1 als Snapshot; 3 festgelegte Kampfabläufe als Snapshot der Event-Liste.
- **Invarianten-Tests** (nach jedem Command prüfen, im Dev-Modus immer aktiv): HP ≤ maxHp, keine Karte in zwei Stapeln gleichzeitig, Summe aller Stapel = Deckgröße + generierte − entfernte, keine negativen Stacks, Glut ≥ 0.
- UI: Smoke-Tests der Screens mit React Testing Library (rendern ohne Fehler).

### 13.4 Balancing-Simulator (`npm run sim`)
- Headless-Bot spielt komplette Runs nur über die Core-API.
- Bot-Strategie (einfach, aber vernünftig): Kartenwahl nach Punktetabelle + Synergie-Bonus mit Hitze-Karten; im Kampf gierige Suche (alle Karten-Reihenfolgen bis Tiefe 3 bewerten: Schaden, verhinderter Schaden, Tödlichkeit).
- Ausgabe `sim-report.md`: Siegquote gesamt und pro Schicht, durchschnittlicher HP-Verlust pro Begegnung, Pick-Rate und Siegquote pro Karte, gefährlichste Gegner, durchschnittliche Kampfdauer in Runden.
- **Zielwerte (Tiefenstufe 0, Bot):** Schicht 1 überlebt ≥ 70 %, Gesamtsieg 15–30 %. Keine Begegnung mit durchschnittlichem HP-Verlust > 35 % max. HP (außer Bosse/Eliten). Keine Karte mit Pick-Rate < 3 % oder Siegquoten-Ausreißer > +15 Prozentpunkte.
- Anpassungen erfolgen nur in `src/content/`, niemals Logik-Hacks.

---

## 14. Meilensteine

Jeder Meilenstein endet mit: grünen Tests, `typecheck` ohne Fehler, `lint` ohne Fehler, aktualisierter `PROGRESS.md`, Git-Commit (`feat(m3): …`).

| # | Meilenstein | Inhalt | Abnahmekriterien |
|---|---|---|---|
| **M0** | Projekt-Setup | Vite + React + TS strict, ESLint, Prettier, Vitest, Zustand, Ordnerstruktur, npm-Scripts, `docs/` angelegt, Leerseite mit Titel „Runenschacht“ | `npm run dev` zeigt Titel; `npm test` läuft (1 Dummy-Test); `typecheck` und `lint` fehlerfrei |
| **M1** | Core-Fundament | Alle Typen aus Abschnitt 6, RNG mit Streams, Seed-Hashing, Stapel-Logik (ziehen, mischen, ablegen, erschöpfen), Karteninstanzen mit UIDs | RNG-Determinismus-Tests; Ziehen mit Nachmischen getestet; Invarianten-Checker existiert |
| **M2** | Kampf-Engine headless | Kampfablauf 7.2, Schadensformel 7.3, Block, Status 7.4, Action-Queue, Command→Events, Sieg/Niederlage | Ein Test spielt einen kompletten Kampf (Startdeck vs. 2 Ratten) per Commands durch bis Sieg; alle Formel-Tests grün |
| **M3** | Effektsystem & Karten | EffectSpec/ValueExpr/Condition vollständig, Skript-Registry, Trigger-Hooks, Hitze-Mechanik, alle 48 Karten + Status/Fluch-Karten, Upgrades | Pro Karte ≥1 Test (+Upgrade); Kartentext-Renderer mit Platzhaltern liefert korrekte Zahlen |
| **M4** | Gegner & KI Schicht 1 | Alle Schicht-1-Gegner, Eliten, Boss inkl. Skripten (Teilen, Flucht, Phasen), Begegnungspools, ehrliche Intents | KI-Tests pro Typ; Schlammling-Teilung getestet; Boss-Phase-2 getestet |
| **M5** | Kampf-UI | Kampf-Screen komplett (12.2/12.3), Karten-Komponente, Hand-Fächer, Zielpfeil, Intents, HP/Schild, Status-Tooltips, Stapel-Ansichten, Event-Player mit Grundanimationen | Ein Kampf ist mit Maus vollständig spielbar; keine Konsolenfehler; Eingaben während Animationen gesperrt |
| **M6** | Belohnungen & Deck | Belohnungs-Screen (Gold, Kartenwahl mit Pity, Tränke), Deck-Ansicht, Trank-Leiste + Nutzung | Statistische Tests der Seltenheiten; Überspringen funktioniert |
| **M7** | Karte & Run-Loop (**MVP**) | Map-Generierung 9.1 mit allen Regeln, Map-Screen (scrollbar, erreichbare Knoten hervorgehoben, Legende), Run-Reducer, Knoten→Raum→zurück zur Karte, Game Over | Golden-Snapshot der Karte; **komplette Schicht 1 inkl. Boss spielbar** (Events/Shop/Rast dürfen hier noch als Kampf ersetzt sein) |
| **M8** | Räume | Rast, Shop, Events (Schicht-1-Pool), Schatz, Kartenentfernen, Karten-Upgrade-Vorschau | Alle Raumtypen in Schicht 1 funktional; Shop-Preis-Tests |
| **M9** | Artefakte & Tränke | Alle 24 Artefakte, alle 10 Tränke über Trigger-Hooks, Artefakt-Leiste mit Tooltips, Boss-Artefakt-Wahl | Pro Artefakt ≥1 Test; Phönixfeder rettet vor Tod |
| **M10** | Schichten 2 & 3 + Speichern | Gegner/Eliten/Bosse Schicht 2+3 detailliert ausarbeiten, Events Schicht 2+3, Schicht-Übergänge, Autosave/Fortsetzen, Sieg-Screen, Run-Statistik | Kompletter Run von Stockwerk 1 bis Glutherz möglich; Save/Load-Roundtrip-Test; Fortsetzen nach Neuladen der Seite |
| **M11** | Balancing-Simulator | Bot, `npm run sim`, Report, Anpassung der Werte bis Zielwerte 13.4 erreicht | `sim-report.md` mit 2000 Runs; Zielwerte erfüllt oder Abweichungen begründet in DECISIONS.md |
| **M12** | Polish & Meta | Audio, Einstellungen, Barrierefreiheit, Tiefenstufen 1–10, Meta-Progression + Kompendium, kurzes interaktives Tutorial im ersten Kampf, Hauptmenü-Hintergrund, optional Tauri-Build | Alle Screens poliert; Lighthouse-Performance ≥ 90; keine Konsolenwarnungen |

**MVP = M0–M7.** Priorität hat immer ein spielbarer Zustand. Wenn ein Meilenstein zu groß ist, teile ihn in Unterschritte (M3.1, M3.2 …) und notiere das in `PROGRESS.md`.

---

## 15. Arbeitsregeln für dich (Qwen)

1. **Ein Meilenstein (bzw. Unterschritt) pro Arbeitssitzung.** Nicht vorgreifen.
2. **Vor jedem Schritt:** Lies `docs/PROGRESS.md` und die relevanten Abschnitte dieses Plans. Wenn dir Kontext fehlt (z. B. nach Neustart), lies zuerst diese Dateien, bevor du Code änderst.
3. **Erst planen, dann coden:** Beginne jede Antwort mit einem kurzen Plan (max. 10 Zeilen): welche Dateien, welche Funktionen, welche Tests.
4. **Vollständige Dateien ausgeben.** Keine Auslassungen wie „// … unverändert“. Bei großen bestehenden Dateien: gezielte, eindeutig verortbare Änderungen (Diff/Suchen-Ersetzen), nie stilles Löschen.
5. **Tests zuerst oder gleichzeitig** mit dem Code (Core-Logik: Test-first bevorzugt).
6. **Nach jeder Änderung** ausführen: `npm run typecheck && npm run lint && npm test`. Fehler sofort beheben, bevor du weitermachst. Wenn du Befehle nicht selbst ausführen kannst: gib sie explizit an und warte auf das Ergebnis.
7. **Keine erfundenen APIs.** Wenn du dir bei einer Library-API unsicher bist, nutze die einfachste, lange stabile Variante oder löse es ohne Library.
8. **Kein `Math.random()`, kein `Date.now()` in `src/core`.**
9. **Keine Magic Numbers im Core:** Spielwerte gehören nach `src/content/` oder in `src/core/constants.ts`.
10. **Keine TODOs ohne Eintrag** in `PROGRESS.md` unter „Offene Punkte“.
11. **Nicht refaktorieren, was nicht zum aktuellen Schritt gehört.** Wenn du ein Problem in altem Code findest: in `PROGRESS.md` notieren, separat beheben.
12. **Entscheidungen dokumentieren** in `DECISIONS.md` (Format: Datum, Kontext, Entscheidung, Alternativen).
13. **Keine urheberrechtlich geschützten Inhalte** anderer Spiele (Namen, Texte, Grafiken).
14. **Bei Unklarheiten:** Wähle die einfachste Lösung, die mit diesem Plan vereinbar ist, und dokumentiere sie. Frage nur, wenn eine Entscheidung schwer rückgängig zu machen ist.

### Antwortformat pro Sitzung
```
## Plan
…
## Änderungen
### pfad/zur/datei.ts
```ts
<vollständiger Inhalt>
```
…
## Befehle
npm run typecheck && npm run lint && npm test
## Ergebnis / Selbstprüfung
- Welche Abnahmekriterien sind erfüllt?
- Bekannte Einschränkungen
## PROGRESS.md (neuer Stand)
…
## Nächster Schritt
…
```

### Vorlage `docs/PROGRESS.md`
```
# Fortschritt Runenschacht
## Aktueller Meilenstein: M_
## Erledigt
- [x] M0 – …
## In Arbeit
- [ ] …
## Offene Punkte / Bekannte Bugs
- …
## Letzter Testlauf
- typecheck: ✅ / lint: ✅ / tests: 123 ✅ 0 ❌
```

---

## 16. Definition of Done (Gesamtprojekt)

- Ein vollständiger Run über 3 Schichten mit Endboss ist ohne Fehler spielbar.
- Alle Inhalte aus Abschnitt 10 sind implementiert und getestet.
- Gleicher Seed + gleiche Entscheidungen → identischer Run (per Test belegt).
- Speichern/Fortsetzen funktioniert nach Neuladen des Browsers.
- Balancing-Zielwerte erreicht (13.4).
- Keine Konsolenfehler/-warnungen, `typecheck`, `lint`, `test` grün.
- `docs/CONTENT_GUIDE.md` erklärt, wie man eine neue Karte, einen Gegner, ein Artefakt und ein Event hinzufügt (mit Beispiel).
- `README.md` mit Start-, Build- und Sim-Anleitung.

---

## 17. Startbefehl

**Beginne jetzt mit Meilenstein M0.** Gib zuerst eine Liste der Dateien aus, die du anlegen wirst, dann deren vollständigen Inhalt, dann die auszuführenden Befehle. Lege `docs/MASTERPLAN.md` (Inhalt = dieses Dokument), `docs/PROGRESS.md` und `docs/DECISIONS.md` an. Hör nach M0 auf und warte auf „weiter“.