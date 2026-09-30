// Startdeck des Runenschmieds (Masterplan 7, Tabelle „Starter“):
// Schlag 6/9 Schaden, Parade 5/8 Schild, Funkenschlag 5+2 Hitze / 7+3 Hitze.
import type { CardDef } from '../../../core'

export const schlag: CardDef = {
  id: 'rs_schlag',
  nameKey: 'card.schlag.name',
  type: 'attack',
  rarity: 'starter',
  cost: 1,
  target: 'enemy',
  keywords: [],
  effects: [{ type: 'damage', amount: 6 }],
  upgrade: { effects: [{ type: 'damage', amount: 9 }] },
  descriptionKey: 'card.schlag.desc',
  characterId: 'runesmith',
}

export const parade: CardDef = {
  id: 'rs_parade',
  nameKey: 'card.parade.name',
  type: 'skill',
  rarity: 'starter',
  cost: 1,
  target: 'self',
  keywords: [],
  effects: [{ type: 'block', amount: 5, target: 'self' }],
  upgrade: { effects: [{ type: 'block', amount: 8, target: 'self' }] },
  descriptionKey: 'card.parade.desc',
  characterId: 'runesmith',
}

export const funkenschlag: CardDef = {
  id: 'rs_funkenschlag',
  nameKey: 'card.funkenschlag.name',
  type: 'attack',
  rarity: 'starter',
  cost: 1,
  target: 'enemy',
  keywords: [],
  effects: [
    { type: 'damage', amount: 5 },
    { type: 'gainHeat', amount: 2 },
  ],
  upgrade: {
    effects: [
      { type: 'damage', amount: 7 },
      { type: 'gainHeat', amount: 3 },
    ],
  },
  descriptionKey: 'card.funkenschlag.desc',
  characterId: 'runesmith',
}

export const STARTER_CARDS: CardDef[] = [schlag, parade, funkenschlag]
