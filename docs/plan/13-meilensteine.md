# Meilensteine & Arbeitsschritte

> Teil des Runenschacht-Masterplans (Abschnitte 14 und 16). Index: `docs/MASTERPLAN.md`.
> **Eine Session = genau ein Schritt (z. B. M2.3).** Danach Übergabe in `docs/PROGRESS.md` schreiben und stoppen.
> Lies aus dieser Datei nur die Zeile deines Schritts und die des nächsten (per Suche nach „| M2.3“), nicht die ganze Datei.

Spalten: **Plan lesen** = die einzigen Plan-Dateien aus `docs/plan/`, die du für diesen Schritt öffnest (dort nur die genannten Abschnitte). **Dateien** = Richtwert, was entsteht oder sich ändert (inkl. Tests). Sind es mehr als ~4 Dateien, teile den Schritt (z. B. M3.4a / M3.4b) und notiere das in PROGRESS.md.

Jeder Schritt endet mit: `npm run check` grün → PROGRESS.md aktualisiert → Git-Commit `feat(m2.3): …`.

---

## ✅ Erledigt
| Schritt | Inhalt |
|---|---|
| M0 | Projekt-Setup (Vite, React, TS strict, ESLint, Prettier, Vitest, Zustand, Ordnerstruktur, Scripts) |
| M1 | Core-Fundament: Typen (`src/core/types`), RNG + Streams, Stapel-Logik, Upgrades (Flag), Invarianten, Core-API |

---

## M2 – Kampf-Engine headless
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M2.1 | Registry + erste Inhalte: Registries laut 8.4; Starterkarten Schlag/Parade/Funkenschlag als CardDef; Gegner Grubenratte; `registerAllContent()`; `npm run check`-Script prüfen | `core/registry.ts`, `content/cards/runesmith/starter.ts`, `content/enemies/layer1.ts`, `content/index.ts`, `tests/core/registry.test.ts` | 05 (8.4), 07 (Starter-Tabelle), 08 (Grubenratte) | Registrieren/Nachschlagen getestet; unbekannte ID wirft Fehler |
| M2.2 | Schadens-/Block-Formel + Status: 7.3 exakt in Reihenfolge; Status aus 7.4 anwenden/stapeln/abbauen (Zeitpunkt: Ende der eigenen Runde des Trägers); Bannrune blockt Debuffs | `combat/damage.ts`, `combat/block.ts`, `combat/statuses.ts`, `tests/core/damage.test.ts`, `tests/core/statuses.test.ts` | 04 (7.3, 7.4) | Alle Kombinationen Kraft/Geschwächt/Verwundbar/Zerbrechlich/Block/Körperlos getestet |
| M2.3 | Action-Queue + Basis-Effekte: FIFO-Queue, „vorne einreihen“, 1000-Action-Schutz, Tod-Prüfung nach jeder Action; Effekte `damage`, `block`, `applyStatus`, `draw`, `gainEnergy`; Zielauflösung; GameEvents erzeugen | `combat/actionQueue.ts`, `effects/basicEffects.ts`, `effects/targeting.ts`, `tests/core/actionQueue.test.ts` | 02 (5.2), 05 (8.1 nur diese 5 Effekte, 8.2) | Queue-Reihenfolge, Endlosschutz und Tod mitten in der Queue getestet |
| M2.4 | Kampfaufbau & Rundenablauf: Setup (HP würfeln, mischen, innate), Spielerrunde Start/Ende (Glut, Block-Verfall, ziehen, Handkarten ablegen), Gegnerrunde; Gegner-KI `weighted` + `cycle`; ehrliche Intents | `combat/combatSetup.ts`, `combat/turn.ts`, `combat/enemyAi.ts`, `tests/core/turn.test.ts` | 04 (7.1, 7.2, 7.5) | Rundenablauf und KI (maxRepeat, cycle) getestet; Intent-Zahl = echter Schaden |
| M2.5 | Commands & Kampfende: `PlayCard` (Glut, Ziel, Ablage), `EndTurn`, Sieg/Niederlage, `combatReducer(state, cmd) → {state, events}`; Invarianten nach jedem Command im Test; Exporte in `core/index.ts` | `combat/playCard.ts`, `combat/victory.ts`, `combat/combatReducer.ts`, `core/index.ts`, `tests/core/combat.integration.test.ts` | 02 (5.2), 04 (7.2) | Test spielt Startdeck vs. 2 Grubenratten per Commands bis zum Sieg, gleicher Seed = gleiche Events |

