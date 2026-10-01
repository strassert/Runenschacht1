// Erweiterte EffectSpecs (Masterplan 8.1, Schritt M3.1a): consumeHeat, heal,
// loseHp, addCard, discard/exhaustFromHand/upgradeInHand (choice 'random'),
// gainGold, gainMaxHp, conditional, repeat, script. choice 'player'
// (pendingChoice, 8.5) und die Run-Rückkopplung von Gold/max HP folgen in
// M3.1b/M6. basicEffects.ts delegiert seinen default-Fall hierher.
import type { CardInstance, CardUid } from '../types/cards'
import type { EffectSpec } from '../types/effects'
import type { GameEvent } from '../types/events'
import type { Combatant, CombatState, EntityId, PlayerCombatState } from '../types/state'
import type { RngStates } from '../rng/streams'
import { withStream } from '../rng/streams'
import { MAX_HAND, UID_PREFIX } from '../constants'
import { getCard, getScript } from '../registry'
import { upgradeCard } from '../deck/upgrade'
import { discardCard, exhaustCard } from '../deck/piles'
import { getStatusStacks } from '../combat/statuses'
import { resolveTargets } from './targeting'
import { evaluateValue, valueCtx } from './valueExpr'
import { evaluateCondition } from './conditions'
import {
  executeEffect,
  findCombatant,
  withCombatant,
  type EffectInvocation,
  type EffectResult,
} from './basicEffects'

const MAX_REPEAT_TIMES = 100

/** Kontext für registrierte Script-Funktionen (8.1 'script'): Scripts ändern
 *  den Kampf nicht selbst, sie deklarieren zusätzliche EffectSpecs in ctx.effects. */
export interface EffectScriptCtx {
  combat: CombatState
  rngStates: RngStates
  sourceId: EntityId
  targetId: EntityId | null
  vars: Record<string, number>
  xValue: number
  effects: EffectSpec[]
}

function mustCombatant(combat: CombatState, id: EntityId): Combatant {
  const c = findCombatant(combat, id)
  if (c === null) throw new Error(`Effekt: Kampfeinheit '${id}' nicht gefunden`)
  return c
}

/** Rekursive Ausführung von Unter-Effekten (conditional/repeat/script) via executeEffect. */
function runNested(
  effects: readonly EffectSpec[],
  invocation: EffectInvocation,
  combat: CombatState,
  rngStates: RngStates,
): EffectResult {
  let c = combat
  let states = rngStates
  const events: GameEvent[] = []
  for (const effect of effects) {
    const r = executeEffect({ ...invocation, effect }, c, states)
    c = r.combat
    states = r.rngStates
    events.push(...r.events)
  }
  return { combat: c, rngStates: states, events }
}

/** Zufällig Karten-UIDs aus der Hand wählen (RNG-Stream 'combat', wie randomEnemy). */
function pickHandUids(
  hand: readonly CardInstance[],
  count: number,
  rngStates: RngStates,
): { uids: CardUid[]; rngStates: RngStates } {
  let states = rngStates
  const pool = [...hand]
  const uids: CardUid[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const { value, states: next } = withStream(states, 'combat', (rng) => rng.pick(pool))
    states = next
    pool.splice(pool.indexOf(value), 1)
    uids.push(value.uid)
  }
  return { uids, rngStates: states }
}

function withGeneratedCard(
  player: PlayerCombatState,
  card: CardInstance,
  to: 'hand' | 'draw' | 'discard',
): PlayerCombatState {
  const piles =
    to === 'hand'
      ? { hand: [...player.hand, card] }
      : to === 'draw'
        ? { drawPile: [...player.drawPile, card] }
        : { discardPile: [...player.discardPile, card] }
  return { ...player, ...piles, cardsGeneratedThisCombat: player.cardsGeneratedThisCombat + 1 }
}

