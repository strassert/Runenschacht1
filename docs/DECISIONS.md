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

---

# M1-Entscheidungen (Core-Fundament)

## 2026-09-30 – PRNG: sfc32 + cyrb128 (Seed-Hashing)
- **Kontext:** Masterplan 13.1 verlangt seedbare, deterministische Zufälligkeit ohne
  `Math.random()`; der Seed muss in Savegames als kleiner Zustand serialisierbar sein.
- **Entscheidung:** Seed-String → `cyrb128` (4 × 32-Bit-Wort) → `sfc32`-Generator
  (`src/core/rng/Rng.ts`). Zustand = 4 Zahlen + Counter, als `number[]` speicherbar.
  10 Streams (`map, encounters, cardRewards, shuffle, combat, enemyAi, loot, events,
  shop, misc`) mit je eigenem Start-Hash `seed:stream`; Konsum eines Streams beeinflusst
  keine anderen (Test abgedeckt).
- **Alternativen:** Mulberry32 (nur 1 Wort Zustand, geringere Periode), xoshiro128**
  (etwas teurer), externe Lib `alea` (Abhängigkeit; Masterplan will minimal bleiben).

## 2026-09-30 – `useStream` → `withStream` (Umbenennung)
- **Kontext:** Das ESLint-Plugin `react-hooks` deutet jede `use*`-Funktion als React-Hook
  und meldete in `drawCards` „Hook may be executed more than once“ (Fehlalarm, Core ist
  React-frei).
- **Entscheidung:** Die reine Hilfsfunktion heißt jetzt `withStream(states, stream, fn)` –
  kein `use`-Präfix, keine Lint-Ausnahme nötig.
- **Alternativen:** `eslint-disable`-Kommentar (untergräbt die Regel); Plugin auf
  React-Dateien beschränken (bräuchte Ausnahmen für UI-Tests).

## 2026-09-30 – Zähler `cardsGeneratedThisCombat` / `cardsRemovedThisCombat`
- **Kontext:** Die Invariante „Stapelsumme = Deckgröße“ (Masterplan 13.3) gilt nicht,
  wenn im Kampf Karten generiert (Tokens) oder entfernt (Erschöpfen aus dem Zyklus,
  „verbraucht“)-Karten ausscheiden.
- **Entscheidung:** `PlayerCombatState` erhält die beiden Zähler; die Invariante prüft
  `Stapelsumme == deckSize + generated − removed`. Beide Zähler werden ab M2 von der
  Kampf-Engine gepflegt.
- **Alternativen:** Stapelsumme nur als „≥ deckSize − removed“ (zu schwach); jede
  Token-Karte ins Deck aufnehmen (verfälscht Deck-Statistik und Belohnungen).

## 2026-09-30 – Typen vollständig in M1 (Vorgriff auf M2–M10)
- **Kontext:** Masterplan-Meilenstein M1 verlangt „alle Typen aus Abschnitt 6“, obwohl
  Karte/Kampf/Karte/Laden-Systeme erst in M2–M10 implementiert werden.
- **Entscheidung:** Alle Typen aus Abschnitt 6 werden jetzt in `src/core/types/`
  definiert (Karten, Effekte, Gegner, Events, Commands, RunState inkl. `map`,
  `rewardState`, `shopState`, `eventState`, `pity`, `nextUid`). Spätere Meilensteine
  ergänzen nur Logik, keine Typ-Brüche; `schemaVersion` sichert Savegames ab M10.
- **Alternativen:** Typen pro Meilenstein einzeln einführen (führt zu häufigen
  Signaturen-Änderungen und Test-Churn).

---

