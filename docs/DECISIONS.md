# Entscheidungen (DECISIONS.md)

Format pro Eintrag: Datum – Kontext – Entscheidung – Alternativen.

---

## 2026-09-30 – ESLint statt oxlint
- **Kontext:** Das create-vite-Template (Vite 8) bringt oxlint als Linter mit. Der Masterplan
  schreibt jedoch ESLint + Prettier ausdrücklich vor (Abschnitt 4), und die geforderte
  Core-Regel „kein `Math.random()` / `Date.now()` in `src/core`“ wird als ESLint-Regel
  (`no-restricted-properties`) umgesetzt.
- **Entscheidung:** oxlint entfernt; ESLint 10 mit Flat Config (`eslint.config.js`) +
  typescript-eslint + Prettier installiert. `src/core/**` erhält zusätzliche Sperren gegen
  `Math.random`, `Date.now` und React-Importe.
- **Alternativen:** oxlint mit eigenen Regeln (abgelehnt: Masterplan-Vorgabe; schwächere
  Import-Restriktionen).

## 2026-09-30 – TypeScript-Version
- **Kontext:** Template liefert TypeScript ~6.0.2; typescript-eslint 8.71 installiert ohne
  Peer-Konflikt.
- **Entscheidung:** TypeScript 6.0 beibehalten; `strict: true` und `noUncheckedIndexedAccess`
  in `tsconfig.app.json` und `tsconfig.node.json` ergänzt (Masterplan 4: strict, kein `any`).
- **Alternativen:** Downgrade auf TS 5.9 (nicht nötig; Konflikt trat nicht auf).

## 2026-09-30 – `typecheck`-Script
- **Kontext:** Template nutzt Project-References (`tsc -b`) mit `noEmit: true` in beiden
  Referenz-tsconfigs.
- **Entscheidung:** `npm run typecheck` = `tsc -b` (funktioniert wie `tsc --noEmit`, prüft
  App- und Node-Konfiguration).
- **Alternativen:** `tsc --noEmit -p tsconfig.app.json` (überspringt vite.config.ts).

## 2026-09-30 – `sim`-Script als Platzhalter
- **Kontext:** Masterplan 5.4 verlangt den npm-Script `sim` ab M0; die Bot-Simulation selbst
  ist erst M11.
- **Entscheidung:** `sim` gibt bis M11 einen Hinweis aus (kein Fehler). Eintrag in
  PROGRESS.md „Offene Punkte“.
- **Alternativen:** Script weglassen (verstößt gegen 5.4).

## 2026-09-30 – Bibliotheks-Versionen
- **Kontext:** Masterplan 4 nennt React 18+, Zustand, Framer Motion (M5), Vitest.
- **Entscheidung:** Vom Template bestätigt: React 19.2, Vite 8.3, Vitest 5.0, Zustand 5.0,
  ESLint 10.11, Prettier 3.9. Framer Motion wird erst zu M5 installiert, um den M0-Scope
  nicht zu vergrößern.
- **Alternativen:** React 18 pinnen (nicht nötig; 19 erfüllt „18+“).
