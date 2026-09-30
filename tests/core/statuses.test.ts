import { describe, expect, it } from 'vitest'
import {
  applyStatus,
  endOfOwnerTurn,
  getStatusStacks,
  startOfOwnerTurn,
} from '../../src/core/combat/statuses'
import type { Combatant } from '../../src/core/types/state'

function combatant(id: string, overrides: Partial<Combatant> = {}): Combatant {
  return { id, hp: 50, maxHp: 50, block: 0, statuses: [], ...overrides }
}

describe('applyStatus – Anwenden und Stapeln', () => {
  it('neuer Status wird angelegt', () => {
    const r = applyStatus(combatant('t'), 'vulnerable', 2)
    expect(r.combatant.statuses).toEqual([{ id: 'vulnerable', stacks: 2 }])
    expect(r.blocked).toBe(false)
    expect(r.events).toEqual([
      { type: 'statusApplied', targetId: 't', status: 'vulnerable', stacks: 2, total: 2 },
    ])
  })

  it('gleiche Status stapeln sich', () => {
    const r1 = applyStatus(combatant('t'), 'vulnerable', 2)
    const r2 = applyStatus(r1.combatant, 'vulnerable', 3)
    expect(getStatusStacks(r2.combatant, 'vulnerable')).toBe(5)
    expect(r2.events[0]).toMatchObject({ total: 5 })
  })

  it('0 Stapel sind ein No-op', () => {
    const c = combatant('t')
    const r = applyStatus(c, 'weak', 0)
    expect(r.combatant).toBe(c)
    expect(r.events).toEqual([])
  })

  it('negative Stapelanzahl ist ein Fehler', () => {
    expect(() => applyStatus(combatant('t'), 'weak', -1)).toThrow(/negativ/)
  })

  it('Purity: Original bleibt unverändert', () => {
    const c = combatant('t')
    applyStatus(c, 'weak', 2)
    expect(c.statuses).toEqual([])
  })
})

describe('Bannrune (artifact) blockt Debuffs', () => {
  it('blockt Verwundbar und verbraucht 1 Bannrune', () => {
    const c = combatant('t', { statuses: [{ id: 'artifact', stacks: 2 }] })
    const r = applyStatus(c, 'vulnerable', 3)
    expect(r.blocked).toBe(true)
    expect(getStatusStacks(r.combatant, 'vulnerable')).toBe(0)
    expect(getStatusStacks(r.combatant, 'artifact')).toBe(1)
    expect(r.events).toEqual([
      { type: 'statusApplied', targetId: 't', status: 'artifact', stacks: -1, total: 1 },
    ])
  })

  it('letzte Bannrune fällt weg (statusRemoved)', () => {
    const c = combatant('t', { statuses: [{ id: 'artifact', stacks: 1 }] })
    const r = applyStatus(c, 'weak', 1)
    expect(r.blocked).toBe(true)
    expect(r.combatant.statuses).toEqual([])
    expect(r.events).toEqual([{ type: 'statusRemoved', targetId: 't', status: 'artifact' }])
  })

  it('blockt auch Brand (Debuff), aber keine Buffs wie Kraft', () => {
    const c = combatant('t', { statuses: [{ id: 'artifact', stacks: 1 }] })
    const burn = applyStatus(c, 'burn', 4)
    expect(burn.blocked).toBe(true)
    const strength = applyStatus(c, 'strength', 2)
    expect(strength.blocked).toBe(false)
    expect(getStatusStacks(strength.combatant, 'strength')).toBe(2)
    expect(getStatusStacks(strength.combatant, 'artifact')).toBe(1) // bleibt erhalten
  })

  it('ohne Bannrune wirkt der Debuff normal', () => {
    const r = applyStatus(combatant('t'), 'frail', 2)
    expect(r.blocked).toBe(false)
    expect(getStatusStacks(r.combatant, 'frail')).toBe(2)
  })
})