export function executeExtendedEffect(
  invocation: EffectInvocation,
  combat: CombatState,
  rngStates: RngStates,
): EffectResult {
  const { effect, sourceId, targetId } = invocation
  switch (effect.type) {
    case 'consumeHeat': {
      // Hitze wird als Status entfernt; die Menge landet in counters[store]
      // (ValueContext.vars in valueExpr.ts liest genau dort).
      const source = mustCombatant(combat, sourceId)
      const heat = getStatusStacks(source, 'heat')
      let c = combat
      const events: GameEvent[] = []
      if (heat > 0) {
        c = withCombatant(c, { ...source, statuses: source.statuses.filter((s) => s.id !== 'heat') })
        events.push({ type: 'statusRemoved', targetId: sourceId, status: 'heat' })
      }
      c = { ...c, counters: { ...c.counters, [effect.store]: heat } }
      return { combat: c, rngStates, events }
    }
    case 'heal': {
      const source = mustCombatant(combat, sourceId)
      const amount = evaluateValue(effect.amount, valueCtx(combat, source, null))
      const hp = Math.min(source.maxHp, source.hp + amount)
      const events: GameEvent[] = [
        { type: 'hpChanged', entityId: sourceId, delta: hp - source.hp, total: hp },
      ]
      return { combat: withCombatant(combat, { ...source, hp }), rngStates, events }
    }
    case 'loseHp': {
      // Direkter HP-Verlust – Block ist irrelevant (7.3 gilt nur für Schaden).
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
        const source = findCombatant(c, sourceId)
        if (target === null || source === null) continue
        const amount = evaluateValue(effect.amount, valueCtx(c, source, target))
        const hp = Math.max(0, target.hp - amount)
        events.push({ type: 'hpChanged', entityId: id, delta: hp - target.hp, total: hp })
        c = withCombatant(c, { ...target, hp })
      }
      return { combat: c, rngStates: states, events }
    }
    case 'addCard': {
      const def = getCard(effect.cardId) // unbekannte ID → Fehler mit ID
      const count = Math.max(0, Math.floor(effect.count))
      let player = combat.player
      const events: GameEvent[] = []
      for (let i = 0; i < count; i++) {
        const card: CardInstance = {
          uid: `${UID_PREFIX}gen${player.cardsGeneratedThisCombat + 1}`,
          defId: def.id,
          upgraded: effect.upgraded ?? false,
        }
        // Volle Hand → Überlauf in die Ablage (wie drawCards).
        const to = effect.to === 'hand' && player.hand.length >= MAX_HAND ? 'discard' : effect.to
        player = withGeneratedCard(player, card, to)
        events.push({ type: 'cardGenerated', cardUid: card.uid, cardId: def.id, to })
      }
      return { combat: { ...combat, player }, rngStates, events }
    }
    case 'discard': {
      if (effect.choice === 'player') {
        throw new Error(`discard: choice 'player' (pendingChoice) ist bis M3.1b nicht implementiert`)
      }
      const { uids, rngStates: states } = pickHandUids(combat.player.hand, effect.count, rngStates)
      let player = combat.player
      const events: GameEvent[] = []
      for (const uid of uids) {
        const moved = discardCard(player, uid)
        player = moved.player
        events.push(...moved.events)
      }
      return { combat: { ...combat, player }, rngStates: states, events }
    }
    case 'exhaustFromHand': {
      if (effect.choice === 'player') {
        throw new Error(
          `exhaustFromHand: choice 'player' (pendingChoice) ist bis M3.1b nicht implementiert`,
        )
      }
      const { uids, rngStates: states } = pickHandUids(combat.player.hand, effect.count, rngStates)
      let player = combat.player
      const events: GameEvent[] = []
      for (const uid of uids) {
        const moved = exhaustCard(player, uid)
        player = moved.player
        events.push(...moved.events)
      }
      return { combat: { ...combat, player }, rngStates: states, events }
    }
    case 'upgradeInHand': {
      if (effect.choice === 'player') {
        throw new Error(
          `upgradeInHand: choice 'player' (pendingChoice) ist bis M3.1b nicht implementiert`,
        )
      }
      const count = effect.count === 'all' ? combat.player.hand.length : effect.count
      const { uids, rngStates: states } = pickHandUids(combat.player.hand, count, rngStates)
      const chosen = new Set(uids)
      const player = {
        ...combat.player,
        hand: combat.player.hand.map((c) => (chosen.has(c.uid) ? upgradeCard(c) : c)),
      }
      // Ein cardUpgraded-Event gibt es noch nicht (Offener Punkt) – state ist sofort korrekt.
      return { combat: { ...combat, player }, rngStates: states, events: [] }
    }
    case 'gainGold': {
      // Gold wird in counters gepuffert; Run-Rückkopplung (run.gold) folgt M3.1b/M6.
      const source = mustCombatant(combat, sourceId)
      const amount = evaluateValue(effect.amount, valueCtx(combat, source, null))
      const total = (combat.counters['goldGained'] ?? 0) + amount
      const events: GameEvent[] = [{ type: 'goldChanged', delta: amount, total }]
      return {
        combat: { ...combat, counters: { ...combat.counters, goldGained: total } },
        rngStates,
        events,
      }
    }
    case 'gainMaxHp': {
      // Max-HP steigt im Kampf, aktuelle HP steigt mit (cap auf neues maxHp).
      const source = mustCombatant(combat, sourceId)
      const amount = evaluateValue(effect.amount, valueCtx(combat, source, null))
      const maxHp = source.maxHp + amount
      const hp = Math.min(maxHp, source.hp + amount)
      const events: GameEvent[] = [
        { type: 'hpChanged', entityId: sourceId, delta: hp - source.hp, total: hp },
      ]
      return { combat: withCombatant(combat, { ...source, maxHp, hp }), rngStates, events }
    }
    case 'conditional': {
      const source = mustCombatant(combat, sourceId)
      const target = targetId !== null ? findCombatant(combat, targetId) : null
      const branch = evaluateCondition(effect.if, { combat, source, target })
        ? effect.then
        : (effect.else ?? [])
      return runNested(branch, invocation, combat, rngStates)
    }
    case 'repeat': {
      const source = mustCombatant(combat, sourceId)
      const target = targetId !== null ? findCombatant(combat, targetId) : null
      const times = Math.max(0, Math.floor(evaluateValue(effect.times, valueCtx(combat, source, target))))
      if (times > MAX_REPEAT_TIMES) {
        throw new Error(`repeat: ${times} Wiederholungen über dem Maximum ${MAX_REPEAT_TIMES}`)
      }
      let c = combat
      let states = rngStates
      const events: GameEvent[] = []
      for (let i = 0; i < times; i++) {
        const r = runNested(effect.effects, invocation, c, states)
        c = r.combat
        states = r.rngStates
        events.push(...r.events)
      }
      return { combat: c, rngStates: states, events }
    }
    case 'script': {
      const fn = getScript(effect.scriptId)
      const ctx: EffectScriptCtx = {
        combat,
        rngStates,
        sourceId,
        targetId,
        vars: combat.counters,
        xValue: 0,
        effects: [],
      }
      fn(ctx, effect.params)
      return runNested(ctx.effects, invocation, combat, rngStates)
    }
    default:
      throw new Error(`executeExtendedEffect: Effect '${effect.type}' ist kein Extended-Effect`)
  }
}
