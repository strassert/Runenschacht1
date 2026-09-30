# Fortschritt Runenschacht

## Erledigt (eine Zeile pro Schritt)
- [x] M0 – Setup: Vite + React 19 + TS 6 strict, ESLint 10 (Flat) + Prettier, Vitest 5, Zustand; Ordnerstruktur; Scripts; ESLint sperrt Math.random/Date.now/React in src/core.
- [x] M1 – Core-Fundament: Typen (`src/core/types/`), RNG cyrb128+sfc32 mit 10 Streams (`withStream`), Stapel-Logik (`deck/piles.ts`, `shuffle.ts`, `upgrade.ts` – nur Flag), Konstanten, Invarianten-Checker, Core-API `src/core/index.ts`. 44 Tests.
- [x] Plan umgebaut: Masterplan in `docs/plan/*.md` aufgeteilt, Meilensteine in kleine Schritte (M2.1 …) zerlegt, Arbeitsregeln in `QWEN.md`, neues Script `npm run check`.

## In Arbeit
- (nichts)

## Nächster Schritt
- **ID:** M2.1 – Registry + erste Inhalte
- **Ziel:** `src/core/registry.ts` (Maps + register/get für Karten, Gegner, Begegnungen, Artefakte, Tränke, Events, Skripte; unbekannte ID → Fehler mit ID). Starterkarten Schlag, Parade, Funkenschlag als `CardDef` inkl. Upgrade. Gegner Grubenratte als `EnemyDef` (weighted 70/30, maxRepeat 2). `src/content/index.ts` mit idempotentem `registerAllContent()`. Registry-Exporte in `src/core/index.ts`.
- **Dateien:** `src/core/registry.ts`, `src/content/cards/runesmith/starter.ts`, `src/content/enemies/layer1.ts`, `src/content/index.ts`, `tests/core/registry.test.ts` (+ Export-Zeilen in `src/core/index.ts`)
- **Plan lesen:** `docs/plan/05-effekte-trigger.md` → nur 8.4 (und 8.1 als Nachschlagewerk für die EffectSpec-Form); `docs/plan/07-karten.md` → nur Tabelle „Starter“; `docs/plan/08-gegner.md` → nur Zeile Grubenratte
- **Code nachschlagen:** `src/core/types/cards.ts`, `src/core/types/enemies.ts`, `src/core/types/effects.ts`
- **Fertig wenn:** Registrieren/Nachschlagen getestet, unbekannte ID wirft Fehler, doppelter `registerAllContent()`-Aufruf ist harmlos, `npm run check` grün.

## Offene Punkte / Bekannte Bugs
- `npm run sim` ist bis M11 ein Platzhalter.
- `docs/CONTENT_GUIDE.md` und `README.md` kommen in M12.6.
- Framer Motion wird erst in M5.5 installiert.
- `prepareDrawPile` bekommt ab M2.4 einen `isInnate`-Callback (über Registry); `upgradeCard` setzt nur das Flag, die `CardUpgradeSpec`-Anwendung kommt in M3.2.
- Zähler `cardsGeneratedThisCombat` / `cardsRemovedThisCombat` müssen ab M2 von der Engine gepflegt werden (Invariante).

## Letzter Testlauf
- typecheck ✅ / lint ✅ / tests 44 ✅ 0 ❌ (Stand M1)