## M3 – Effektsystem & alle Karten
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M3.1 | Restliche EffectSpecs + ValueExpr + ConditionExpr + `script`-Effekte + `pendingChoice`/`ChooseCards` | `effects/valueExpr.ts`, `effects/conditions.ts`, `effects/moreEffects.ts`, Tests | 05 (8.1, 8.5) | Jeder Effekttyp und jede ValueExpr-Art hat einen Test |
| M3.2 | Trigger-Hooks + Dispatch-Reihenfolge; Hitze (Halbieren am Rundenende, onHeatGained/Lost); Keywords exhaust/ethereal/retain/innate/unplayable; X-Kosten; costOverride; Upgrade-Anwendung (CardUpgradeSpec) | `triggers/hooks.ts`, `triggers/dispatch.ts`, `deck/upgrade.ts`, Tests | 05 (8.3), 07 (10.1) | Keyword-, Hitze- und Upgrade-Tests grün |
| M3.3 | Kartentext-Renderer mit Platzhaltern + Live-Werten (grün/rot-Info als Daten) + i18n-Grundgerüst `de.ts`, `keywords.ts` | `core/cards/cardText.ts`, `content/i18n/de.ts`, `content/i18n/keywords.ts`, Test | 04 (7.3 letzter Absatz), 01 (3) | „Schlag“ mit 2 Kraft vs. verwundbares Ziel zeigt 12 |
| M3.4 | Karten #1–21 (Starter + Gewöhnlich) inkl. Upgrades + Texte | `content/cards/runesmith/common.ts`, `tests/content/cards-common.test.ts` | 07 (bis #21) | ≥1 Test pro Karte + Upgrade |
| M3.5 | Karten #22–39 (Ungewöhnlich) | `content/cards/runesmith/uncommon.ts`, Test | 07 (#22–39) | wie oben |
| M3.6 | Karten #40–48 (Selten) + generierte/Status-/Fluchkarten + 8 neutrale Karten | `rare.ts`, `content/cards/status.ts`, `curses.ts`, `neutral.ts`, Test | 07 (ab #40) | wie oben; Anteil `script`-Effekte ≤10 % |

## M4 – Gegner & KI Schicht 1
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M4.1 | Alle normalen Gegner Schicht 1 + Begegnungspools (leicht/schwer, keine direkte Wiederholung) + KI-Typ `script` | `content/enemies/layer1.ts`, `content/enemies/encounters.ts`, `combat/enemyAi.ts`, Test | 08 (Schicht 1 + Begegnungen), 04 (7.5) | Pools und Wiederholungsregel getestet |
| M4.2 | Skripte: Schlammling-Teilung, Kobold (Gold stehlen, Flucht, Gold zurück), Pilzhüter/Tunnelgräber-Sonderregeln | `content/scripts/layer1Scripts.ts`, Test | 08 (betroffene Zeilen) | Teilung und Flucht getestet |
| M4.3 | Eliten Schicht 1 + Boss Schlackenkönig (Phase 2) | `content/enemies/bosses.ts`, `content/scripts/bossScripts.ts`, Test | 08 (Eliten/Boss Schicht 1) | Golem-Zorn, Schwestern-Tausch, Boss-Phase-2 getestet |

