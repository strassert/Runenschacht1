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
- [x] M3.1a – Effekte (Teil 1/2 von M3.1): `effects/valueExpr.ts` (ValueExpr-Module, `vars` = combat.counters), `effects/conditions.ts` (alle 4 ConditionExpr), `effects/moreEffects.ts` (consumeHeat, heal, loseHp, addCard, discard/exhaustFromHand/upgradeInHand mit choice 'random', gainGold, gainMaxHp, conditional, repeat, script), `script` über Registry + veränderbarer `EffectScriptCtx`; M3.1 wegen Dateiumfang geteilt (M3.1a/M3.1b, DECISIONS). 172 Tests.
- [x] M3.1b – Spieler-Auswahl (Teil 2/2 von M3.1): `PendingChoice`/`QueuedAction` in `types/state.ts`, Command `ChooseCards`; Action-Queue pausiert bei `choice:'player'` (discard/exhaustFromHand/upgradeInHand) und fährt nach `ChooseCards` mit dem Queue-Rest fort (Kandidaten = Hand ohne gespielte Karte, Auto-Wahl bei Kandidaten ≤ count, Ketten-Pausen möglich); `finishCombat` rückkoppelt `counters.goldGained` + Kampf-maxHp in den RunState. 183 Tests.

## In Arbeit
- (nichts)

## Nächster Schritt
- **ID:** M3.2 – Trigger-Hooks + Dispatch, Keywords, X-Kosten, Upgrade-Anwendung
- **Ziel:** Trigger-Hooks + Dispatch-Reihenfolge (8.3); Hitze halbieren am Rundenende via onHeatGained/Lost; Keywords exhaust/ethereal/retain/innate/unplayable; X-Kosten; `costOverride`; `CardUpgradeSpec`-Anwendung (10.1).
- **Dateien:** `src/core/triggers/hooks.ts`, `src/core/triggers/dispatch.ts`, `src/core/deck/upgrade.ts`, Tests
- **Plan lesen:** `docs/plan/05-effekte-trigger.md` → nur 8.3; `docs/plan/07-karten.md` → nur 10.1
- **Code nachschlagen:** `src/core/combat/statuses.ts` (Hitse-Halbierung), `src/core/combat/turn.ts` (ethereal/retain), `src/core/combat/playCard.ts` (cardCost/X), `src/core/deck/upgrade.ts`
- **Fertig wenn:** Keyword-, Hitze- und Upgrade-Tests grün.

## Offene Punkte / Bekannte Bugs
- `npm run sim` ist bis M11 ein Platzhalter.
- `docs/CONTENT_GUIDE.md` und `README.md` kommen in M12.6.
- Framer Motion wird erst in M5.5 installiert.
- `upgradeCard` setzt nur das Flag, die `CardUpgradeSpec`-Anwendung kommt in M3.2.
- Zähler `cardsGeneratedThisCombat` / `cardsRemovedThisCombat` müssen ab M2 von der Engine gepflegt werden (Invariante).
- Trigger-Hooks `onDamageDealt` / `onHpLost` / `onBlockBroken` (7.3 Schritt 9) kommen mit der Trigger-Engine in M4; `applyDamage` nimmt deshalb Hooks als Callbacks entgegen.
- `costOverride` wird in `playCard` ausgewertet, aber nicht gelöscht (`until:'played'`); noch erzeugt kein Inhalt Overrides – Aufräumen in M3.2.
- Run-Statistik `damageDealt` / `damageTaken` wird in `finishCombat` noch nicht aktualisiert (Trigger-Engine M4, Statistik-Ausbau M7).
- `cardUpgraded`-Event fehlt (events.ts): `upgradeInHand` erzeugt derzeit kein Event.
- `ValueContext.xValue` ist in `playCard` noch nicht verdrahtet (X-Kosten → Wert fehlt, M3.2+).
- `choice:'player'` innerhalb von `repeat`/`conditional`/`script` wird nicht abgefangen (nur Queue-Top-Level pausiert) – bei Bedarf in M3.2/M4 nachrüsten.

## Letzter Testlauf
- typecheck ✅ / lint ✅ / tests 183 ✅ 0 ❌ (Stand M3.1b)
