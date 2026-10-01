// ValueExpr-Auswertung (Masterplan 8.1, Schritt M3.1a): aus basicEffects.ts
// ausgelagert. ValueContext.vars liest CombatState.counters – so verbinden
// sich consumeHeat und {kind:'var'}-Effekte über Actions und Karten hinweg.
import type { Combatant, CombatState } from '../types/state'
import type { ValueExpr } from '../types/effects'

export interface ValueContext {
  combat: CombatState
  source: Combatant
  target: Combatant | null
  vars: Record<string, number> // counters (consumeHeat speichert hier), Standard: combat.counters
  xValue: number // X-Kosten-Karten, M3+, Standard: 0
}

export function evaluateValue(expr: ValueExpr, ctx: ValueContext): number {
  if (typeof expr === 'number') return expr
  switch (expr.kind) {
    case 'perStatus': {
      const holder = expr.of === 'target' ? (ctx.target ?? ctx.source) : ctx.source
      const stacks = holder.statuses.find((s) => s.id === expr.status)?.stacks ?? 0
      return expr.base + expr.per * stacks
    }
    case 'var':
      return (ctx.vars[expr.name] ?? 0) * (expr.mul ?? 1) + (expr.add ?? 0)
    case 'x':
      return ctx.xValue * (expr.mul ?? 1) + (expr.add ?? 0)
    case 'currentBlock':
      return ctx.source.block * (expr.mul ?? 1)
    case 'cardsInPile': {
      const pile =
        expr.pile === 'draw'
          ? ctx.combat.player.drawPile
          : expr.pile === 'hand'
            ? ctx.combat.player.hand
            : expr.pile === 'discard'
              ? ctx.combat.player.discardPile
              : ctx.combat.player.exhaustPile
      return pile.length * (expr.mul ?? 1)
    }
  }
}

/** Standard-Kontext: vars = CombatState.counters, xValue = 0 (X-Verdrahtung folgt). */
export function valueCtx(
  combat: CombatState,
  source: Combatant,
  target: Combatant | null,
): ValueContext {
  return { combat, source, target, vars: combat.counters, xValue: 0 }
}
