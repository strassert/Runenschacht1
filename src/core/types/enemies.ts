// Gegner-Definitionen gemäß Masterplan 6.
import type { EffectSpec } from './effects'

export interface EnemyDef {
  id: string
  nameKey: string
  hp: [number, number] // Min/Max, per RNG gewürfelt
  moves: Record<string, EnemyMove>
  ai: EnemyAiSpec // deklarativ ODER scriptId
  onSpawn?: EffectSpec[] // z. B. Startstatus
  sizeClass: 'small' | 'medium' | 'large' | 'boss'
}

export interface EnemyMove {
  id: string
  intent: IntentType // Icon/Anzeige
  effects: EffectSpec[]
}

export type IntentType =
  | 'attack'
  | 'attackMulti'
  | 'defend'
  | 'buff'
  | 'debuff'
  | 'attackDefend'
  | 'attackDebuff'
  | 'strongDebuff'
  | 'escape'
  | 'sleep'
  | 'unknown'

export type EnemyAiSpec =
  | { kind: 'weighted'; weights: Record<string, number>; maxRepeat: number }
  | { kind: 'cycle'; sequence: string[]; startRandom?: boolean }
  | { kind: 'script'; scriptId: string }

// Vorwärtsreferenz aus Masterplan 6 (EnemyState.intent): minimale Form,
// wird in M2 (Kampf-Engine) bei Bedarf erweitert.
export interface IntentPreview {
  moveId: string
  intent: IntentType
  damagePreview?: number[] // pro Treffer, für Anzeige/Tooltips
}
