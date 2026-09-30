// Fisher–Yates-Mischen mit dem Stream-RNG (Masterplan 13.1/13.3).
import type { Rng } from '../rng/Rng'

/** Gibt eine gemischte Kopie zurück; die Eingabe wird nicht verändert. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i + 1)
    const tmp = out[i] as T
    out[i] = out[j] as T
    out[j] = tmp
  }
  return out
}
