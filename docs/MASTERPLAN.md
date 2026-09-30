# MASTERPLAN „Runenschacht“ – Index

Roguelike-Deckbuilder im Browser (TypeScript, React, Vite). Die Runenschmiedin steigt durch 3 Schichten eines Bergwerksschachts, kämpft rundenbasiert mit einem Kartendeck und wählt nach jedem Sieg 1 aus 3 zufälligen Karten. Kernmechanik ist „Hitze“: aufbauen, verbrauchen, am Rundenende halbiert.

> **Für Qwen:** Diese Datei ist nur der Wegweiser. Lies **nicht** alle Plan-Dateien. Welche du brauchst, steht in `docs/PROGRESS.md` unter „Nächster Schritt“. Arbeitsregeln: `QWEN.md` im Projektstamm.

## Plan-Dateien (`docs/plan/`)
| Datei | Abschnitte | Inhalt |
|---|---|---|
| `01-konzept.md` | 1–3 | Auftrag, Spielkonzept, Kern-Loop, Design-Säulen, harte Randbedingungen |
| `02-technik-architektur.md` | 4–5 | Stack, npm-Scripts, Schichten, Command→Events, Ordnerstruktur |
| `03-datenmodell.md` | 6 | Ursprüngliche Typ-Spezifikation (maßgeblich ist jetzt `src/core/types/`) |
| `04-kampf.md` | 7 | Grundwerte, Kampfablauf, **Schadensformel**, Status, Gegner-KI |
| `05-effekte-trigger.md` | 8 | EffectSpec/ValueExpr/Condition, Action-Queue, Hooks, Registries, Spielerauswahl |
| `06-run-struktur.md` | 9 | Kartengenerierung, Belohnungen + Pity, Rast, Shop, Events, Schatz |
| `07-karten.md` | 10.1–10.2 | Runenschmiedin, Hitze, alle 48 Karten + Status/Fluch/neutral |
| `08-gegner.md` | 10.3 | Gegner, Eliten, Bosse aller 3 Schichten, Begegnungen |
| `09-artefakte-traenke-events.md` | 10.4–10.6 | 24 Artefakte, 10 Tränke, Event-Beispiele |
| `10-schwierigkeit.md` | 11 | Skalierung, Tiefenstufen 0–10, Meta-Progression |
| `11-ui-grafik-audio.md` | 12 | Screens, Layout, Interaktion, Grafikstil, Audio, Einstellungen |
| `12-speichern-tests-sim.md` | 13 | RNG, Speichern, Test-Pflichten, Balancing-Simulator + Zielwerte |
| `13-meilensteine.md` | 14, 16 | **Alle Arbeitsschritte (M2.1 … M12.6)** mit Dateien, Lese-Liste, Abnahme; Definition of Done |

## Weitere Steuerdateien
- `QWEN.md` – Arbeitsregeln und Session-Ablauf (wird von Qwen Code automatisch geladen)
- `docs/PROGRESS.md` – aktueller Stand und **Übergabe an die nächste Session**
- `docs/DECISIONS.md` – Architekturentscheidungen (nur anhängen, nur durchsuchen)

## Querverweise
Abschnittsnummern (z. B. „siehe 7.3“, „10.1“) gelten weiterhin. Die Tabelle oben zeigt, in welcher Datei ein Abschnitt steht.
