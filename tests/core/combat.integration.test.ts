// Integration M2.5: Startdeck (5× Schlag, 4× Parade, 1× Funkenschlag) gegen
// 2 Grubenratten – nur über combatReducer-Commands bis zum Sieg. Nach jedem
// Command werden die Invarianten geprüft; gleicher Seed → gleiche Events.
import { describe, expect, it } from 'vitest'
import { registerAllContent } from '../../src/content'
import { getCard } from '../../src/core/registry'
import { setupCombat } from '../../src/core/combat/combatSetup'
import { combatReducer } from '../../src/core/combat/combatReducer'
import { getStatusStacks } from '../../src/core/combat/statuses'
import { checkInvariants } from '../../src/core/invariants'
import { MAX_ENERGY, START_HP } from '../../src/core/constants'
import { makeRngStates, makeRunState } from './helpers'
import type { CardInstance } from '../../src/core/types/cards'
import type { Command } from '../../src/core/types/commands'
import type { GameEvent } from '../../src/core/types/events'
import type { CombatState, RunState } from '../../src/core/types/state'

registerAllContent()

const MAX_STEPS = 200

function starterDeck(): CardInstance[] {
  const ids = [
    ...Array.from({ length: 5 }, () => 'rs_schlag'),
    ...Array.from({ length: 4 }, () => 'rs_parade'),
    'rs_funkenschlag',
  ]
  return ids.map((defId, i) => ({ uid: `c_${i + 1}`, defId, upgraded: false }))
}

function startRun(seed: string): { state: RunState; events: GameEvent[] } {
  const base = makeRunState({ seed, rngStates: makeRngStates(seed), deck: starterDeck() })
  const setup = setupCombat({
    deck: base.deck,
    enemyIds: ['grubenratte', 'grubenratte'],
    rngStates: base.rngStates,
    player: { hp: base.hp, maxHp: base.maxHp },
  })
  return {
    state: { ...base, combat: setup.combat, rngStates: setup.rngStates },
    events: setup.events,
  }
}

function requireCombat(state: RunState): CombatState {
  if (state.combat === null) throw new Error('kein Kampf aktiv')
  return state.combat
}

/** Deterministischer Spieler: erst Angriffe (auf den schwächsten Gegner), dann Skills. */
function nextCommand(state: RunState): Command {
  const combat = requireCombat(state)
  const alive = combat.enemies.filter((e) => e.alive)
  if (alive.length === 0) return { type: 'endTurn' }
  const weakest = alive.reduce((a, b) => (b.hp < a.hp ? b : a))
  const affordable = (card: CardInstance): boolean => {
    const cost = card.costOverride?.value ?? getCard(card.defId).cost
    return cost === 'X' || cost <= combat.player.energy
  }
  const attack = combat.player.hand.find((c) => getCard(c.defId).type === 'attack' && affordable(c))
  if (attack !== undefined) return { type: 'playCard', cardUid: attack.uid, targetId: weakest.id }
  const other = combat.player.hand.find(affordable)
  if (other !== undefined) return { type: 'playCard', cardUid: other.uid }
  return { type: 'endTurn' }
}

function playOut(seed: string): { state: RunState; events: GameEvent[] } {
  const start = startRun(seed)
  let state = start.state
  const events = [...start.events]
  for (let step = 0; step < MAX_STEPS; step++) {
    const combat = requireCombat(state)
    if (combat.phase === 'victory' || combat.phase === 'defeat') break
    const next = combatReducer(state, nextCommand(state))
    expect(checkInvariants(next.state)).toEqual([])
    state = next.state
    events.push(...next.events)
  }
  return { state, events }
}

