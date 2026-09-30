# Fortschritt Runenschacht

## Erledigt (eine Zeile pro Schritt)
- [x] M0 – Setup: Vite + React 19 + TS 6 strict, ESLint 10 (Flat) + Prettier, Vitest 5, Zustand; Ordnerstruktur; Scripts; ESLint sperrt Math.random/Date.now/React in src/core.
- [x] M1 – Core-Fundament: Typen (`src/core/types/`), RNG cyrb128+sfc32 mit 10 Streams (`withStream`), Stapel-Logik (`deck/piles.ts`, `shuffle.ts`, `upgrade.ts` – nur Flag), Konstanten, Invarianten-Checker, Core-API `src/core/index.ts`. 44 Tests.
- [x] Plan umgebaut: Masterplan in `docs/plan/*.md` aufgeteilt, Meilensteine in kleine Schritte (M2.1 …) zerlegt, Arbeitsregeln in `QWEN.md`, neues Script `npm run check`.
- [x] M2.1 – Registry + erste Inhalte: `src/core/registry.ts` (Maps + register/get für Karten, Gegner, Begegnungen, Artefakte, Tränke, Events, Skripte; unbekannte ID → Fehler mit ID), Starterkarten Schlag/Parade/Funkenschlag, Grubenratte (weighted 70/30, maxRepeat 2), `registerAllContent()` idempotent, Registry-Exporte in Core-API. 49 Tests.

## In Arbeit
- (nichts)

## Nächster Schritt
- **ID:** M2.2 – Schadens-/Block-Formel + Status
- **Ziel:** Schadens-/Block-Formel + Status: 7.3 exakt in Reihenfolge; Status aus 7.4 anwenden/stapeln/abbauen (Zeitpunkt: Ende der eigenen Runde des Trägers); Bannrune blockt Debuffs.
- **Dateien:** `src/core/combat/damage.ts`, `src/core/combat/block.ts`, `src/core/combat/statuses.ts`, `tests/core/damage.test.ts`, `tests/core/statuses.test.ts`
- **Plan lesen:** `docs/plan/04-kampf.md` → nur 7.3 und 7.4
- **Code nachschlagen:** `src/core/types/effects.ts` (StatusId), `src/core/types/state.ts` (StatusInstance, Combatant)
- **Fertig wenn:** Alle Kombinationen Kraft/Geschwächt/Verwundbar/Zerbrechlich/Block/Körperlos getestet, `npm run check` grün.

## Offene Punkte / Bekannte Bugs
- `npm run sim` ist bis M11 ein Platzhalter.
- `docs/CONTENT_GUIDE.md` und `README.md` kommen in M12.6.
- Framer Motion wird erst in M5.5 installiert.
- `prepareDrawPile` bekommt ab M2.4 einen `isInnate`-Callback (über Registry); `upgradeCard` setzt nur das Flag, die `CardUpgradeSpec`-Anwendung kommt in M3.2.
- Zähler `cardsGeneratedThisCombat` / `cardsRemovedThisCombat` müssen ab M2 von der Engine gepflegt werden (Invariante).

## Letzter Testlauf
- typecheck ✅ / lint ✅ / tests 49 ✅ 0 ❌ (Stand M2.1)
