// Status-Effekte (Masterplan 7.4): Anwenden/Stapeln, Bannrune blockiert
// Debuffs, Abbau am ENDE der eigenen Runde des Trägers (Spieler: nach
// Spielerrunde, Gegner: nach Gegnerrunde). Brand zählt zu Rundenbeginn ab.
// Alle Funktionen sind pure: sie geben neue Objekte + Events zurück.
import type { StatusId } from '../types/effects'
import type { GameEvent } from '../types/events'
import type { Combatant } from '../types/state'

/**
 * Debuffs im Sinne der Bannrune („blockiert den nächsten Debuff“).
 * Der Plan listet keine explizite Debuff-Menge – siehe DECISIONS.md.
 */
export const DEBUFF_STATUSES: readonly StatusId[] = ['vulnerable', 'weak', 'frail', 'burn']

/** Statusse, die am Ende der eigenen Runde des Trägers um 1 abgebaut werden. */
const DECAY_PER_TURN: readonly StatusId[] = ['vulnerable', 'weak', 'frail', 'intangible']

export interface StatusResult<C extends Combatant> {
  combatant: C
  events: GameEvent[]
  /** true, wenn eine Bannrune den Debuff blockiert hat. */
  blocked: boolean
}

export interface TurnTickResult<C extends Combatant> {
  combatant: C
  events: GameEvent[]
}

export function getStatusStacks(combatant: Combatant, status: StatusId): number {
  return combatant.statuses.find((s) => s.id === status)?.stacks ?? 0
}

/** Stapelanzahl ändern; bei <= 0 fällt der Status weg. */
function addStacks<C extends Combatant>(combatant: C, status: StatusId, delta: number): C {
  const existing = combatant.statuses.find((s) => s.id === status)
  if (existing === undefined) {
    if (delta <= 0) return combatant
    return { ...combatant, statuses: [...combatant.statuses, { id: status, stacks: delta }] }
  }
  const total = existing.stacks + delta
  const statuses =
    total <= 0
      ? combatant.statuses.filter((s) => s.id !== status)
      : combatant.statuses.map((s) => (s.id === status ? { ...s, stacks: total } : s))
  return { ...combatant, statuses }
}

/**
 * Status anwenden; gleiche Status stapeln sich. Eine vorhandene Bannrune
 * verbraucht sich und verhindert den Debuff (bleibt sonst ungeändert).
 */
export function applyStatus<C extends Combatant>(
  combatant: C,
  status: StatusId,
  stacks: number,
): StatusResult<C> {
  if (stacks < 0) {
    throw new Error(`applyStatus: negative Stapelanzahl ${stacks}`)
  }
  if (stacks === 0) {
    return { combatant, events: [], blocked: false }
  }

  const artifact = getStatusStacks(combatant, 'artifact')
  if (DEBUFF_STATUSES.includes(status) && artifact > 0) {
    const remaining = artifact - 1
    const c = addStacks(combatant, 'artifact', -1)
    const events: GameEvent[] =
      remaining <= 0
        ? [{ type: 'statusRemoved', targetId: combatant.id, status: 'artifact' }]
        : [{ type: 'statusApplied', targetId: combatant.id, status: 'artifact', stacks: -1, total: remaining }]
    return { combatant: c, events, blocked: true }
  }

  const c = addStacks(combatant, status, stacks)
  return {
    combatant: c,
    events: [
      { type: 'statusApplied', targetId: combatant.id, status, stacks, total: getStatusStacks(c, status) },
    ],
    blocked: false,
  }
}

/**
 * Ende der eigenen Runde des Trägers: Ritual gibt +X Kraft, Hitze wird
 * halbiert (abrunden), Verwundbar/Geschwächt/Zerbrechlich/Körperlos −1.
 * Brand und dauerhafte Status (Kraft, Gewandtheit, Dornen, Bannrune) bleiben.
 */
export function endOfOwnerTurn<C extends Combatant>(combatant: C): TurnTickResult<C> {
  let c = combatant
  const events: GameEvent[] = []

  const ritual = getStatusStacks(c, 'ritual')
  if (ritual > 0) {
    c = addStacks(c, 'strength', ritual)
    events.push({
      type: 'statusApplied',
      targetId: c.id,
      status: 'strength',
      stacks: ritual,
      total: getStatusStacks(c, 'strength'),
    })
  }

  const heat = getStatusStacks(c, 'heat')
  if (heat > 0) {
    const halved = Math.floor(heat / 2)
    c = addStacks(c, 'heat', halved - heat)
    events.push(
      halved === 0
        ? { type: 'statusRemoved', targetId: c.id, status: 'heat' }
        : { type: 'statusApplied', targetId: c.id, status: 'heat', stacks: halved - heat, total: halved },
    )
  }

  for (const status of DECAY_PER_TURN) {
    const stacks = getStatusStacks(c, status)
    if (stacks <= 0) continue
    c = addStacks(c, status, -1)
    events.push(
      stacks - 1 <= 0
        ? { type: 'statusRemoved', targetId: c.id, status }
        : { type: 'statusApplied', targetId: c.id, status, stacks: -1, total: stacks - 1 },
    )
  }

  return { combatant: c, events }
}

/**
 * Beginn der eigenen Runde des Trägers: Brand verliert X HP (ignoriert
 * Block; Körperlos begrenzt den HP-Verlust auf 1), danach Brand −1.
 */
export function startOfOwnerTurn<C extends Combatant>(
  combatant: C,
): TurnTickResult<C> & { hpLost: number } {
  let c = combatant
  const events: GameEvent[] = []
  const burn = getStatusStacks(c, 'burn')
  let hpLost = 0

  if (burn > 0) {
    hpLost = getStatusStacks(c, 'intangible') > 0 ? Math.min(burn, 1) : burn
    c = { ...c, hp: Math.max(0, c.hp - hpLost) }
    events.push({ type: 'hpChanged', entityId: c.id, delta: -hpLost, total: c.hp })
    const remaining = burn - 1
    c = addStacks(c, 'burn', -1)
    events.push(
      remaining <= 0
        ? { type: 'statusRemoved', targetId: c.id, status: 'burn' }
        : { type: 'statusApplied', targetId: c.id, status: 'burn', stacks: -1, total: remaining },
    )
  }

  return { combatant: c, events, hpLost }
}
