// Schadensformel (Masterplan 7.3) – die Reihenfolge der Schritte ist
// verbindlich. Pure: Angreifer und Ziel werden kopiert, neue Objekte +
// Events zurückgegeben. Hooks (Artefakte/Powers) kommen als Callbacks,
// damit der Core keine Trigger-Engine braucht (Trigger: M4).
import type { GameEvent } from '../types/events'
import type { Combatant } from '../types/state'
import { getStatusStacks } from './statuses'

export interface DamageOptions {
  /**
   * true (Standard) = Angriff bzw. Effekt mit Tag 'attackLike': Kraft,
   * Geschwächt und Verwundbar wirken. false = 'raw' (Brand, Dornen,
   * Inferno): ignoriert Kraft/Geschwächt/Verwundbar.
   */
  attackLike?: boolean
  /** Hook modifyOutgoingDamage (Artefakte/Powers des Angreifers). */
  outgoing?: (damage: number) => number
  /** Hook modifyIncomingDamage (Artefakte/Powers des Ziels). */
  incoming?: (damage: number) => number
}

/**
 * Schritte 1–7 der 7.3-Formel: Basis + Kraft, ×0,75 bei Geschwächt,
 * ×1,5 bei Verwundbar, Hooks, floor (min 0), Körperlos → auf 1 begrenzen.
 * Block und HP-Abzug (Schritte 8–9) übernimmt applyDamage.
 */
export function computeDamage(
  base: number,
  attacker: Combatant,
  target: Combatant,
  options: DamageOptions = {},
): number {
  const { attackLike = true, outgoing, incoming } = options
  let damage = base

  if (attackLike) {
    damage += getStatusStacks(attacker, 'strength')
    if (getStatusStacks(attacker, 'weak') > 0) damage *= 0.75
    if (getStatusStacks(target, 'vulnerable') > 0) damage *= 1.5
  }
  if (outgoing) damage = outgoing(damage)
  if (incoming) damage = incoming(damage)

  damage = Math.max(0, Math.floor(damage))
  if (getStatusStacks(target, 'intangible') > 0) damage = Math.min(damage, 1)
  return damage
}

export interface DamageResult<A extends Combatant, T extends Combatant> {
  attacker: A
  target: T
  events: GameEvent[]
  /** HP-Verlust des Ziels (nach Block-Abzug). */
  hpLost: number
  /** durch Block abgenommener Schaden. */
  blocked: number
}

/**
 * Schritt 8: Block des Ziels zieht ab, Rest reduziert HP.
 * Schritt 9 (in diesem Schritt nur Dornen): Angreifer erleidet Dornen-Schaden
 * pro Treffer – nur bei attackLike-Schaden, 'raw' wie Brand löst keine
 * Dornen aus. onDamageDealt/onHpLost/onBlockBroken folgen mit M4 (Triggers).
 */
export function applyDamage<A extends Combatant, T extends Combatant>(
  attacker: A,
  target: T,
  base: number,
  options: DamageOptions = {},
): DamageResult<A, T> {
  const { attackLike = true } = options
  const damage = computeDamage(base, attacker, target, options)

  const blocked = Math.min(target.block, damage)
  const newBlock = target.block - blocked
  const newHp = Math.max(0, target.hp - (damage - blocked))
  const hpLost = target.hp - newHp // tatsächlicher Verlust (nach Clamp auf 0)

  const t: T = { ...target, block: newBlock, hp: newHp }
  const events: GameEvent[] = [
    { type: 'damageDealt', sourceId: attacker.id, targetId: target.id, amount: damage, blocked },
  ]
  if (hpLost > 0) {
    events.push({ type: 'hpChanged', entityId: target.id, delta: -hpLost, total: newHp })
  }

  let a: A = attacker
  const thorns = getStatusStacks(target, 'thorns')
  if (attackLike && thorns > 0) {
    // Dornen sind 'raw': Kraft/Geschwächt/Verwundbar wirken nicht,
    // Körperlos des Angreifers begrenzt jedoch auf 1.
    let thornDamage = thorns
    if (getStatusStacks(a, 'intangible') > 0) thornDamage = Math.min(thornDamage, 1)
    const thornBlocked = Math.min(a.block, thornDamage)
    const thornNewHp = Math.max(0, a.hp - (thornDamage - thornBlocked))
    const thornHpLost = a.hp - thornNewHp
    a = { ...a, block: a.block - thornBlocked, hp: thornNewHp }
    events.push({
      type: 'damageDealt',
      sourceId: target.id,
      targetId: attacker.id,
      amount: thornDamage,
      blocked: thornBlocked,
    })
    if (thornHpLost > 0) {
      events.push({ type: 'hpChanged', entityId: attacker.id, delta: -thornHpLost, total: a.hp })
    }
  }

  return { attacker: a, target: t, events, hpLost, blocked }
}
