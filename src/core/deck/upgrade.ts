// Karten-Verbesserung (Masterplan 6/7.3): der Zustand "upgraded" lebt auf der
// Instanz; die eigentlichen Werte-Änderungen stehen als CardUpgradeSpec auf
// der Definition (Anwendung erfolgt in M2 zusammen mit der Registry).
import type { CardInstance } from '../types/cards'

/** Gibt eine verbesserte Kopie zurück (idempotent). */
export function upgradeCard(card: CardInstance): CardInstance {
  return { ...card, upgraded: true }
}

/** Verbessert eine Karte im Stapel an Position `index` (pure). */
export function upgradeInPlace(cards: readonly CardInstance[], index: number): CardInstance[] {
  const card = cards[index]
  if (card === undefined) {
    throw new Error(`upgradeInPlace: Index ${index} außerhalb des Bereichs`)
  }
  return cards.map((c, i) => (i === index ? upgradeCard(c) : c))
}

/** Verbessert alle Kopien einer defId im Stapel (z. B. Shop-/Reward-Logik). */
export function upgradeAll(cards: readonly CardInstance[], defId: string): CardInstance[] {
  return cards.map((c) => (c.defId === defId ? upgradeCard(c) : c))
}
