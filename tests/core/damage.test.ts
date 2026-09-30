import { describe, expect, it } from 'vitest'
import { applyBlock, computeBlock } from '../../src/core/combat/block'
import { applyDamage, computeDamage } from '../../src/core/combat/damage'
import { applyStatus } from '../../src/core/combat/statuses'
import type { Combatant, StatusInstance } from '../../src/core/types/state'

function combatant(id: string, overrides: Partial<Combatant> = {}): Combatant {
  return { id, hp: 50, maxHp: 50, block: 0, statuses: [], ...overrides }
}

function withStatuses(c: Combatant, ...statuses: [string, number][]): Combatant {
  const list: StatusInstance[] = statuses.map(([id, stacks]) => ({ id, stacks }))
  return { ...c, statuses: list }
}

describe('computeDamage – 7.3 in Reihenfolge', () => {
  it('Kraft addiert vor allen Multiplikatoren', () => {
    const attacker = withStatuses(combatant('a'), ['strength', 3])
    expect(computeDamage(10, attacker, combatant('t'))).toBe(13)
  })

  it('Kraft kann negativ sein (min 0)', () => {
    const attacker = withStatuses(combatant('a'), ['strength', -5])
    expect(computeDamage(10, attacker, combatant('t'))).toBe(5)
    expect(computeDamage(2, attacker, combatant('t'))).toBe(0)
  })

  it('Geschwächt: ×0,75, Abrunden', () => {
    const attacker = withStatuses(combatant('a'), ['weak', 1])
    expect(computeDamage(10, attacker, combatant('t'))).toBe(7) // 7.5 → 7
  })

  it('Verwundbar: ×1,5 auf das Ziel', () => {
    const target = withStatuses(combatant('t'), ['vulnerable', 1])
    expect(computeDamage(10, combatant('a'), target)).toBe(15)
  })

  it('Reihenfolge ist verbindlich: (10+3)×0,75 = 9, nicht 10×0,75+3', () => {
    const attacker = withStatuses(combatant('a'), ['strength', 3], ['weak', 1])
    expect(computeDamage(10, attacker, combatant('t'))).toBe(9) // 13×0.75 = 9.75
  })

  it('Kombination Kraft + Geschwächt + Verwundbar: 14.625 → 14', () => {
    const attacker = withStatuses(combatant('a'), ['strength', 3], ['weak', 2])
    const target = withStatuses(combatant('t'), ['vulnerable', 1])
    expect(computeDamage(10, attacker, target)).toBe(14) // 13×0.75×1.5 = 14.625
  })

  it('raw (attackLike=false) ignoriert Kraft, Geschwächt und Verwundbar', () => {
    const attacker = withStatuses(combatant('a'), ['strength', 5], ['weak', 1])
    const target = withStatuses(combatant('t'), ['vulnerable', 2])
    expect(computeDamage(10, attacker, target, { attackLike: false })).toBe(10)
  })

  it('Körperlos begrenzt auch raw-Schaden auf 1 (0 bleibt 0)', () => {
    const target = withStatuses(combatant('t'), ['intangible', 1])
    expect(computeDamage(20, combatant('a'), target)).toBe(1)
    expect(computeDamage(20, combatant('a'), target, { attackLike: false })).toBe(1)
    expect(computeDamage(0, combatant('a'), target)).toBe(0)
  })

  it('Hooks outgoing/incoming wirken vor dem Abrunden', () => {
    const damage = computeDamage(10, combatant('a'), combatant('t'), {
      outgoing: (d) => d + 2,
      incoming: (d) => d * 0.5,
    })
    expect(damage).toBe(6) // (10+2)×0.5 = 6
  })
})

