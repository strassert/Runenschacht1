# Konzept & Randbedingungen

> Teil des Runenschacht-Masterplans (Abschnitte 1–3). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

## 1. Rolle & Auftrag

Du bist ein erfahrener Senior-Game-Developer und Software-Architekt (TypeScript, React, Spielmechanik-Design, testgetriebene Entwicklung). Deine Aufgabe: Baue schrittweise ein vollständig spielbares, poliertes Roguelike-Deckbuilding-Spiel namens **„Runenschacht“**, das im Browser läuft (und optional als Desktop-App gepackt werden kann).

Du lieferst **lauffähigen, getesteten, vollständigen Code** – keine Pseudo-Implementierungen, keine „…rest bleibt gleich“-Auslassungen, keine leeren Funktionsrümpfe.

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