## M5 – Kampf-UI
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M5.1 | Zustand-Store + Animations-Queue + Dev-Einstieg „Testkampf starten“ | `store/gameStore.ts`, `store/animationQueue.ts`, `App.tsx` | 02 (5.1, 5.2) | Store-Test: Command → State + Events |
| M5.2 | Karten-Komponente + Hand-Fächer + Design-Tokens | `ui/components/Card.tsx`, `CardHand.tsx`, `ui/styles/card.css`, `tokens.css` | 11 (12.3, 12.4) | Karten rendern, Hover-Zoom, ausgegraut ohne Glut |
| M5.3 | Spieler/Gegner-Ansicht, HP-Balken, Status-Icons, Intents, Tooltip, SVG-Icons | `PlayerView`, `EnemyView`, `HealthBar`, `StatusIcons`, `IntentIcon`, `Tooltip`, `ui/icons/*` (ggf. 5.3a/b) | 11 (12.2–12.4) | Alle Status/Intents sichtbar mit Tooltip |
| M5.4 | Kampf-Screen-Layout, Glut-Kugel, Stapel-Buttons + Stapelansicht, Zug-beenden, Zielen (Klick + Pfeil), Tastatur | `ui/screens/CombatScreen.tsx`, `EnergyOrb`, `PileButton`, `DeckViewer` | 11 (12.2, 12.3) | Kampf mit Maus komplett spielbar |
| M5.5 | Event-Player + Animationen (Framer Motion installieren), Schadenszahlen, Shake, Eingabesperre, Schnellmodus | `ui/anim/useEventPlayer.ts`, `floatingNumbers.tsx`, `shake.ts` | 11 (12.4) | Keine Konsolenfehler, Eingaben während Animation gesperrt |

## M6 – Belohnungen, Deck, Tränke
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M6.1 | Belohnungslogik: Gold, Kartenwahl mit Seltenheit + Pity + keine Duplikate + vorverbesserte Karten, Trank-Chance | `rewards/cardRewards.ts`, `goldRewards.ts`, `potionDrops.ts`, Test | 06 (9.2) | Statistiktests über 10.000 Würfe |
| M6.2 | Belohnungs-Screen + Deck-Ansicht (Overlay), Überspringen | `ui/screens/RewardScreen.tsx`, `DeckViewer` | 11 (12.1) | Karte wählen/überspringen landet korrekt im Deck |
| M6.3 | Tränke (alle 10) + Trank-Leiste + Nutzen/Abwerfen | `content/potions/potions.ts`, `ui/components/PotionBar.tsx`, Test | 09 (10.5) | Jeder Trank getestet |

## M7 – Karte & Run-Loop → **MVP**
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M7.1 | Kartengenerierung mit allen Regeln | `map/generateMap.ts`, `map/mapRules.ts`, Test + Golden-Snapshot (Seeds TEST1/TEST2) | 06 (9.1) | Regeltests + Snapshot grün |
| M7.2 | Run-Reducer: neuer Run, Knoten wählen → Raum → zurück, Schicht-Fortschritt, Game Over | `run/newRun.ts`, `run/runReducer.ts`, `run/progression.ts`, Test | 06 (9.1, 9.7), 07 (10.1) | Headless-Test läuft Schicht 1 durch (Nicht-Kampfräume vorerst als Kampf) |
| M7.3 | Karten-Screen (scrollbar, erreichbare Knoten, Legende) | `ui/screens/MapScreen.tsx`, `ui/components/MapNode.tsx` | 11 (12.1) | Pfadwahl per Maus |
| M7.4 | Hauptmenü, Charakterwahl, Game-Over-Screen, Screen-Routing | `MainMenu`, `CharacterSelect`, `GameOverScreen`, `App.tsx` | 11 (12.1) | **Schicht 1 inkl. Boss im Browser spielbar = MVP** |

## M8 – Räume
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M8.1 | Rastplatz + Upgrade-Vorschau alt/neu | `rooms/rest.ts`, `RestScreen.tsx`, Test | 06 (9.3) | Heilen/Schmieden getestet |
| M8.2 | Shop (Angebot, Rabatt, Preise, Karte entfernen) | `rooms/shop.ts`, `ShopScreen.tsx`, Test | 06 (9.4) | Preis- und Entfernen-Tests |
| M8.3 | Event-System + 6 Events Schicht 1 + „?“-Raum-Auflösung | `rooms/event.ts`, `content/events/events.ts`, `EventScreen.tsx`, Test | 06 (9.5), 09 (10.6) | Bedingungen/Ergebnisse getestet |
| M8.4 | Schatzraum | `rooms/treasure.ts`, `TreasureScreen.tsx`, Test | 06 (9.6) | Alle Raumtypen in Schicht 1 aktiv |

