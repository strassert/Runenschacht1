# Effekt- & Trigger-System

> Teil des Runenschacht-Masterplans (Abschnitte 8). Index: `docs/MASTERPLAN.md`. Lies nur, was dein aktueller Schritt braucht.

## 8. Effekt- & Trigger-System

### 8.1 Deklarative Effekte (EffectSpec)
Karten, Gegner-Moves, Tränke, Artefakte und Events verwenden dieselben Bausteine:

```ts
export type EffectSpec =
  | { type: 'damage'; amount: ValueExpr; hits?: number; target?: TargetMode; tags?: string[] }
  | { type: 'block'; amount: ValueExpr; target?: 'self' }
  | { type: 'applyStatus'; status: StatusId; stacks: ValueExpr; target: TargetMode | 'self' }
  | { type: 'draw'; count: ValueExpr }
  | { type: 'gainEnergy'; amount: ValueExpr }
  | { type: 'gainHeat'; amount: ValueExpr }
  | { type: 'consumeHeat'; store: string }           // speichert Menge in Kontextvariable
  | { type: 'heal'; amount: ValueExpr }
  | { type: 'loseHp'; amount: ValueExpr; target: TargetMode | 'self' }
  | { type: 'addCard'; cardId: CardId; to: 'hand' | 'draw' | 'discard'; count: number; upgraded?: boolean }
  | { type: 'discard'; count: number; choice: 'player' | 'random' }
  | { type: 'exhaustFromHand'; count: number; choice: 'player' | 'random' }
  | { type: 'upgradeInHand'; count: number | 'all'; choice: 'player' | 'random' }
  | { type: 'gainGold'; amount: ValueExpr }
  | { type: 'gainMaxHp'; amount: ValueExpr }
  | { type: 'conditional'; if: ConditionExpr; then: EffectSpec[]; else?: EffectSpec[] }
  | { type: 'repeat'; times: ValueExpr; effects: EffectSpec[] }
  | { type: 'script'; scriptId: string; params?: Record<string, number> };

export type ValueExpr =
  | number
  | { kind: 'perStatus'; status: StatusId; of: 'self' | 'target'; base: number; per: number }
  | { kind: 'var'; name: string; mul?: number; add?: number }     // z. B. verbrauchte Hitze
  | { kind: 'x'; mul?: number; add?: number }                      // X-Kosten-Karten
  | { kind: 'currentBlock'; mul?: number }
  | { kind: 'cardsInPile'; pile: 'hand' | 'draw' | 'discard' | 'exhaust'; mul?: number };

export type ConditionExpr =
  | { kind: 'targetHasStatus'; status: StatusId }
  | { kind: 'selfStatusAtLeast'; status: StatusId; value: number }
  | { kind: 'targetWillDie' }                   // „Wenn tödlich …“
  | { kind: 'hpBelowPercent'; percent: number };
```

**Regel:** Mindestens 90 % aller Karten müssen rein deklarativ umsetzbar sein. Für den Rest gibt es `script`-Effekte, registriert in `src/content/scripts/` mit eindeutiger ID.

### 8.2 Action-Queue
Effekte werden nicht direkt ausgeführt, sondern als Actions in eine **FIFO-Queue** gelegt. Trigger können neue Actions **ans Ende** oder **nach vorne** (für Reaktionen wie Dornen) einreihen. Die Queue wird abgearbeitet, bis sie leer ist. Schutz gegen Endlosschleifen: max. 1000 Actions pro Command → Fehler werfen und loggen.

Nach jeder Action wird geprüft: Gegner tot? Spieler tot? Kampf vorbei? → Queue leeren und Kampf beenden.

### 8.3 Trigger-Hooks
Artefakte, Powers und Status registrieren Handler für diese Hooks (feste Reihenfolge: Status → Powers → Artefakte in Erhaltsreihenfolge):

```
onCombatStart, onCombatEnd,
onPlayerTurnStart, onPlayerTurnEnd, onEnemyTurnStart, onEnemyTurnEnd,
onCardPlayed(card), onCardDrawn(card), onCardExhausted(card), onCardDiscarded(card),
onAttackPlayed, onSkillPlayed, onPowerPlayed,
modifyOutgoingDamage(ctx) → number, modifyIncomingDamage(ctx) → number, modifyBlock(ctx) → number,
onDamageDealt(ctx), onHpLost(entity, amount), onBlockGained, onBlockBroken,
onStatusApplied(entity, status), onHeatGained(amount), onHeatLost(amount),
onEnemyDied(enemy), onWouldDie(entity) → boolean (Rettung),
onShuffle, onGoldGained, onRestSite, onShopEnter, onRewardGenerated, onPotionUsed
```

### 8.4 Registries (Core kennt keine Inhalte)
- `src/core/registry.ts` hält Maps für Karten, Gegner, Begegnungen, Artefakte, Tränke, Events und Skripte (`registerCard(def)`, `getCard(id)`, …). Unbekannte ID → Fehler mit ID im Text.
- Der Core importiert **nie** aus `src/content`. Inhalte registrieren sich selbst: `src/content/index.ts` exportiert `registerAllContent()`, das App-Start, Tests und Simulator einmal aufrufen (idempotent).
- Skript-Effekte und Skript-KI werden genauso per ID registriert (`registerScript('slime_split', fn)`).

### 8.5 Spielerentscheidungen mitten im Effekt (ab M3.1)
- Effekte mit `choice: 'player'` (discard, exhaustFromHand, upgradeInHand, „Weitblick“ …) pausieren die Queue: `CombatState.pendingChoice = { kind, count, candidates: CardUid[], sourceCardUid }`.
- Solange `pendingChoice` gesetzt ist, akzeptiert der Core nur `Command { type: 'ChooseCards', uids }`. Danach läuft die Queue weiter.
- Gibt es höchstens so viele Kandidaten wie `count`, wird ohne Pause automatisch gewählt.
- UI, Tests und Simulator-Bot benutzen alle denselben Weg.
