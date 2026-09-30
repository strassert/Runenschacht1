# Run-Struktur: Karte, Belohnungen, Räume

> Teil des Runenschacht-Masterplans (Abschnitte 9). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

## 9. Run-Struktur

### 9.1 Kartengenerierung (pro Schicht)
- Raster: **15 Stockwerke** × **7 Spalten**. Danach Boss-Knoten (Stockwerk 16).
- **6 Pfade** starten auf zufälligen Spalten in Stockwerk 1 (mind. 2 unterschiedliche Startspalten) und laufen nach oben, je Schritt Spalte −1/0/+1.
- Pfade dürfen sich **nicht kreuzen** (Kanten dürfen sich nicht überschneiden).
- Knoten, die von keinem Pfad erreicht werden, werden entfernt.

**Raumtypen & Regeln:**
| Typ | Symbol | Gewicht | Regeln |
|---|---|---|---|
| Kampf | ⚔ | 45 % | Stockwerk 1 immer Kampf |
| Event | ? | 22 % | – |
| Elite | ☠ | 8 % (Tiefenstufe ≥1: 10 %) | nicht in Stockwerk 1–5 |
| Rast | 🔥 | 12 % | nicht in Stockwerk 1–5; nicht Stockwerk 14 |
| Shop | $ | 5 % | – |
| Schatz | ◆ | – | Stockwerk 9 immer Schatz |
| (Rest) | | Rest → Kampf | Stockwerk 15 immer Rast |

Zusatzregeln: Elite, Rast und Shop nicht direkt hintereinander auf demselben Pfad. Knoten mit mehreren Ausgängen dürfen nicht zwei gleiche Spezialtypen als direkte Nachfolger haben.

**Symbole im Code:** Nutze eigene SVG-Icons statt Emojis. Emojis hier nur zur Veranschaulichung.

### 9.2 Kampfbelohnungen
| Raum | Gold | Karte | Trank | Artefakt |
|---|---|---|---|---|
| Kampf | 10–20 | 1 aus 3 | Chance (s. u.) | – |
| Elite | 25–35 | 1 aus 3 (bessere Seltenheit) | Chance | 1 (Seltenheit gewürfelt) |
| Boss | 95–105 | 1 aus 3, **nur selten** | – | 1 aus 3 Boss-Artefakten |

**Seltenheit der Kartenbelohnung (normaler Kampf):** Selten 3 %, Ungewöhnlich 37 %, Gewöhnlich 60 %.
**Elite:** Selten 10 %, Ungewöhnlich 40 %, Gewöhnlich 50 %.
**Pity-Mechanik:** Startwert `rareCardOffset = −5 %`. Jede angebotene gewöhnliche Karte erhöht den Offset um +1 % (max. +40 %). Wird eine seltene Karte angeboten → Offset zurück auf −5 %. Offset wird auf die Selten-Chance addiert.
**Keine Duplikate** innerhalb eines Angebots.
**Verbesserte Karten:** In Schicht 2: 25 % Chance, dass eine nicht-seltene angebotene Karte bereits verbessert ist; Schicht 3: 50 %.
**Überspringen** ist immer erlaubt.

**Trank-Chance:** Start 40 %. Kein Trank gedroppt → +10 %, Trank gedroppt → −10 %. Nur wenn freier Slot oder Spieler ersetzen will.

### 9.3 Rastplatz
Wahl (genau eine):
- **Ausruhen:** 30 % der max. HP heilen.
- **Schmieden:** Eine Karte dauerhaft verbessern (Vorschau alt/neu nebeneinander).
- (Später per Artefakt freischaltbar: „Entschlacken“ – Karte entfernen, „Graben“ – Artefakt finden.)

### 9.4 Shop
- 5 Charakterkarten (2 Angriff, 2 Fertigkeit, 1 Kraft), 2 neutrale Karten, 3 Artefakte, 3 Tränke.
- Eine zufällige Karte im Angebot ist **50 % reduziert**.
- **Karte entfernen:** 75 Gold, jedes weitere Mal +25 Gold (Zähler gilt für den ganzen Run).
- Preise (±10 % Zufall): Karte gewöhnlich 50, ungewöhnlich 75, selten 150; Artefakt gewöhnlich 150, ungewöhnlich 250, selten 300; Trank 50/75/100.

### 9.5 Events
Ein Event = Titel, Text, 2–4 Optionen; jede Option hat Bedingungen (z. B. Gold ≥ 50), Kosten und Ergebnis (EffectSpecs + evtl. Folge-Seite). Events werden pro Schicht aus einem Pool ohne Wiederholung im Run gezogen. Manche „?“-Räume werden stattdessen Kampf (10 %), Shop (3 %) oder Schatz (2 %); die Chance auf Kampf steigt pro Event ohne Kampf um +10 %.

### 9.6 Schatz
1 Artefakt (Seltenheit: 50 % gewöhnlich, 33 % ungewöhnlich, 17 % selten) + 25–50 Gold.

### 9.7 Nach dem Boss
Volle Heilung auf max. HP beim Betreten der nächsten Schicht (Tiefenstufe ≥5: nur 75 % des fehlenden HP).
