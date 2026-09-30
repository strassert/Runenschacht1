// Getrennte RNG-Streams gemäß Masterplan 13.1: eine andere Kampfentscheidung
// darf z. B. die Kartenbelohnungen nicht verändern. Die Zustände liegen als
// number[] in RunState.rngStates und werden mitgespeichert.
import { cyrb128, Rng, type RngState } from './Rng'
import type { RngStream } from '../types/state'

export const RNG_STREAMS: readonly RngStream[] = [
  'map',
  'encounters',
  'cardRewards',
  'shuffle',
  'combat',
  'enemyAi',
  'loot',
  'events',
  'shop',
  'misc',
]

export type RngStates = Record<RngStream, number[]>

/** Startzustände aller Streams aus dem Run-Seed (pro Stream eigener Hash). */
export function initialRngStates(seed: string): RngStates {
  const states = {} as RngStates
  for (const stream of RNG_STREAMS) {
    states[stream] = cyrb128(`${seed}:${stream}`)
  }
  return states
}

/**
 * Stream rein verwenden: liest den Zustand, führt `fn` mit einem Rng aus und
 * gibt den aktualisierten Zustand zurück (pure – Eingabe wird nicht mutiert).
 */
export function withStream<T>(
  states: RngStates,
  stream: RngStream,
  fn: (rng: Rng) => T,
): { value: T; states: RngStates } {
  const rng = new Rng(states[stream] ?? [])
  const value = fn(rng)
  const next: RngState = rng.getState()
  return { value, states: { ...states, [stream]: next } }
}
