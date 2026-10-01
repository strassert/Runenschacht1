# Fortschritt Runenschacht

## Erledigt (eine Zeile pro Schritt)
- [x] M0 – Setup: Vite + React 19 + TS 6 strict, ESLint 10 (Flat) + Prettier, Vitest 5, Zustand; Ordnerstruktur; Scripts; ESLint sperrt Math.random/Date.now/React in src/core.
- [x] M1 – Core-Fundament: Typen (`src/core/types/`), RNG cyrb128+sfc32 mit 10 Streams (`withStream`), Stapel-Logik (`deck/piles.ts`, `shuffle.ts`, `upgrade.ts` – nur Flag), Konstanten, Invarianten-Checker, Core-API `src/core/index.ts`. 44 Tests.
- [x] Plan umgebaut: Masterplan in `docs/plan/*.md` aufgeteilt, Meilensteine in kleine Schritte (M2.1 …) zerlegt, Arbeitsregeln in `QWEN.md`, neues Script `npm run check`.
- [x] M2.1 – Registry + erste Inhalte: `src/core/registry.ts` (Maps + register/get für Karten, Gegner, Begegnungen, Artefakte, Tränke, Events, Skripte; unbekannte ID → Fehler mit ID), Starterkarten Schlag/Parade/Funkenschlag, Grubenratte (weighted 70/30, maxRepeat 2), `registerAllContent()` idempotent, Registry-Exporte in Core-API. 49 Tests.
- [x] M2.2 – Schadens-/Block-Formel + Status: `combat/damage.ts` (7.3 in Reihenfolge, raw ignoriert Kraft/Geschwächt/Verwundbar, Hooks als Callbacks, Dornen), `combat/block.ts` (Gewandtheit/Zerbrechlich), `combat/statuses.ts` (anwenden/stapeln, Abbau Ende der eigenen Runde, Brand zu Rundenbeginn, Hitze halbieren, Ritual, Bannrune blockt Debuffs). 91 Tests.
- [x] M2.3 – Action-Queue + Basis-Effekte: `combat/actionQueue.ts` (FIFO, front-Einreihen, 1000-Action-Schutz, Tod-Prüfung nach jeder Action → victory/defeat), `effects/basicEffects.ts` (damage/block/applyStatus/draw/gainEnergy + ValueExpr-Auswertung), `effects/targeting.ts` (TargetMode → Entity-Ids, Perspektive des Absenders). 111 Tests.
- [x] M2.4 – Kampfaufbau & Rundenablauf: `combat/combatSetup.ts` (HP-Würfel, Mischen, innate oben, onSpawn, Intents Runde 1), `combat/turn.ts` (startPlayerTurn, endPlayerTurn mit ethereal/retain, runEnemyTurn links→rechts), `combat/enemyAi.ts` (weighted mit maxRepeat, cycle mit startRandom), ehrliche Intents (damagePreview = echter Schaden). 137 Tests.
- [x] M2.5 – Commands & Kampfende: `combat/playCard.ts` (Phasen-/Hand-/unplayable-Prüfung, `cardCost` mit X-Kosten, Effekte via Action-Queue, Ablage/Erschöpfung auch nach Kampfende), `combat/victory.ts` (`combatEnded`, HP-Rückkopplung, kills/cardsPlayed/combatsWon), `combat/combatReducer.ts` (playCard/endTurn-Kette bis Kampfende; chooseReward/chooseMapNode → M6), `gainHeat` in `basicEffects.ts` (für Funkenschlag, siehe DECISIONS), Core-Exporte; Integrationstest Startdeck vs. 2 Grubenratten (Sieg, Determinismus, Invarianten pro Command). 143 Tests.

## In Arbeit
- (nichts)

## Nächster Schritt
- **ID:** M3.1 – Restliche EffectSpecs + ValueExpr + ConditionExpr + `script`-Effekte + `pendingChoice`/`ChooseCards`
- **Ziel:** Alle EffectSpec-Typen aus 8.1 implementieren; ValueExpr/ConditionExpr als eigene Module auswerten; `script`-Effekte über die Registry; `pendingChoice`/`ChooseCards` als Datenmodell.
- **Dateien:** `src/core/effects/valueExpr.ts`, `src/core/effects/conditions.ts`, `src/core/effects/moreEffects.ts`, Tests
- **Plan lesen:** `docs/plan/05-effekte-trigger.md` → nur 8.1, 8.5
- **Code nachschlagen:** `src/core/effects/basicEffects.ts`, `src/core/effects/targeting.ts`, `src/core/combat/actionQueue.ts`, `src/core/types/effects.ts`, `src/core/registry.ts`
- **Fertig wenn:** Jeder Effekttyp und jede ValueExpr-Art hat einen Test.

## Offene Punkte / Bekannte Bugs
- `npm run sim` ist bis M11 ein Platzhalter.
- `docs/CONTENT_GUIDE.md` und `README.md` kommen in M12.6.
- Framer Motion wird erst in M5.5 installiert.
- `upgradeCard` setzt nur das Flag, die `CardUpgradeSpec`-Anwendung kommt in M3.2.
- Zähler `cardsGeneratedThisCombat` / `cardsRemovedThisCombat` müssen ab M2 von der Engine gepflegt werden (Invariante).
- Trigger-Hooks `onDamageDealt` / `onHpLost` / `onBlockBroken` (7.3 Schritt 9) kommen mit der Trigger-Engine in M4; `applyDamage` nimmt deshalb Hooks als Callbacks entgegen.
- `costOverride` wird in `playCard` ausgewertet, aber nicht gelöscht (`until:'played'`); noch erzeugt kein Inhalt Overrides – Aufräumen in M3.2.
- Run-Statistik `damageDealt` / `damageTaken` wird in `finishCombat` noch nicht aktualisiert (Trigger-Engine M4, Statistik-Ausbau M7).

## Letzter Testlauf
- typecheck ✅ / lint ✅ / tests 143 ✅ 0 ❌ (Stand M2.5)