## 2026-09-30 – Plan aufgeteilt, kleine Schritte, `npm run check`
- **Kontext:** Mit 64k Kontext lief Qwen voll (Prompt 55–65k Tokens) und brach Antworten ab („Max tokens“).
- **Entscheidung:** Masterplan in `docs/plan/*.md` aufgeteilt (`docs/MASTERPLAN.md` ist nur noch Index). Meilensteine in Schritte mit ≤ ~4 Dateien zerlegt. Regeln in `QWEN.md`. Eine Session pro Schritt, Übergabe über PROGRESS.md „Nächster Schritt“. Neues Script `check` mit kompakter Ausgabe.
- **Alternativen:** Ein großes Dokument + `/compress` (verliert Details, bricht trotzdem ab).

---

## 2026-09-30 – M2.1: Minimale Def-Typen in registry.ts
- **Kontext:** 8.4 verlangt Registry-Maps für Begegnungen, Artefakte, Tränke, Events und Skripte, der Plan definiert aber keine Def-Typen dafür.
- **Entscheidung:** Minimale Typen (`EncounterDef`, `RelicDef`, `PotionDef`, `EventDef`, `ScriptFn`) direkt in `src/core/registry.ts`; werden in den jeweiligen Meilensteinen (M2.5/M6/M7/M10, M3.1/M8.2) konkretisiert.
- **Alternativen:** Leere `unknown`-Maps (verliert Typsicherheit).

---

## 2026-09-30 – M2.2: Debuff-Liste für Bannrune, Hooks als Callbacks
- **Kontext:** 7.4 lässt Bannrune „Debuffs“ blocken, ohne sie aufzuzählen; 7.3 nennt Damage-Hooks und Trigger (Schritt 9), die Trigger-Engine kommt aber erst in M4.
- **Entscheidung:** `DEBUFF_STATUSES = vulnerable/weak/frail/burn` in `statuses.ts`; Formeln lesen ausschließlich `Combatant.statuses`; `modifyOutgoing/IncomingDamage` als optionale Callbacks in `DamageOptions`; Trigger (onDamageDealt/onHpLost/onBlockBroken) bis M4 zurückgestellt, Dornen als einzige Ausnahme umgesetzt.
- **Alternativen:** Debuff-Flag pro Statusdefinition (überkonstruiert ohne 8.3); Trigger-Engine jetzt (Schritt-Sprengung).

---

## 2026-09-30 – M2.3: Queue-Grenze, Kampfende als Phase, Ziel-Perspektive
- **Kontext:** 8.2 nennt das 1000-Actions-Limit ohne Ablageort; das Event `combatEnded` (5.2) gehört zum Command-Reducer (M2.5); 8.1 lässt die Perspektive von Gegner-Actions offen.
- **Entscheidung:** `MAX_ACTIONS_PER_COMMAND` als technische Konstante in `constants.ts`; die Queue setzt nur `phase` victory/defeat, `combatEnded` kommt in M2.5; Zielauflösung immer relativ zum Action-Absender (Gegner-Actions zielen auf den Spieler).
- **Alternativen:** Limit als Magic Number in der Queue; `combatEnded` schon in der Queue (doppelter Zustandsübergang).

---

## 2026-09-30 – M2.4: Intent-Vorschau, Schritt-Bündelung, Ritual-Timing, Run-HP
- **Kontext:** 7.5 verlangt ehrliche Intents, dynamische ValueExprs (M3+) lassen sich zur Intent-Zeit nicht sicher auswerten; 7.2 nennt Hitze-Halbierung (Schritt 7) und Debuff-Abbau (Schritt 9) getrennt; der Kampfaufbau (7.1) verweist auf RunState-Werte, die es noch nicht gibt.
- **Entscheidung:** `previewIntent` berechnet `damagePreview` nur für numerische Schadenswerte, dynamische ValueExprs lassen die Vorschau offen; `endPlayerTurn` bündelt Schritt 7+9 über `endOfOwnerTurn`; Gegner-Ritual greift am Ende der Gegnerrunde (konsistent zu `statuses.ts`); `setupCombat` nutzt `START_HP`/`MAX_ENERGY` als Standard, RunState-Übergang kommt in M2.5.
- **Alternativen:** Vorschau mit halber Auswertung (unehrlich); getrennte Tick-Funktionen (dupliziert `statuses.ts`).
