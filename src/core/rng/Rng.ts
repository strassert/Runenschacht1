// Seedbarer PRNG gemäß Masterplan 13.1: Seed-Hash cyrb128, Generator sfc32.
// Niemals Math.random() im Core (ESLint-Regel). Der Zustand (4 Zahlen) ist
// serialisierbar und wird in RunState.rngStates gespeichert.

/** cyrb128: Text → 4 Startwerte (Seed-Hash, Masterplan 13.1). */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0]
}

export type RngState = [number, number, number, number]

/** Seed-Text → Startzustand. */
export function hashSeed(seedText: string): RngState {
  return cyrb128(seedText)
}

/** sfc32-PRNG mit explizitem, serialisierbarem Zustand. */
export class Rng {
  private a: number
  private b: number
  private c: number
  private d: number

  constructor(state: readonly number[]) {
    const [a, b, c, d] = state
    if (state.length !== 4 || a === undefined || b === undefined || c === undefined || d === undefined) {
      throw new Error('Rng-Zustand muss genau 4 Zahlen enthalten')
    }
    this.a = a >>> 0
    this.b = b >>> 0
    this.c = c >>> 0
    this.d = d >>> 0
  }

  /** Nächste Zahl im Bereich [0, 1). */
  next(): number {
    let a = this.a
    let b = this.b
    let c = this.c
    let d = this.d
    a >>>= 0
    b >>>= 0
    c >>>= 0
    d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = ((c << 21) | (c >>> 11)) | 0
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    this.a = a
    this.b = b
    this.c = c
    this.d = d
    return (t >>> 0) / 4294967296
  }

  /** Ganzzahl im Bereich [min, maxExclusive). */
  nextInt(min: number, maxExclusive: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(maxExclusive) || maxExclusive <= min) {
      throw new Error(`Ungültiger Bereich [${min}, ${maxExclusive})`)
    }
    return min + Math.floor(this.next() * (maxExclusive - min))
  }

  /** Zufälliges Element; wirft bei leerem Array. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error('pick() aus leerem Array')
    }
    const value = arr[this.nextInt(0, arr.length)]
    if (value === undefined) {
      throw new Error('pick() außerhalb des Array-Bereichs')
    }
    return value
  }

  /** Zustand für RunState.rngStates / Save. */
  getState(): RngState {
    return [this.a, this.b, this.c, this.d]
  }
}
