// Ausführung der Basis-Effekte (Masterplan 8.1, Schritt M2.3): damage,
// block, applyStatus, draw, gainEnergy (+ gainHeat seit M2.5, für Funkenschlag). Pure: neues combat/rngStates +
// GameEvents. ValueExpr-Auswertung inklusive. Andere EffectSpec-Typen
// folgen ab M3 und sind bis dahin ein Fehler.
import type { TargetMode } from '../types/cards'
import type { EffectSpec, ValueExpr } from '../types/effects'
import type { GameEvent } from '../types/events'
import type { Combatant, CombatState, EntityId, PlayerCombatState } from '../types/state'
import type { RngStates } from '../rng/streams'
import { drawCards } from '../deck/piles'
import { applyDamage } from '../combat/damage'
import { applyBlock } from '../combat/block'
import { applyStatus } from '../combat/statuses'
import { resolveTargets } from './targeting'

/** Eine auszuführende Effect-Instanz (die Action der Queue, Masterplan 8.2). */
export interface EffectInvocation {
  effect: EffectSpec
  sourceId: EntityId
  targetId: EntityId | null
  /** Übersteuert effect.target (z. B. Gegner-KI), Standard: effect.target. */
  targetMode?: TargetMode
}

export interface EffectResult {
  combat: CombatState
  rngStates: RngStates
  events: GameEvent[]
}

export interface ValueContext {
  combat: CombatState
  source: Combatant
  target: Combatant | null
  vars: Record<string, number> // consumeHeat etc. – M3+, Standard: leer
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

function findCombatant(combat: CombatState, id: EntityId): Combatant | null {
  if (id === combat.player.id) return combat.player
  return combat.enemies.find((e) => e.id === id) ?? null
}

/** Combatant (hp/maxHp/block/statuses) in den CombatState zurückschreiben. */
function withCombatant(combat: CombatState, updated: Combatant): CombatState {
  if (updated.id === combat.player.id) {
    const player: PlayerCombatState = {
      ...combat.player,
      hp: updated.hp,
      maxHp: updated.maxHp,
      block: updated.block,
      statuses: updated.statuses,
    }
    return { ...combat, player }
  }
  return {
    ...combat,
    enemies: combat.enemies.map((e) =>
      e.id === updated.id
        ? { ...e, hp: updated.hp, maxHp: updated.maxHp, block: updated.block, statuses: updated.statuses }
        : e,
    ),
  }
}

function valueCtx(combat: CombatState, source: Combatant, target: Combatant | null): ValueContext {
  return { combat, source, target, vars: {}, xValue: 0 }
}

export function executeEffect(
  invocation: EffectInvocation,
  combat: CombatState,
  rngStates: RngStates,
): EffectResult {
  const { effect, sourceId, targetId } = invocation
  switch (effect.type) {
    case 'damage':
      return runDamage(invocation, effect, combat, rngStates)
    case 'block': {
      const source = findCombatant(combat, sourceId)
      if (source === null) return { combat, rngStates, events: [] }
      const amount = evaluateValue(effect.amount, valueCtx(combat, source, source))
      const result = applyBlock(source, amount)
      return { combat: withCombatant(combat, result.combatant), rngStates, events: result.events }
    }
    case 'applyStatus': {
      const { targets, rngStates: states } = resolveTargets(
        effect.target,
        combat,
        sourceId,
        targetId,
        rngStates,
      )
      let c = combat
      const events: GameEvent[] = []
      for (const id of targets) {
        const target = findCombatant(c, id)
        if (target === null) continue
        const source = findCombatant(c, sourceId) ?? target
        const stacks = evaluateValue(effect.stacks, valueCtx(c, source, target))
        const result = applyStatus(target, effect.status, stacks)
        c = withCombatant(c, result.combatant)
        events.push(...result.events)
      }
      return { combat: c, rngStates: states, events }
    }
    case 'draw': {
      const player = combat.player
      const count = evaluateValue(effect.count, valueCtx(combat, player, null))
      const result = drawCards(player, rngStates, count)
      return { combat: { ...combat, player: result.player }, rngStates: result.rngStates, events: result.events }
    }
    case 'gainEnergy': {
      const player = combat.player
      const amount = evaluateValue(effect.amount, valueCtx(combat, player, null))
      const total = player.energy + amount
      const events: GameEvent[] = [{ type: 'energyChanged', entityId: player.id, delta: amount, total }]
      return { combat: { ...combat, player: { ...player, energy: total } }, rngStates, events }
    }
    case 'gainHeat': {
      // Hitze ist ein Status auf der Spielerin (7.4); endOfOwnerTurn halbiert sie.
      const source = findCombatant(combat, sourceId)
      if (source === null) return { combat, rngStates, events: [] }
      const amount = evaluateValue(effect.amount, valueCtx(combat, source, null))
      const result = applyStatus(source, 'heat', amount)
      return { combat: withCombatant(combat, result.combatant), rngStates, events: result.events }
    }
    default:
      throw new Error(`Effect '${effect.type}' ist bis M2.5 nicht implementiert`)
  }
}

type DamageEffect = Extract<EffectSpec, { type: 'damage' }>

function runDamage(
  invocation: EffectInvocation,
  effect: DamageEffect,
  combat: CombatState,
  rngStates: RngStates,
): EffectResult {
  const { sourceId, targetId } = invocation
  const mode: TargetMode = effect.target ?? invocation.targetMode ?? 'enemy'
  const { targets, rngStates: states } = resolveTargets(mode, combat, sourceId, targetId, rngStates)
  const attackLike = !effect.tags?.includes('raw')
  let c = combat
  const events: GameEvent[] = []
  for (const id of targets) {
    const attacker = findCombatant(c, sourceId)
    const target = findCombatant(c, id)
    if (attacker === null || target === null) continue
    const amount = evaluateValue(effect.amount, valueCtx(c, attacker, target))
    let a = attacker
    let t = target
    for (let hit = 0; hit < (effect.hits ?? 1); hit++) {
      const result = applyDamage(a, t, amount, { attackLike })
      a = result.attacker
      t = result.target
      events.push(...result.events)
    }
    c = withCombatant(withCombatant(c, a), t)
  }
  return { combat: c, rngStates: states, events }
}
