// Deklarative Effekte gemäß Masterplan 8.1 – wörtlich übernommen.
import type { CardId, TargetMode } from './cards'

export type StatusId =
  | 'strength'
  | 'dexterity'
  | 'vulnerable'
  | 'weak'
  | 'frail'
  | 'burn'
  | 'thorns'
  | 'heat'
  | 'ritual'
  | 'artifact'
  | 'intangible'
  | string // erweiterbar für Powers

export type EffectSpec =
  | { type: 'damage'; amount: ValueExpr; hits?: number; target?: TargetMode; tags?: string[] }
  | { type: 'block'; amount: ValueExpr; target?: 'self' }
  | { type: 'applyStatus'; status: StatusId; stacks: ValueExpr; target: TargetMode | 'self' }
  | { type: 'draw'; count: ValueExpr }
  | { type: 'gainEnergy'; amount: ValueExpr }
  | { type: 'gainHeat'; amount: ValueExpr }
  | { type: 'consumeHeat'; store: string } // speichert Menge in Kontextvariable
  | { type: 'heal'; amount: ValueExpr }
  | { type: 'loseHp'; amount: ValueExpr; target: TargetMode | 'self' }
  | {
      type: 'addCard'
      cardId: CardId
      to: 'hand' | 'draw' | 'discard'
      count: number
      upgraded?: boolean
    }
  | { type: 'discard'; count: number; choice: 'player' | 'random' }
  | { type: 'exhaustFromHand'; count: number; choice: 'player' | 'random' }
  | { type: 'upgradeInHand'; count: number | 'all'; choice: 'player' | 'random' }
  | { type: 'gainGold'; amount: ValueExpr }
  | { type: 'gainMaxHp'; amount: ValueExpr }
  | { type: 'conditional'; if: ConditionExpr; then: EffectSpec[]; else?: EffectSpec[] }
  | { type: 'repeat'; times: ValueExpr; effects: EffectSpec[] }
  | { type: 'script'; scriptId: string; params?: Record<string, number> }

export type ValueExpr =
  | number
  | { kind: 'perStatus'; status: StatusId; of: 'self' | 'target'; base: number; per: number }
  | { kind: 'var'; name: string; mul?: number; add?: number } // z. B. verbrauchte Hitze
  | { kind: 'x'; mul?: number; add?: number } // X-Kosten-Karten
  | { kind: 'currentBlock'; mul?: number }
  | { kind: 'cardsInPile'; pile: 'hand' | 'draw' | 'discard' | 'exhaust'; mul?: number }

export type ConditionExpr =
  | { kind: 'targetHasStatus'; status: StatusId }
  | { kind: 'selfStatusAtLeast'; status: StatusId; value: number }
  | { kind: 'targetWillDie' } // „Wenn tödlich …“
  | { kind: 'hpBelowPercent'; percent: number }
