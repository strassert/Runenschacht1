// M2.1: Registry (Masterplan 8.4) – Registrieren/Nachschlagen, Fehler bei
// unbekannter ID, idempotentes registerAllContent().
import { describe, expect, it } from 'vitest'
import {
  getCard,
  getEnemy,
  getScript,
  getEncounter,
  registerCard,
  registerEncounter,
  registerScript,
  type CardDef,
} from '../../src/core'
import { registerAllContent } from '../../src/content'

describe('Registry (8.4)', () => {
  it('Startkarten sind nach registerAllContent() nachschlagbar', () => {
    registerAllContent()

    const schlag = getCard('rs_schlag')
    expect(schlag.type).toBe('attack')
    expect(schlag.cost).toBe(1)
    expect(schlag.effects).toEqual([{ type: 'damage', amount: 6 }])
    expect(schlag.upgrade.effects).toEqual([{ type: 'damage', amount: 9 }])

    const parade = getCard('rs_parade')
    expect(parade.type).toBe('skill')
    expect(parade.target).toBe('self')
    expect(parade.effects).toEqual([{ type: 'block', amount: 5, target: 'self' }])
    expect(parade.upgrade.effects).toEqual([{ type: 'block', amount: 8, target: 'self' }])

    const funken = getCard('rs_funkenschlag')
    expect(funken.effects).toEqual([
      { type: 'damage', amount: 5 },
      { type: 'gainHeat', amount: 2 },
    ])
    expect(funken.upgrade.effects).toEqual([
      { type: 'damage', amount: 7 },
      { type: 'gainHeat', amount: 3 },
    ])
  })

  it('Grubenratte: 12–15 HP, Moves, weighted-KI 70/30 mit maxRepeat 2', () => {
    registerAllContent()

    const ratte = getEnemy('grubenratte')
    expect(ratte.hp).toEqual([12, 15])
    expect(ratte.sizeClass).toBe('small')
    expect(ratte.moves.bite.effects).toEqual([{ type: 'damage', amount: 6 }])
    expect(ratte.moves.scratch.effects).toEqual([
      { type: 'damage', amount: 3 },
      { type: 'applyStatus', status: 'weak', stacks: 1, target: 'enemy' },
    ])
    expect(ratte.ai).toEqual({
      kind: 'weighted',
      weights: { bite: 70, scratch: 30 },
      maxRepeat: 2,
    })
  })

  it('doppelter registerAllContent()-Aufruf ist harmlos', () => {
    registerAllContent()
    registerAllContent()
    expect(getCard('rs_schlag').id).toBe('rs_schlag')
    expect(getEnemy('grubenratte').id).toBe('grubenratte')
  })

  it('unbekannte IDs werfen Fehler mit der ID im Text', () => {
    expect(() => getCard('rs_gibt_es_nicht')).toThrow('rs_gibt_es_nicht')
    expect(() => getEnemy('schattengolem')).toThrow('schattengolem')
    expect(() => getEncounter('begegnung_xyz')).toThrow('begegnung_xyz')
    expect(() => getScript('slime_split')).toThrow('slime_split')
  })

  it('eigene Defs registrieren und Skripte nachschlagen', () => {
    const testKarte: CardDef = {
      id: 'test_karte',
      nameKey: 'card.test.name',
      type: 'skill',
      rarity: 'common',
      cost: 0,
      target: 'none',
      keywords: [],
      effects: [{ type: 'gainHeat', amount: 1 }],
      upgrade: {},
      descriptionKey: 'card.test.desc',
      characterId: 'neutral',
    }
    registerCard(testKarte)
    expect(getCard('test_karte').effects).toEqual([{ type: 'gainHeat', amount: 1 }])

    registerEncounter({ id: 'test_begegnung', nameKey: 'enc.test.name', enemyIds: ['grubenratte'] })
    expect(getEncounter('test_begegnung').enemyIds).toEqual(['grubenratte'])

    let calls = 0
    registerScript('test_skript', () => {
      calls += 1
    })
    getScript('test_skript')(undefined, { n: 1 })
    expect(calls).toBe(1)
  })
})
