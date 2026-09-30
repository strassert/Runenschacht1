# Technik-Stack & Architektur

> Teil des Runenschacht-Masterplans (Abschnitte 4–5). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

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
dev, build, preview, test, test:watch, typecheck (tsc -b), lint, format, sim (Balancing-Simulator),
check (= typecheck + lint + test mit kurzer Ausgabe – DAS ist der Standard-Prüfbefehl)
```

**Tatsächlich installiert (Stand M1, siehe DECISIONS.md):** React 19, Vite 8, TypeScript 6 (strict + noUncheckedIndexedAccess), Vitest 5, Zustand 5, ESLint 10 (Flat Config) + Prettier. Framer Motion erst ab M5.

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
