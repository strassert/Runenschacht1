# Gegner, Eliten, Bosse

> Teil des Runenschacht-Masterplans (Abschnitte 10.3). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

## 10. Inhalte (Teil 2)

### 10.3 Gegner

**Schicht 1 – „Die Stollen“**
| Gegner | HP | Moves | KI |
|---|---|---|---|
| Grubenratte | 12–15 | Beißen: 6 Schaden · Kratzen: 3 Schaden + 1 Geschwächt | weighted 70/30, maxRepeat 2 |
| Schlammling (klein) | 10–13 | Spucken: 4 Schaden + 1 Schlacke in Ablage · Klatschen: 6 Schaden | weighted 50/50 |
| Schlammling (groß) | 28–32 | Wucht: 11 Schaden · Schlammflut: 2 Schlacke in Ablage | cycle; **Script:** bei ≤50 % HP teilt er sich (stirbt, spawnt 2 kleine mit je seinen aktuellen HP/2) |
| Stollenkäfer | 40–44 | Panzern: +9 Block · Rammen: 12 Schaden | cycle A-B, Start zufällig |
| Kobold-Plünderer | 20–24 | Stehlen: 8 Schaden + stiehlt 15 Gold · Flucht (Runde 4): verlässt Kampf mit Gold | script; getötet → Gold zurück |
| Pilzhüter | 22–26 | Sporen: 2 Verwundbar · Schlag: 7 Schaden | cycle, beginnt mit Sporen |
| Tunnelgräber | 28–32 | Eingraben: +12 Block, +2 Kraft · Klaue: 8 Schaden | weighted 35/65, maxRepeat 1 für Eingraben |

**Begegnungen Schicht 1:**
- *Leicht (erste 3 Kämpfe):* 1 Stollenkäfer · 2 Grubenratten · 1 großer Schlammling · 1 Pilzhüter + 1 Grubenratte
- *Schwer (danach):* 3 kleine Schlammlinge · Kobold + Grubenratte · Tunnelgräber + Pilzhüter · 2 Stollenkäfer · großer Schlammling + 2 Ratten
- Keine Begegnung zweimal direkt hintereinander.

**Eliten Schicht 1:**
| Elite | HP | Verhalten |
|---|---|---|
| Vorarbeiter-Golem | 82–86 | Runde 1: Aufladen (buff). Dann: Stampfen 24 Schaden · Hieb 12 Schaden + 1 Zerbrechlich (abwechselnd). Passiv „Zorn“: +1 Kraft, wenn der Spieler eine Fertigkeit spielt |
| Laternenschwestern (2 Gegner) | je 38–42 | Eine greift an (9 Schaden), die andere schützt (+10 Block auf Schwester) – tauschen jede Runde. Stirbt eine: Überlebende +3 Kraft |
| Kristallwächter | 70–74 | Start: 3 Dornen. Splitter: 4× 3 Schaden · Verhärten: +15 Block, +1 Dornen |

**Boss Schicht 1: Der Schlackenkönig** (HP 200, Tiefenstufe ≥9: 220)
- Zyklus: *Schlackenflut* (3 Schlacke in Nachziehstapel) → *Hammer des Königs* (22 Schaden) → *Krone schmieden* (+15 Block, +2 Kraft) → wiederholen.
- Phase 2 bei ≤50 % HP: entfernt alle Debuffs, Intent „Zornausbruch“ (6× 4 Schaden) wird in den Zyklus eingefügt.

**Schicht 2 – „Die Kristallhallen“** (HP-Niveau ca. ×1,6 von Schicht 1)
- Kristallspinne (45–50): Netz (2 Geschwächt) · Biss 13.
- Resonanzgeist (38–42, startet mit 1 Körperlos jede 3. Runde): Heulen (2 Verwundbar an Spieler, +1 Kraft an alle Gegner) · Schlag 10.
- Glaswurm (60–65): Schlingen 2× 8 · Häuten (+20 Block).
- Schmugglerpaar (2× 35): Messer 7 + stiehlt 20 Gold · Rauch (Block 12).
- Echo-Kobold (30): kopiert den Intent des stärksten anderen Gegners.
- **Eliten:** Kristalldrache (140; Odem 18 an Spieler + 2 Wunden), Spiegelritter (110; reflektiert 50 % des Schadens einer Karte pro Runde), Hexenzirkel (3× 45; heilen sich gegenseitig).
- **Boss: Die Facettenkönigin** (HP 300): wechselt jede Runde ihre „Facette“ (Angriff / Verteidigung / Fluch) – wird im Intent angezeigt. Ab 50 %: 2 Kristalldrohnen (25 HP) beschwören.

**Schicht 3 – „Das Glutherz“** (HP-Niveau ca. ×2,4 von Schicht 1)
- Lavageborener (80–85): Eruption 20 · Magma-Schild (Block 15, 3 Dornen).
- Aschenpriester (60): Ritual 3 (Kraft pro Runde) · Feuerpeitsche 3× 6.
- Obsidiangolem (110): Langsam (jede 2. Runde Angriff 30).
- Glutschwarm (3× 20): je 5 Schaden, bei Tod 3 Brand auf Spieler.
- **Eliten:** Wächter des Herzens (220), Zwillingsflammen (2× 110), Der Vergessene Schmied (180; spielt eigene „Karten“ aus einem sichtbaren Mini-Deck).
- **Finalboss: Das Glutherz** (HP 500, 3 Phasen): Phase 1 Pulse (Schaden steigt jede Runde +3), Phase 2 legt Verbrennungskarten in das Deck, Phase 3 „Überhitzung“: Spieler erhält jede Runde 3 Hitze, das Herz erleidet Schaden in Höhe der Spieler-Hitze bei Rundenende (Konterspiel zur Kernmechanik!).

> Schicht 2/3: Moves und Zahlen sind als Rahmen vorgegeben. Du detaillierst sie in M10 nach denselben Mustern wie Schicht 1 und dokumentierst sie in `CONTENT_GUIDE.md`.
