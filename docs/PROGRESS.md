# Fortschritt Runenschacht

## Aktueller Meilenstein: M1 (abgeschlossen) – nächster: M2 (Kampf-Engine headless)

## Erledigt
- [x] M0 – Projekt-Setup: Vite + React + TS strict, ESLint (statt oxlint), Prettier, Vitest, Zustand;
      Ordnerstruktur gemäß Masterplan 5.3; npm-Scripts `dev, build, preview, test, test:watch,
      typecheck, lint, format, sim`; `docs/` angelegt; Leerseite mit Titel „Runenschacht“;
      ESLint-Regel verbietet `Math.random()`/`Date.now()` und React-Importe in `src/core`.
- [x] M1 – Core-Fundament: alle Typen aus Masterplan 6 (`src/core/types/`); seedbarer RNG
      (cyrb128 + sfc32) mit 10 getrennten Streams (`rng/Rng.ts`, `rng/streams.ts`);
      Stapel-Logik ziehen/ablegen/erschöpfen/Nachmischen/innate (`deck/piles.ts`,
      `deck/shuffle.ts`, `deck/upgrade.ts`); Karteninstanzen mit UIDs; Konstanten
      (`constants.ts`); Invarianten-Checker (`invariants.ts`); öffentliche Core-API
      (`src/core/index.ts`); Tests: RNG-Determinismus, Streams, Ziehen mit Nachmischen,
      Invarianten (44 Tests).

## In Arbeit
- [ ] (keine)

## Offene Punkte / Bekannte Bugs
- `npm run sim` ist bis M11 ein Platzhalter (echo-Hinweis); ab M11 headless Bot-Simulation.
- `docs/CONTENT_GUIDE.md` und `README.md` werden gemäß Masterplan 16 bis M12 erstellt.
- Framer Motion wird bewusst erst ab M5 installiert (Masterplan 4: Animationen M5).
- M1-Vorbereitung auf M2/M3: `prepareDrawPile` nimmt ab M2 einen `isInnate`-Prädikat-Callback
  (Karten-Registry kommt in M2/M3); `upgradeCard` setzt nur das Flag – die eigentliche
  `CardUpgradeSpec`-Anwendung erfolgt mit der Registry in M3.

## Letzter Testlauf
- typecheck: ✅ / lint: ✅ / tests: 44 ✅ 0 ❌ (4 Dateien: rng, deck, invariants, Dummy)