describe('endOfOwnerTurn – Abbau am Ende der eigenen Runde', () => {
  it('Verwundbar/Geschwächt/Zerbrechlich/Körperlos −1', () => {
    const c = combatant('t', {
      statuses: [
        { id: 'vulnerable', stacks: 2 },
        { id: 'weak', stacks: 1 },
        { id: 'frail', stacks: 3 },
        { id: 'intangible', stacks: 2 },
      ],
    })
    const r = endOfOwnerTurn(c)
    expect(getStatusStacks(r.combatant, 'vulnerable')).toBe(1)
    expect(getStatusStacks(r.combatant, 'weak')).toBe(0)
    expect(getStatusStacks(r.combatant, 'frail')).toBe(2)
    expect(getStatusStacks(r.combatant, 'intangible')).toBe(1)
    expect(r.events).toContainEqual({ type: 'statusRemoved', targetId: 't', status: 'weak' })
    expect(r.events).toContainEqual({
      type: 'statusApplied',
      targetId: 't',
      status: 'vulnerable',
      stacks: -1,
      total: 1,
    })
  })

  it('dauerhafte Status bleiben unverändert', () => {
    const c = combatant('t', {
      statuses: [
        { id: 'strength', stacks: 3 },
        { id: 'dexterity', stacks: 2 },
        { id: 'thorns', stacks: 4 },
        { id: 'artifact', stacks: 1 },
        { id: 'burn', stacks: 2 },
      ],
    })
    const r = endOfOwnerTurn(c)
    expect(r.combatant.statuses).toEqual(c.statuses)
    expect(r.events).toEqual([])
  })

  it('Debuff, der in der eigenen Runde angewendet wurde, überlebt diese Runde', () => {
    // Spielerrunde: dem Gegner Verwundbar (1) geben.
    const given = applyStatus(combatant('e'), 'vulnerable', 1)
    // Ende der Spielerrunde: nur eigene Status des Spielers ticken.
    const player = combatant('p', { statuses: [{ id: 'heat', stacks: 4 }] })
    endOfOwnerTurn(player)
    expect(getStatusStacks(given.combatant, 'vulnerable')).toBe(1)
    // Ende der Gegnerrunde: erst jetzt baut es ab.
    const afterEnemyTurn = endOfOwnerTurn(given.combatant)
    expect(afterEnemyTurn.events).toContainEqual({
      type: 'statusRemoved',
      targetId: 'e',
      status: 'vulnerable',
    })
  })

  it('Ritual gibt am Ende der eigenen Runde +X Kraft', () => {
    const c = combatant('e', { statuses: [{ id: 'ritual', stacks: 2 }] })
    const r = endOfOwnerTurn(c)
    expect(getStatusStacks(r.combatant, 'ritual')).toBe(2) // Ritual selbst bleibt
    expect(getStatusStacks(r.combatant, 'strength')).toBe(2)
    const r2 = endOfOwnerTurn(r.combatant)
    expect(getStatusStacks(r2.combatant, 'strength')).toBe(4)
  })

  it('Hitze wird halbiert (abrunden) und bei 0 entfernt', () => {
    let c = combatant('p', { statuses: [{ id: 'heat', stacks: 5 }] })
    c = endOfOwnerTurn(c).combatant
    expect(getStatusStacks(c, 'heat')).toBe(2)
    c = endOfOwnerTurn(c).combatant
    expect(getStatusStacks(c, 'heat')).toBe(1)
    const r = endOfOwnerTurn(c)
    expect(getStatusStacks(r.combatant, 'heat')).toBe(0)
    expect(r.events).toContainEqual({ type: 'statusRemoved', targetId: 'p', status: 'heat' })
  })
})

describe('startOfOwnerTurn – Brand zu Rundenbeginn', () => {
  it('Brand kostet X HP, danach Brand −1', () => {
    const c = combatant('t', { hp: 30, statuses: [{ id: 'burn', stacks: 4 }] })
    const r = startOfOwnerTurn(c)
    expect(r.hpLost).toBe(4)
    expect(r.combatant.hp).toBe(26)
    expect(getStatusStacks(r.combatant, 'burn')).toBe(3)
    expect(r.events).toContainEqual({ type: 'hpChanged', entityId: 't', delta: -4, total: 26 })
  })

  it('letzter Brand-Stack entfernt den Status', () => {
    const c = combatant('t', { hp: 10, statuses: [{ id: 'burn', stacks: 1 }] })
    const r = startOfOwnerTurn(c)
    expect(r.combatant.statuses).toEqual([])
    expect(r.events).toContainEqual({ type: 'statusRemoved', targetId: 't', status: 'burn' })
  })

  it('Brand ignoriert Block', () => {
    const c = combatant('t', { hp: 30, block: 20, statuses: [{ id: 'burn', stacks: 3 }] })
    const r = startOfOwnerTurn(c)
    expect(r.combatant.hp).toBe(27)
    expect(r.combatant.block).toBe(20)
  })

  it('Körperlos begrenzt Brand-Verlust auf 1 HP', () => {
    const c = combatant('t', {
      hp: 30,
      statuses: [
        { id: 'burn', stacks: 6 },
        { id: 'intangible', stacks: 1 },
      ],
    })
    const r = startOfOwnerTurn(c)
    expect(r.hpLost).toBe(1)
    expect(r.combatant.hp).toBe(29)
  })

  it('ohne Brand passiert nichts', () => {
    const c = combatant('t')
    const r = startOfOwnerTurn(c)
    expect(r.hpLost).toBe(0)
    expect(r.events).toEqual([])
  })
})
