// Rundenablauf (Masterplan 7.2): startPlayerTurn (Glut, Block-Verfall,
// Status-Ticks, 5 ziehen), endPlayerTurn (Status-Abbau, ethereal/retain,
// Ablage), runEnemyTurn (Block-Verfall, Brand, Moves links→rechts über die
// Action-Queue, Debuff-Abbau, neue Intents). Kampfende (combatEnded-Event)
// bleibt M2.5 (combatReducer); hier wird nur phase gesetzt.
import type { CombatState } from '../types/state'
import type { RngStates } from '../rng/streams'
import type { GameEvent } from '../types/events'
import { DRAW_PER_TURN } from '../constants'
import { drawCards, discardCard, exhaustCard } from '../deck/piles'
import { getCard, getEnemy } from '../registry'
import { startOfOwnerTurn, endOfOwnerTurn } from './statuses'
import { runActionQueue, type Action } from './actionQueue'
import { chooseEnemyMove, previewIntent } from './enemyAi'

export interface TurnResult {
  combat: CombatState
  rngStates: RngStates
  events: GameEvent[]
}

function combatOver(combat: CombatState): boolean {
  return combat.phase === 'victory' || combat.phase === 'defeat'
}

function moveOf(defId: string, moveId: string) {
  const move = getEnemy(defId).moves[moveId]
  if (move === undefined) throw new Error(`Gegner '${defId}' hat keinen Move '${moveId}'`)
  return move
}

/** Spielerrunde beginnen (7.2 Schritt 1–5): turn+1, Glut, Block-Verfall, Ticks, ziehen. */
export function startPlayerTurn(combat: CombatState, rngStates: RngStates): TurnResult {
  if (combatOver(combat)) return { combat, rngStates, events: [] }
  const turn = combat.turn + 1
  const events: GameEvent[] = [{ type: 'turnStarted', entityId: combat.player.id, turn }]

  let player = { ...combat.player, energy: combat.player.maxEnergy, block: 0 }
  const tick = startOfOwnerTurn(player) // Brand-Schaden ignoriert Block
  player = tick.combatant
  events.push(...tick.events)

  let c: CombatState = { ...combat, turn, phase: 'playerTurn', player, cardsPlayedThisTurn: [] }
  if (player.hp <= 0) return { combat: { ...c, phase: 'defeat' }, rngStates, events }

  const draw = drawCards(player, rngStates, DRAW_PER_TURN)
  c = { ...c, player: draw.player }
  events.push(...draw.events)
  return { combat: c, rngStates: draw.rngStates, events }
}

/** Spielerrunde beenden (7.2 Schritt 7–9): Hitze/Ritual/Debuff-Abbau, Handkarten. */
export function endPlayerTurn(combat: CombatState, rngStates: RngStates): TurnResult {
  if (combatOver(combat)) return { combat, rngStates, events: [] }
  const events: GameEvent[] = [{ type: 'turnEnded', entityId: combat.player.id, turn: combat.turn }]

  // Schritt 7 + 9 gebündelt: Hitze halbieren, Ritual, Debuff-Dauer −1.
  const tick = endOfOwnerTurn(combat.player)
  let player = tick.combatant
  events.push(...tick.events)

  // Schritt 8: ethereal → erschöpfen, retain → bleiben, Rest → Ablage.
  for (const card of [...player.hand]) {
    const def = getCard(card.defId)
    if (def.keywords.includes('ethereal')) {
      const moved = exhaustCard(player, card.uid)
      player = moved.player
      events.push(...moved.events)
    } else if (!def.keywords.includes('retain')) {
      const moved = discardCard(player, card.uid)
      player = moved.player
      events.push(...moved.events)
    }
  }

  return { combat: { ...combat, player, phase: 'enemyTurn' }, rngStates, events }
}

/** Gegnerrunde (7.2 Schritt 1–6): Ticks, Moves, Abbau, neue Intents, → Spielerrunde. */
export function runEnemyTurn(combat: CombatState, rngStates: RngStates): TurnResult {
  if (combatOver(combat)) return { combat, rngStates, events: [] }
  const events: GameEvent[] = []
  let states = rngStates

  // Schritt 1: Block aller Gegner verfällt.
  const afterBlock = combat.enemies.map((e) => (e.block === 0 ? e : { ...e, block: 0 }))

  // Schritt 2: onEnemyTurnStart pro Gegner (Brand frisst Block bereits weg).
  const afterTick: typeof afterBlock = []
  for (const enemy of afterBlock) {
    if (!enemy.alive) {
      afterTick.push(enemy)
      continue
    }
    const tick = startOfOwnerTurn(enemy)
    events.push(...tick.events)
    const e = { ...tick.combatant }
    if (e.hp <= 0) {
      e.alive = false
      events.push({ type: 'enemyDied', enemyId: e.id })
    }
    afterTick.push(e)
  }
  let c: CombatState = { ...combat, enemies: afterTick }
  if (afterTick.every((e) => !e.alive)) {
    return { combat: { ...c, phase: 'victory' }, rngStates: states, events }
  }

  // Schritt 3: jeder lebende Gegner führt den angekündigten Move aus (links→rechts).
  for (const enemy of c.enemies) {
    if (!enemy.alive || enemy.intent === null) continue
    const move = moveOf(enemy.defId, enemy.intent.moveId)
    const actions: Action[] = move.effects.map((effect) => ({
      effect,
      sourceId: enemy.id,
      targetId: null,
    }))
    const result = runActionQueue(actions, c, states)
    c = result.combat
    states = result.rngStates
    events.push(...result.events)
    if (combatOver(c)) return { combat: c, rngStates: states, events }
    const moveId = enemy.intent.moveId
    c = {
      ...c,
      enemies: c.enemies.map((e) =>
        e.id === enemy.id ? { ...e, moveHistory: [...e.moveHistory, moveId] } : e,
      ),
    }
  }

  // Schritt 4: Debuff-Dauer der Gegner −1 (Ritual → Kraft am Rundenende).
  const ticked: CombatState['enemies'] = []
  for (const e of c.enemies) {
    if (!e.alive) {
      ticked.push(e)
      continue
    }
    const tick = endOfOwnerTurn(e)
    events.push(...tick.events)
    ticked.push(tick.combatant)
  }
  c = { ...c, enemies: ticked }

  // Schritt 5: neue Intents würfeln (ehrlich, 7.5).
  const withIntents: CombatState['enemies'] = []
  for (const enemy of c.enemies) {
    if (!enemy.alive) {
      withIntents.push({ ...enemy, intent: null })
      continue
    }
    const def = getEnemy(enemy.defId)
    const choice = chooseEnemyMove(def, enemy, states)
    states = choice.rngStates
    const move = def.moves[choice.moveId]
    if (move === undefined) throw new Error(`Gegner '${def.id}' hat keinen Move '${choice.moveId}'`)
    const intent = previewIntent(move, enemy, c.player)
    withIntents.push({ ...enemy, intent, aiMemory: choice.aiMemory })
    events.push({ type: 'enemyIntent', enemyId: enemy.id, intent })
  }

  // Schritt 6: zurück zur Spielerrunde (turn+1 geschieht in startPlayerTurn).
  c = { ...c, enemies: withIntents, phase: 'playerTurn' }
  return { combat: c, rngStates: states, events }
}
