// Gegner Layer 1 (Masterplan 6). Grubenratte: 12–15 HP,
// Beißen 6 Schaden, Kratzen 3 Schaden + 1 Geschwächt, weighted 70/30.
import type { EnemyDef } from '../../core'

export const grubenratte: EnemyDef = {
  id: 'grubenratte',
  nameKey: 'enemy.grubenratte.name',
  hp: [12, 15],
  moves: {
    bite: {
      id: 'bite',
      intent: 'attack',
      effects: [{ type: 'damage', amount: 6 }],
    },
    scratch: {
      id: 'scratch',
      intent: 'attackDebuff',
      effects: [
        { type: 'damage', amount: 3 },
        { type: 'applyStatus', status: 'weak', stacks: 1, target: 'enemy' },
      ],
    },
  },
  ai: { kind: 'weighted', weights: { bite: 70, scratch: 30 }, maxRepeat: 2 },
  sizeClass: 'small',
}

export const LAYER1_ENEMIES: EnemyDef[] = [grubenratte]
