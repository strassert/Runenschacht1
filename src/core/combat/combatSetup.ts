// Kampfaufbau (Masterplan 7.2 'Kampfbeginn'): Gegner mit gewürfelter HP
// (Stream 'combat'), Deck-Kopie mischen (Stream 'shuffle'), innate-Karten nach
// oben, onSpawn-Effekte über die Action-Queue, Intents Runde 1, dann erste
// Spielerrunde via startPlayerTurn. Der RunState-HP-Übergang kommt in M2.5.
import type { CardInstance } from '../types/cards'
import type { CombatState, EnemyState, PlayerCombatState } from '../types/state'
import type { GameEvent } from '../types/events'
import type { RngStates } from '../rng/streams'
import { withStream } from '../rng/streams'
import { shuffle } from '../deck/shuffle'
import { prepareDrawPile } from '../deck/piles'
import { getCard, getEnemy } from '../registry'
import { MAX_ENERGY, START_HP } from '../constants'
import { runActionQueue, type Action } from './actionQueue'
import { chooseEnemyMove, previewIntent } from './enemyAi'
import { startPlayerTurn } from './turn'

export interface SetupOptions {
  deck: readonly CardInstance[]
  enemyIds: readonly string[]
  rngStates: RngStates
  /** Spieler-Startwerte aus dem Run (HP etc.), Standard: Grundwerte. */
  player?: Partial<PlayerCombatState>
  roomType?: CombatState['roomType']
}

export interface SetupResult {
  combat: CombatState
  rngStates: RngStates
  events: GameEvent[]
}

export function setupCombat(options: SetupOptions): SetupResult {
  const roomType = options.roomType ?? 'combat'
  const events: GameEvent[] = [{ type: 'combatStarted', roomType }]
  let states = options.rngStates

  // Spieler: Start-HP, Glut 0 (startPlayerTurn setzt sie), Stapel aus Deck-Kopie.
  const player: PlayerCombatState = {
    id: 'player',
    hp: options.player?.hp ?? START_HP,
    maxHp: options.player?.maxHp ?? START_HP,
    block: 0,
    statuses: options.player?.statuses ?? [],
    energy: 0,
    maxEnergy: options.player?.maxEnergy ?? MAX_ENERGY,
    drawPile: [...options.deck],
    hand: [],
    discardPile: [],
    exhaustPile: [],
    powers: options.player?.powers ?? [],
    cardsGeneratedThisCombat: 0,
    cardsRemovedThisCombat: 0,
  }

  // Deck mischen (Kopie!), innate-Karten oben auf den Nachziehstapel.
  const { value: shuffled, states: afterShuffle } = withStream(states, 'shuffle', (rng) =>
    shuffle(player.drawPile, rng),
  )
  states = afterShuffle
  const prepared = prepareDrawPile(
    { ...player, drawPile: shuffled },
    (card) => getCard(card.defId).keywords.includes('innate'),
  )

  // Gegner erzeugen: HP aus [min, max] würfeln (Stream 'combat', aufsteigend).
  const enemies: EnemyState[] = options.enemyIds.map((defId, index) => {
    const def = getEnemy(defId)
    const { value: hp, states: next } = withStream(states, 'combat', (rng) =>
      rng.nextInt(def.hp[0], def.hp[1] + 1),
    )
    states = next
    return {
      id: `enemy-${index}`,
      hp,
      maxHp: hp,
      block: 0,
      statuses: [],
      defId,
      intent: null,
      moveHistory: [],
      aiMemory: {},
      alive: true,
    }
  })

  let combat: CombatState = {
    turn: 0,
    phase: 'playerTurn',
    player: prepared,
    enemies,
    cardsPlayedThisTurn: [],
    cardsPlayedThisCombat: 0,
    counters: {},
    roomType,
  }

  // onSpawn-Effekte (Trigger onCombatStart folgen in M4).
  for (const enemy of combat.enemies) {
    const def = getEnemy(enemy.defId)
    if (!def.onSpawn || def.onSpawn.length === 0) continue
    const actions: Action[] = def.onSpawn.map((effect) => ({
      effect,
      sourceId: enemy.id,
      targetId: null,
    }))
    const result = runActionQueue(actions, combat, states)
    combat = result.combat
    states = result.rngStates
    events.push(...result.events)
  }

  // Intents für Runde 1 (ehrlich, 7.5).
  const withIntents: EnemyState[] = []
  for (const enemy of combat.enemies) {
    const def = getEnemy(enemy.defId)
    const choice = chooseEnemyMove(def, enemy, states)
    states = choice.rngStates
    const move = def.moves[choice.moveId]
    if (move === undefined) throw new Error(`Gegner '${def.id}' hat keinen Move '${choice.moveId}'`)
    const intent = previewIntent(move, enemy, combat.player)
    withIntents.push({ ...enemy, intent, aiMemory: choice.aiMemory })
    events.push({ type: 'enemyIntent', enemyId: enemy.id, intent })
  }
  combat = { ...combat, enemies: withIntents }

  // Erste Spielerrunde (ziehen, Glut …).
  const first = startPlayerTurn(combat, states)
  events.push(...first.events)
  return { combat: first.combat, rngStates: first.rngStates, events }
}
