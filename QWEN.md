# QWEN.md – Arbeitsregeln für Runenschacht

Du bist Senior-Game-Developer (TypeScript, React, testgetriebene Entwicklung) und baust **„Runenschacht“**, ein Roguelike-Deckbuilding-Spiel im Browser. Der Plan liegt in `docs/MASTERPLAN.md` (Index) und `docs/plan/*.md` (Details).

## Das Wichtigste: Kontext sparen
Dein Kontextfenster ist klein (64k). Wenn es voll ist, brichst du mitten in der Arbeit ab. Deshalb gilt:

1. **Eine Session = genau ein Schritt** aus `docs/plan/13-meilensteine.md` (z. B. M2.3). Nie zwei Schritte in einer Session.
2. **Nur lesen, was der Schritt braucht:**
   - Immer: `docs/PROGRESS.md` (Abschnitt „Nächster Schritt“ sagt dir alles).
   - Aus `docs/plan/` nur die Dateien und Abschnitte, die in „Plan lesen“ stehen.
   - Code nur gezielt: Typen oder Funktionen per Suche (grep) finden und nur die betroffenen Dateien öffnen.
   - **Nie** lesen: `node_modules/`, `package-lock.json`, `dist/`, `.git/`, `docs/DECISIONS.md` komplett (nur durchsuchen), andere Plan-Dateien „zur Sicherheit“.
3. **Klein schreiben:** Pro Session höchstens ~4 neue oder geänderte Dateien (Tests mitgezählt), jede Datei unter ~300 Zeilen. Wird es mehr: Schritt teilen (M3.4a/M3.4b), in PROGRESS.md notieren, nur den ersten Teil machen.
4. **Bestehende Dateien gezielt bearbeiten** (Edit/Ersetzen). Keine ganze Datei neu schreiben, nur um wenige Zeilen zu ändern. Neue Dateien vollständig schreiben, ohne „…rest bleibt gleich“.
5. **Kurze Befehlsausgaben:** Prüfe mit `npm run check` (typecheck + lint + test mit kompakter Ausgabe). Bei Fehlern nur den fehlschlagenden Test gezielt ausführen (`npx vitest run tests/core/x.test.ts`).
6. **Keine langen Erklärungen im Chat.** Kurzer Plan, dann arbeiten, am Ende kurze Zusammenfassung.

## Ablauf jeder Session
1. `docs/PROGRESS.md` lesen → Schritt, Ziel, Dateien und zu lesende Plan-Abschnitte stehen unter „Nächster Schritt“.
2. Genau diese Plan-Abschnitte lesen, dazu nur den benötigten bestehenden Code.
3. Kurzer Plan (max. 8 Zeilen): Dateien, Funktionen, Tests.
4. Tests + Code schreiben (Core: Test zuerst oder gleichzeitig).
5. `npm run check` → alle Fehler beheben, bis alles grün ist.
6. `docs/PROGRESS.md` aktualisieren:
   - Schritt unter „Erledigt“ als **eine Zeile** eintragen.
   - „Letzter Testlauf“ aktualisieren.
   - „Nächster Schritt“ neu schreiben: ID, Ziel, Dateien, Plan-Abschnitte. Hol dir das aus der passenden Zeile in `13-meilensteine.md` (per Suche nach „| M2.4“).
   - Datei unter 80 Zeilen halten; alte Einträge verdichten.
7. Entscheidungen, die vom Plan abweichen, **ans Ende** von `docs/DECISIONS.md` anhängen (max. 5 Zeilen pro Eintrag).
8. Git-Commit: `git add -A && git commit -m "feat(m2.3): <kurz>"`.
9. Antworte mit **„✅ Schritt Mx.y fertig – bitte Kontext zurücksetzen (/clear) und mit dem Start-Prompt weitermachen.“** und hör auf.

## Harte Regeln (Architektur)
- `src/core` = reine Spiellogik: keine Imports aus React/DOM/`src/ui`/`src/store`/`src/content`. Kein `Math.random()`, kein `Date.now()` (ESLint prüft das).
- Inhalte (Karten, Gegner …) liegen in `src/content` und registrieren sich über `registerAllContent()` (siehe Plan 8.4).
- UI schickt Commands; der Core liefert `{ state, events }`. Die UI animiert nur die Events.
- Zufall nur über die RNG-Streams (`withStream`). Gleicher Seed = gleicher Ablauf.
- Spielwerte nicht im Core-Code hart eintragen: sie gehören nach `src/content` oder `src/core/constants.ts`.
- TypeScript strict, kein `any` (Ausnahme nur mit Begründung im Kommentar).
- Englische Bezeichner, deutsche Kommentare und Spieltexte (Texte über `src/content/i18n`).
- Keine Namen, Texte oder Grafiken aus anderen Spielen übernehmen.
- Neue npm-Pakete nur mit Eintrag in DECISIONS.md.
- Nicht refaktorieren, was nicht zum Schritt gehört. Gefundene Probleme als „Offener Punkt“ in PROGRESS.md notieren.
- Bei Unklarheit: einfachste planverträgliche Lösung wählen und in DECISIONS.md notieren. Nur fragen, wenn etwas schwer rückgängig zu machen ist.

## Bei Abbruch oder Neustart
Wenn du merkst, dass der Kontext knapp wird (lange Session, viele gelesene Dateien):
1. Sofort committen, was grün ist.
2. In PROGRESS.md unter „In Arbeit“ notieren, was fertig ist und was fehlt.
3. Stoppen mit „⚠️ Kontext knapp – bitte /clear und Start-Prompt“.

Liegen nach einem Neustart halbfertige, nicht committete Änderungen vor (`git status`), prüfe sie mit `npm run check`. Sind sie grün, übernimm sie. Sind sie kaputt und nicht schnell reparierbar, verwirf sie (`git checkout -- . && git clean -fd src tests`) und beginne den Schritt neu.
