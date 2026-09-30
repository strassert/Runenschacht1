// RNG-Determinismus (Masterplan 13.1/13.3): gleicher Seed → gleiche Folge,
// getrennte Streams beeinflussen sich nicht, keine Math.random()-Abhängigkeit.
import { describe, expect, it } from 'vitest'
import { cyrb128, hashSeed, Rng } from '../../src/core/rng/Rng'
import { initialRngStates, RNG_STREAMS, withStream } from '../../src/core/rng/streams'
import { shuffle } from '../../src/core/deck/shuffle'

function sequence(seed: string, n: number): number[] {
  const rng = new Rng(hashSeed(seed))
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    out.push(rng.next())
  }
  return out
}

describe('Rng (sfc32 + cyrb128)', () => {
  it('gleicher Seed → identische Zahlenfolge', () => {
    expect(sequence('TEST1', 50)).toEqual(sequence('TEST1', 50))
  })

  it('verschiedene Seeds → verschiedene Folgen (Goldene Seeds TEST1/TEST2)', () => {
    expect(sequence('TEST1', 20)).not.toEqual(sequence('TEST2', 20))
  })

  it('cyrb128 liefert 32-Bit-Werte und ist stabil', () => {
    const a = cyrb128('TEST1')
    const b = cyrb128('TEST1')
    expect(a).toEqual(b)
    expect(a).toHaveLength(4)
    for (const v of a) {
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('next() liegt in [0, 1)', () => {
    const rng = new Rng(hashSeed('TEST1'))
    for (let i = 0; i < 500; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('nextInt liefert nur Werte im Bereich [min, maxExclusive)', () => {
    const rng = new Rng(hashSeed('TEST1'))
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(3, 7)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(7)
    }
  })

  it('nextInt wirft bei ungültigem Bereich', () => {
    const rng = new Rng(hashSeed('TEST1'))
    expect(() => rng.nextInt(5, 5)).toThrow()
    expect(() => rng.nextInt(0, 2.5)).toThrow()
  })

  it('pick wirft bei leerem Array', () => {
    const rng = new Rng(hashSeed('TEST1'))
    expect(() => rng.pick([] as number[])).toThrow()
  })

  it('Zustand ist serialisierbar und fortsetzbar', () => {
    const a = new Rng(hashSeed('TEST1'))
    a.next()
    a.next()
    const saved = a.getState()
    const restored = new Rng(saved)
    expect(restored.next()).toBe(a.next())
  })
})

describe('Streams (13.1)', () => {
  it('initialRngStates gibt pro Stream einen eigenen Zustand', () => {
    const states = initialRngStates('TEST1')
    for (const stream of RNG_STREAMS) {
      expect(states[stream]).toHaveLength(4)
    }
    // 'map' und 'shuffle' starten unterschiedlich (per-Stream-Hash)
    expect(states.map).not.toEqual(states.shuffle)
  })

  it('Konsum eines Streams verändert keinen anderen Stream', () => {
    const states = initialRngStates('TEST1')
    const before = { ...states }
    const { states: after } = withStream(states, 'shuffle', (rng) => rng.next())
    for (const stream of RNG_STREAMS) {
      if (stream === 'shuffle') continue
      expect(after[stream]).toEqual(before[stream])
    }
    expect(after.shuffle).not.toEqual(before.shuffle)
  })

  it('withStream ist pure: Eingabe wird nicht mutiert', () => {
    const states = initialRngStates('TEST1')
    const snapshot = JSON.stringify(states)
    withStream(states, 'combat', (rng) => rng.nextInt(0, 100))
    expect(JSON.stringify(states)).toBe(snapshot)
  })

  it('Karten-Belohnungen bleiben gleich, wenn im Kampf anders gezogen wird', () => {
    // Kampf-Entscheidung (combat-Stream) darf cardRewards-Stream nicht anfassen
    const base = initialRngStates('TEST1')
    const combat1 = withStream(base, 'combat', (rng) => rng.nextInt(0, 10))
    const combat2 = withStream(base, 'combat', (rng) => {
      rng.nextInt(0, 10)
      rng.nextInt(0, 10) // andere Kampfentscheidung → mehr Züge
    })
    const reward1 = withStream(combat1.states, 'cardRewards', (rng) => rng.nextInt(0, 1000))
    const reward2 = withStream(combat2.states, 'cardRewards', (rng) => rng.nextInt(0, 1000))
    expect(reward1.value).toBe(reward2.value)
  })
})

describe('shuffle (Fisher–Yates)', () => {
  it('gleicher Seed → gleiche Mischung', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = shuffle(input, new Rng(hashSeed('TEST1')))
    const b = shuffle(input, new Rng(hashSeed('TEST1')))
    expect(a).toEqual(b)
  })

  it('Eingabe wird nicht mutiert, Ergebnis ist eine Permutation', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input, new Rng(hashSeed('TEST2')))
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual([...input].sort())
  })

  it('leeres/Singleton-Array ist unverändert', () => {
    expect(shuffle([], new Rng(hashSeed('TEST1')))).toEqual([])
    expect(shuffle([42], new Rng(hashSeed('TEST1')))).toEqual([42])
  })
})