describe('Integration M2.5: Startdeck vs. 2 Grubenratten', () => {
  it('siegt allein über Commands (Sieg, Kampfende, Run-Statistik)', () => {
    const { state, events } = playOut('SIEG1')
    const combat = requireCombat(state)
    expect(combat.phase).toBe('victory')
    expect(combat.enemies.every((e) => !e.alive)).toBe(true)

    const ended = events.filter((e) => e.type === 'combatEnded')
    expect(ended).toHaveLength(1)
    expect(ended[0]).toEqual({ type: 'combatEnded', victory: true })

    expect(state.hp).toBe(combat.player.hp)
    expect(state.hp).toBeGreaterThan(0)
    expect(state.hp).toBeLessThanOrEqual(START_HP)
    expect(state.stats.combatsWon).toBe(1)
    expect(state.stats.kills).toBe(2)
    expect(state.stats.cardsPlayed).toBe(combat.cardsPlayedThisCombat)
  })

  it('gleicher Seed → identische Events und identischer Endzustand', () => {
    const a = playOut('DUAL1')
    const b = playOut('DUAL1')
    expect(a.events).toEqual(b.events)
    expect(a.state).toEqual(b.state)
    expect(a.events.length).toBeGreaterThan(0)
  })

  it('playCard: Glut kostet, Ziel wird getroffen, Karte kommt in die Ablage', () => {
    let state = startRun('PLAY1').state
    let attack: CardInstance | undefined
    for (let turn = 0; turn < 12 && attack === undefined; turn++) {
      attack = requireCombat(state).player.hand.find((c) => getCard(c.defId).type === 'attack')
      if (attack === undefined) state = combatReducer(state, { type: 'endTurn' }).state
    }
    if (attack === undefined) throw new Error('kein Angriff auf der Hand')

    const before = requireCombat(state)
    const res = combatReducer(state, { type: 'playCard', cardUid: attack.uid, targetId: 'enemy-0' })
    const combat = requireCombat(res.state)

    expect(combat.player.energy).toBe(before.player.energy - 1)
    expect(combat.player.hand.some((c) => c.uid === attack.uid)).toBe(false)
    expect(combat.player.discardPile.some((c) => c.uid === attack.uid)).toBe(true)
    expect(combat.cardsPlayedThisCombat).toBe(before.cardsPlayedThisCombat + 1)
    expect(combat.cardsPlayedThisTurn).toHaveLength(before.cardsPlayedThisTurn.length + 1)

    expect(res.events).toContainEqual({
      type: 'cardPlayed',
      cardUid: attack.uid,
      cardId: attack.defId,
      targetId: 'enemy-0',
      energySpent: 1,
    })
    expect(
      res.events.some(
        (e) => e.type === 'energyChanged' && e.delta === -1 && e.total === before.player.energy - 1,
      ),
    ).toBe(true)

    const target = combat.enemies.find((e) => e.id === 'enemy-0')
    if (target === undefined) throw new Error('enemy-0 fehlt')
    expect(target.hp).toBeLessThan(target.maxHp)
    expect(checkInvariants(res.state)).toEqual([])
  })

  it('Funkenschlag: Schaden plus Hitze-Status (gainHeat)', () => {
    const start = startRun('HEAT1')
    const combat = requireCombat(start.state)
    const card: CardInstance = { uid: 'c_heat', defId: 'rs_funkenschlag', upgraded: false }
    const state: RunState = {
      ...start.state,
      combat: { ...combat, player: { ...combat.player, hand: [card], energy: MAX_ENERGY } },
    }
    const res = combatReducer(state, { type: 'playCard', cardUid: card.uid, targetId: 'enemy-0' })
    const after = requireCombat(res.state)

    expect(
      res.events.some((e) => e.type === 'statusApplied' && e.status === 'heat' && e.stacks === 2),
    ).toBe(true)
    expect(getStatusStacks(after.player, 'heat')).toBe(2)
    const target = after.enemies.find((e) => e.id === 'enemy-0')
    if (target === undefined) throw new Error('enemy-0 fehlt')
    expect(target.hp).toBeLessThan(target.maxHp)
  })

  it('endTurn: Gegnerrunde dazwischen, neue Spielerrunde mit Glut und Intents', () => {
    const start = startRun('TURN1')
    const res = combatReducer(start.state, { type: 'endTurn' })
    const combat = requireCombat(res.state)
    expect(combat.phase).toBe('playerTurn')
    expect(combat.turn).toBe(2)
    expect(combat.player.energy).toBe(MAX_ENERGY)
    expect(combat.player.hand.length).toBeGreaterThan(0)
    expect(res.events.some((e) => e.type === 'turnEnded')).toBe(true)
    expect(res.events.some((e) => e.type === 'enemyIntent')).toBe(true)
    expect(res.events.some((e) => e.type === 'turnStarted' && e.turn === 2)).toBe(true)
    expect(checkInvariants(res.state)).toEqual([])
  })

  it('lehnt ungültige Commands ab', () => {
    const start = startRun('FAIL1')
    const combat = requireCombat(start.state)
    const first = combat.player.hand[0]
    if (first === undefined) throw new Error('Hand leer')

    expect(() => combatReducer({ ...start.state, combat: null }, { type: 'endTurn' })).toThrow(
      'kein Kampf aktiv',
    )
    expect(() =>
      combatReducer(
        { ...start.state, combat: { ...combat, player: { ...combat.player, energy: 0 } } },
        { type: 'playCard', cardUid: first.uid, targetId: 'enemy-0' },
      ),
    ).toThrow('Glut')
    expect(() =>
      combatReducer(start.state, { type: 'playCard', cardUid: 'c_fremd', targetId: 'enemy-0' }),
    ).toThrow('nicht auf der Hand')
    expect(() => combatReducer(start.state, { type: 'chooseReward', index: 0 })).toThrow('bis M6')

    const won = playOut('SIEG2')
    expect(() => combatReducer(won.state, { type: 'endTurn' })).toThrow('bereits beendet')
  })
})
