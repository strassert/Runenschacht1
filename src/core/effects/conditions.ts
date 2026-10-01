// ConditionExpr-Auswertung (Masterplan 8.1, Schritt M3.1a): für conditional-
// Effekte (und später Trigger, M4). Bezugspunkt ist Quelle/Ziel des Effekts.
import type { Combatant, CombatState } from '../types/state'
import type { ConditionExpr } from '../types/effects'
import { getStatusStacks } from '../combat/statuses'

export interface ConditionContext {
  combat: CombatState
  source: Combatant
  target: Combatant | null
}

export function evaluateCondition(cond: ConditionExpr, ctx: ConditionContext): boolean {
  switch (cond.kind) {
    case 'targetHasStatus':
      return ctx.target !== null && getStatusStacks(ctx.target, cond.status) > 0
    case 'selfStatusAtLeast':
      return getStatusStacks(ctx.source, cond.status) >= cond.value
    case 'targetWillDie':
      // Auswertung an diesem Queue-Punkt: vorausgehender Schaden ist bereits gelaufen.
      return ctx.target !== null && ctx.target.hp <= 0
    case 'hpBelowPercent':
      // Bezieht sich auf das Ziel (DECISIONS): kein Ziel → false.
      return ctx.target !== null && ctx.target.hp * 100 < ctx.target.maxHp * cond.percent
  }
}