describe('applyDamage – Block-Abzug und Dornen', () => {
  it('Block zieht ab, Rest reduziert HP', () => {
    const target = combatant('t', { block: 5, hp: 30 })
    const r = applyDamage(combatant('a'), target, 8)
    expect(r.blocked).toBe(5)
    expect(r.hpLost).toBe(3)
    expect(r.target.block).toBe(0)
    expect(r.target.hp).toBe(27)
    expect(r.events).toContainEqual({
      type: 'damageDealt',
      sourceId: 'a',
      targetId: 't',
      amount: 8,
      blocked: 5,
    })
    expect(r.events).toContainEqual({ type: 'hpChanged', entityId: 't', delta: -3, total: 27 })
  })

  it('Vollständig geblockt → kein HP-Verlust, Block bleibt Rest', () => {
    const target = combatant('t', { block: 10, hp: 30 })
    const r = applyDamage(combatant('a'), target, 8)
    expect(r.blocked).toBe(8)
    expect(r.hpLost).toBe(0)
    expect(r.target.block).toBe(2)
    expect(r.target.hp).toBe(30)
    expect(r.events.some((e) => e.type === 'hpChanged')).toBe(false)
  })

  it('HP-Verlust kann HP nicht unter 0 senken', () => {
    const target = combatant('t', { hp: 2 })
    const r = applyDamage(combatant('a'), target, 20)
    expect(r.target.hp).toBe(0)
    expect(r.hpLost).toBe(2)
  })

  it('Dornen schaden dem Angreifer (Block zuerst, dann HP)', () => {
    const attacker = combatant('a', { block: 2, hp: 40 })
    const target = withStatuses(combatant('t'), ['thorns', 3])
    const r = applyDamage(attacker, target, 6)
    expect(r.attacker.block).toBe(0)
    expect(r.attacker.hp).toBe(39) // 3 Dornen: 2 Block + 1 HP
    expect(r.events).toContainEqual({
      type: 'damageDealt',
      sourceId: 't',
      targetId: 'a',
      amount: 3,
      blocked: 2,
    })
  })

  it('Dornen ignorieren Kraft/Geschwächt des Angreifers', () => {
    const attacker = withStatuses(combatant('a'), ['strength', 9], ['weak', 1])
    const target = withStatuses(combatant('t'), ['thorns', 2])
    const r = applyDamage(attacker, target, 6)
    expect(r.attacker.hp).toBe(48) // 50 − 2, nicht skaliert
  })

  it('raw-Schaden löst keine Dornen aus', () => {
    const target = withStatuses(combatant('t'), ['thorns', 4])
    const r = applyDamage(combatant('a'), target, 6, { attackLike: false })
    expect(r.attacker.hp).toBe(50)
    expect(r.events.filter((e) => e.targetId === 'a')).toHaveLength(0)
  })

  it('Körperlos des Angreifers begrenzt Dornen auf 1', () => {
    const attacker = withStatuses(combatant('a'), ['intangible', 1])
    const target = withStatuses(combatant('t'), ['thorns', 5])
    const r = applyDamage(attacker, target, 6)
    expect(r.attacker.hp).toBe(49)
  })

  it('Körperlos des Ziels begrenzt Angriff auf 1 (Block zieht ab)', () => {
    const target = withStatuses(combatant('t', { block: 3, hp: 30 }), ['intangible', 2])
    const r = applyDamage(combatant('a'), target, 20)
    expect(r.blocked).toBe(1) // Schaden 1, Block 3 → komplett geblockt
    expect(r.hpLost).toBe(0)
    expect(r.target.block).toBe(2)
  })

  it('Purity: Originalobjekte bleiben unverändert', () => {
    const attacker = combatant('a', { hp: 40, block: 2 })
    const target = withStatuses(combatant('t', { hp: 30, block: 1 }), ['thorns', 2])
    applyDamage(attacker, target, 8)
    expect(attacker.hp).toBe(40)
    expect(attacker.block).toBe(2)
    expect(target.hp).toBe(30)
    expect(target.block).toBe(1)
  })
})

describe('computeBlock / applyBlock – 7.3 Block-Formel', () => {
  it('Gewandtheit addiert', () => {
    const owner = withStatuses(combatant('p'), ['dexterity', 4])
    expect(computeBlock(5, owner)).toBe(9)
  })

  it('Zerbrechlich: ×0,75 mit Abrunden', () => {
    const owner = withStatuses(combatant('p'), ['frail', 1])
    expect(computeBlock(9, owner)).toBe(6) // 6.75 → 6
  })

  it('Kombination Gewandtheit + Zerbrechlich: (5+3)×0,75 = 6', () => {
    const owner = withStatuses(combatant('p'), ['dexterity', 3], ['frail', 2])
    expect(computeBlock(5, owner)).toBe(6)
  })

  it('Block wird additiv angewendet und als Event gemeldet', () => {
    const owner = combatant('p', { block: 4 })
    const r = applyBlock(owner, 6)
    expect(r.gained).toBe(6)
    expect(r.combatant.block).toBe(10)
    expect(r.events).toEqual([{ type: 'blockGained', entityId: 'p', amount: 6, total: 10 }])
    expect(owner.block).toBe(4) // Purity
  })

  it('applyStatus stapelt gleiche Status', () => {
    const c = combatant('p')
    const r1 = applyStatus(c, 'dexterity', 2)
    const r2 = applyStatus(r1.combatant, 'dexterity', 3)
    expect(r2.combatant.statuses).toEqual([{ id: 'dexterity', stacks: 5 }])
    expect(r2.events[0]).toEqual({
      type: 'statusApplied',
      targetId: 'p',
      status: 'dexterity',
      stacks: 3,
      total: 5,
    })
  })
})
