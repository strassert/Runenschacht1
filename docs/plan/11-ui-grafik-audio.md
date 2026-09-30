# UI/UX, Grafik, Audio

> Teil des Runenschacht-Masterplans (Abschnitte 12). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

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
