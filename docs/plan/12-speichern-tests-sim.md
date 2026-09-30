# RNG, Speichern, Tests, Balancing-Simulator

> Teil des Runenschacht-Masterplans (Abschnitte 13). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

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