## M9 – Artefakte
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M9.1 | Starter + gewöhnliche Artefakte + Artefakt-Leiste mit Tooltips | `content/relics/relics.ts`, `RelicBar.tsx`, Test | 09 (10.4) | Pro Artefakt ≥1 Test |
| M9.2 | Ungewöhnliche + seltene Artefakte (inkl. Phönixfeder/onWouldDie) | `relics.ts`, Test | 09 (10.4) | Phönixfeder rettet vor Tod |
| M9.3 | Boss-Artefakte + Auswahl-Screen nach Boss + Artefakt-Drops (Elite/Schatz/Shop) | `rewards/relicDrops.ts`, UI, Test | 09 (10.4), 06 (9.2) | Boss-Artefaktwahl funktioniert |

## M10 – Schichten 2 & 3, Speichern
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M10.1 | Gegner + Eliten + Boss Schicht 2 ausarbeiten (Muster wie Schicht 1) | `content/enemies/layer2.ts`, Skripte, Test | 08 (Schicht 2), 10 (11.1) | KI-/Boss-Tests |
| M10.2 | Gegner + Eliten + Boss Schicht 3 inkl. Glutherz-Phasen | `layer3.ts`, Skripte, Test | 08 (Schicht 3) | Phasentests |
| M10.3 | Events Schicht 2 + 3 (je ≥6) + Schicht-Übergänge + Farbwelten | `events.ts`, `progression.ts` | 09 (10.6), 06 (9.7) | Übergang heilt korrekt |
| M10.4 | Speichern/Laden, Autosave, Fortsetzen, Migrationen | `save/serialize.ts`, `save/migrations.ts`, SaveStorage, Test | 12 (13.2) | Roundtrip-Test; Fortsetzen nach Seiten-Reload |
| M10.5 | Sieg-Screen + Run-Statistik | `VictoryScreen.tsx`, `GameOverScreen.tsx` | 11 (12.1) | Kompletter Run bis Glutherz spielbar |

## M11 – Balancing-Simulator
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M11.1 | Bot (Kartenwahl-Punkte + gierige Kampfsuche Tiefe 3) | `sim/bot.ts`, Test | 12 (13.4) | Bot beendet Runs ohne Fehler |
| M11.2 | Simulator + CLI + Report (`npm run sim`) | `sim/runSimulator.ts`, `sim/report.ts`, `sim/cli.ts`, `package.json` | 12 (13.4) | `sim-report.md` mit 2000 Runs |
| M11.3 | Balancing-Runden (nur `src/content` ändern) bis Zielwerte | `content/*` | 12 (13.4) | Zielwerte erreicht oder begründet |

## M12 – Polish & Meta
| Schritt | Inhalt | Dateien | Plan lesen | Fertig wenn |
|---|---|---|---|---|
| M12.1 | Prozedurales Audio + Lautstärke | `ui/audio/synth.ts`, `sfx.ts` | 11 (12.5) | Alle SFX aus 12.5 |
| M12.2 | Einstellungen + Barrierefreiheit | `settingsStore.ts`, `SettingsScreen.tsx` | 11 (12.6) | Alle Optionen wirksam |
| M12.3 | Tiefenstufen 1–10 | `run/newRun.ts`, Content-Modifikatoren, Test | 10 (11.2) | Pro Stufe ein Test |
| M12.4 | Meta-Progression + Kompendium | `meta/*`, `CompendiumScreen.tsx` | 10 (11.3) | Freischaltungen bleiben nach Reload |
| M12.5 | Tutorial im ersten Kampf + Menü-Hintergrund + Feinschliff | UI | 11 | Keine Konsolenwarnungen, Lighthouse ≥ 90 |
| M12.6 | `README.md`, `docs/CONTENT_GUIDE.md`, optional Tauri | Doku | 16 unten | Definition of Done erfüllt |

---

## Definition of Done (Gesamtprojekt)
- Ein vollständiger Run über 3 Schichten mit Endboss ist ohne Fehler spielbar.
- Alle Inhalte aus Abschnitt 10 sind implementiert und getestet.
- Gleicher Seed + gleiche Entscheidungen → identischer Run (per Test belegt).
- Speichern/Fortsetzen funktioniert nach Neuladen des Browsers.
- Balancing-Zielwerte erreicht (13.4).
- Keine Konsolenfehler/-warnungen, `npm run check` grün.
- `docs/CONTENT_GUIDE.md` erklärt, wie man Karte, Gegner, Artefakt und Event hinzufügt (mit Beispiel).
- `README.md` mit Start-, Build- und Sim-Anleitung.
