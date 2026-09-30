// Inhalte registrieren sich selbst (Masterplan 8.4). App-Start, Tests und
// Simulator rufen registerAllContent() einmal auf – idempotent, da die
// Registry-Maps dieselben Defs einfach überschreiben.
import { registerCard, registerEnemy } from '../core'
import { STARTER_CARDS } from './cards/runesmith/starter'
import { LAYER1_ENEMIES } from './enemies/layer1'

export function registerAllContent(): void {
  for (const card of STARTER_CARDS) registerCard(card)
  for (const enemy of LAYER1_ENEMIES) registerEnemy(enemy)
}
