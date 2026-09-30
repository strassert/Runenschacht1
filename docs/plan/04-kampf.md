# Kampf-Engine

> Teil des Runenschacht-Masterplans (Abschnitte 7). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

## 7. Kampf-Engine

### 7.1 Grundwerte
| Wert | Standard |
|---|---|
| Start-HP Runenschmiedin | 75 |
| Glut (Energie) pro Runde | 3 |
| Karten ziehen pro Runde | 5 |
| Max. Handgröße | 10 (Überzählige gezogene Karten → Ablagestapel) |
| Trank-Slots | 3 |
| Start-Gold | 99 |

### 7.2 Kampfablauf
```
Kampfbeginn:
  1. Gegner erzeugen (HP würfeln, onSpawn-Effekte)
  2. Deck kopieren → Nachziehstapel mischen (Stream 'shuffle'); 'innate'-Karten nach oben
  3. Trigger: onCombatStart (Artefakte, z. B. +3 Hitze)
  4. Gegner-Intents für Runde 1 bestimmen
  5. → Spielerrunde

Spielerrunde:
  1. turn += 1; Glut = maxEnergy (+ Boni)
  2. Block des Spielers verfällt (außer Effekte wie „Runenbarriere“)
  3. Trigger: onPlayerTurnStart (Powers, Artefakte, Brand/Status-Ticks auf dem Spieler)
  4. 5 Karten ziehen (Nachziehstapel leer → Ablagestapel mischen und nachziehen)
  5. Spieler spielt beliebig Karten (Glut prüfen, Ziel prüfen) / nutzt Tränke
  6. Spieler drückt „Zug beenden“
  7. Trigger: onPlayerTurnEnd (z. B. Hitze halbieren, Verbrennung-Karten)
  8. Handkarten: 'ethereal' → erschöpfen; 'retain' → bleiben; Rest → Ablage
  9. Debuff-Dauer auf dem Spieler (vulnerable/weak/frail) −1

Gegnerrunde:
  1. Block aller Gegner verfällt
  2. Trigger: onEnemyTurnStart pro Gegner (Brand-Schaden, Ritual usw.)
  3. Jeder lebende Gegner führt seinen angekündigten Move aus (links → rechts)
  4. Debuff-Dauer auf Gegnern −1
  5. Neue Intents würfeln
  6. → Spielerrunde

Kampfende:
  - Alle Gegner tot (oder geflohen) → victory → Trigger onCombatEnd → Belohnungs-Screen
  - Spieler-HP ≤ 0 → defeat (vorher: Trigger onWouldDie für Artefakte/Tränke mit Wiederbelebung)
```

### 7.3 Schadensformel (Reihenfolge ist verbindlich!)
```
Angriffsschaden eines Angreifers A auf Ziel Z:
  1. basis = Kartenwert (inkl. Upgrade und dynamischer Werte wie „+1 pro Hitze“)
  2. + Kraft(A)                                   (Kraft kann negativ sein)
  3. × 0,75 wenn A „Geschwächt“ hat
  4. × 1,5  wenn Z „Verwundbar“ hat
  5. Modifikatoren aus Artefakten/Powers (Hooks modifyOutgoingDamage / modifyIncomingDamage)
  6. abrunden (floor), Minimum 0
  7. Z „Körperlos“ (intangible) → auf 1 begrenzen
  8. Block von Z zieht ab; Rest reduziert HP
  9. Trigger: onDamageDealt / onHpLost / onBlockBroken / Dornen

Nicht-Angriffs-Schaden (Brand, Dornen, Karten wie „Inferno“ mit Vermerk 'raw'):
  - ignoriert Kraft/Geschwächt, Verwundbar gilt NUR bei Angriffen und Karteneffekten mit Tag 'attackLike'

Block-Formel:
  basis + Gewandtheit(dexterity), × 0,75 bei „Zerbrechlich“ (frail), floor, min 0
```
Die im Kartentext angezeigte Zahl muss **live** diese Formel widerspiegeln (grün = erhöht, rot = verringert), bezogen auf das aktuell anvisierte Ziel.

### 7.4 Status-Effekte
| ID | Name (DE) | Wirkung | Abbau |
|---|---|---|---|
| strength | Kraft | +X Angriffsschaden je Treffer | dauerhaft im Kampf |
| dexterity | Gewandtheit | +X Block je Blockkarte | dauerhaft im Kampf |
| vulnerable | Verwundbar | erhält 50 % mehr Angriffsschaden | −1 pro Runde |
| weak | Geschwächt | verursacht 25 % weniger Angriffsschaden | −1 pro Runde |
| frail | Zerbrechlich | erhält 25 % weniger Block | −1 pro Runde |
| burn | Brand | verliert X HP zu Rundenbeginn, dann −1 | −1 pro Runde |
| thorns | Dornen | Angreifer erleidet X Schaden pro Treffer | dauerhaft |
| heat | Hitze | Ressource der Runenschmiedin (siehe 10.1) | wird am Rundenende halbiert (abrunden) |
| ritual | Ritual | +X Kraft am Ende jeder eigenen Runde | dauerhaft |
| artifact | Bannrune | blockiert den nächsten Debuff, −1 | pro geblocktem Debuff |
| intangible | Körperlos | aller Schaden/HP-Verlust auf 1 begrenzt | −1 pro Runde |

Debuffs, die in derselben Runde angewendet werden, in der sie abgebaut würden, dürfen nicht sofort verfallen: Abbau passiert am **Ende der eigenen Runde des Trägers** (Spieler: nach Spielerrunde, Gegner: nach Gegnerrunde).

### 7.5 Gegner-KI
- **weighted:** Moves nach Gewichten würfeln (Stream 'enemyAi'), kein Move öfter als `maxRepeat` hintereinander.
- **cycle:** feste Reihenfolge, optional zufälliger Startpunkt.
- **script:** registrierte Funktion `(enemy, combat, rng) => moveId` für Bosse und Spezialgegner (Phasen, HP-Schwellen, Aufteilen).
- Intents sind **immer ehrlich**: Der angezeigte Schaden = tatsächlicher Schaden nach Formel (inkl. Kraft des Gegners, Geschwächt, Verwundbar des Spielers).
