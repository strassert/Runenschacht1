// Invarianten-Checker gemäß Masterplan 13.3: prüft den Zustand nach jedem
// Zug (bzw. nach jedem Test) und meldet alle Verletzungen. Der Checker ist
// read-only und wirft nicht – er gibt eine Liste zurück, damit Tests und
// Debug-Overlay damit arbeiten können.
import type { CardInstance } from './types/cards'
import type { PlayerCombatState, RunState } from './types/state'
import { ASCENSION_MAX, MAX_HAND } from './constants'

export interface InvariantViolation {
  rule: string
  detail: string
}

/** Prüft alle Masterplan-13.3-Invarianten (und ein paar sinnvolle Extras). */
export function checkInvariants(state: RunState): InvariantViolation[] {
  const violations: InvariantViolation[] = []

  // HP-Grenzen auf Run-Ebene
  if (state.hp > state.maxHp) {
    violations.push({ rule: 'hp<=maxHp', detail: `Run-HP ${state.hp} > maxHp ${state.maxHp}` })
  }
  if (state.hp < 0) {
    violations.push({ rule: 'hp>=0', detail: `Run-HP negativ: ${state.hp}` })
  }
  if (state.gold < 0) {
    violations.push({ rule: 'gold>=0', detail: `Gold negativ: ${state.gold}` })
  }
  if (state.ascension < 0 || state.ascension > ASCENSION_MAX) {
    violations.push({ rule: 'ascension<=10', detail: `Tiefenstufe ${state.ascension} außerhalb 0–10` })
  }

  // Karten-UIDs global eindeutig (Deck ist die Quelle; Instanzen dürfen
  // nicht doppelt erzeugt werden)
  const deckUids = new Map<string, CardInstance>()
  for (const card of state.deck) {
    if (deckUids.has(card.uid)) {
      violations.push({ rule: 'deckUidsUnique', detail: `UID ${card.uid} doppelt im Deck` })
    }
    deckUids.set(card.uid, card)
  }

  if (state.combat !== null) {
    violations.push(...checkCombatInvariants(state.combat.player, state.deck.length))
  }

  return violations
}

/**
 * Kampfbezogene Invarianten (Masterplan 13.3). `deckSize` ist die Größe des
 * Run-Decks zum Zeitpunkt des Kampfbeginns (Karten werden als Instanzen in
 * die Stapel kopiert).
 */
export function checkCombatInvariants(
  p: PlayerCombatState,
  deckSize: number,
): InvariantViolation[] {
  const violations: InvariantViolation[] = []

  if (p.hp > p.maxHp) {
    violations.push({ rule: 'hp<=maxHp', detail: `Kampf-HP ${p.hp} > maxHp ${p.maxHp}` })
  }
  if (p.hp < 0) {
    violations.push({ rule: 'hp>=0', detail: `Kampf-HP negativ: ${p.hp}` })
  }
  if (p.block < 0) {
    violations.push({ rule: 'block>=0', detail: `Block negativ: ${p.block}` })
  }
  if (p.energy < 0) {
    violations.push({ rule: 'energy>=0', detail: `Glut negativ: ${p.energy}` })
  }
  if (p.energy > p.maxEnergy) {
    violations.push({ rule: 'energy<=maxEnergy', detail: `Glut ${p.energy} > max ${p.maxEnergy}` })
  }
  if (p.hand.length > MAX_HAND) {
    violations.push({ rule: 'hand<=maxHand', detail: `Hand ${p.hand.length} > ${MAX_HAND}` })
  }
  for (const s of [...p.statuses, ...p.powers]) {
    if (s.stacks < 0) {
      violations.push({ rule: 'stacks>=0', detail: `Status ${s.id} mit negativen Stapeln: ${s.stacks}` })
    }
  }

  // Keine Karte in zwei Stapeln gleichzeitig
  const seen = new Map<string, string>()
  const piles: Array<[string, readonly CardInstance[]]> = [
    ['drawPile', p.drawPile],
    ['hand', p.hand],
    ['discardPile', p.discardPile],
    ['exhaustPile', p.exhaustPile],
  ]
  for (const [pileName, pile] of piles) {
    for (const card of pile) {
      const other = seen.get(card.uid)
      if (other !== undefined) {
        violations.push({
          rule: 'noCardInTwoPiles',
          detail: `UID ${card.uid} in ${other} und ${pileName}`,
        })
      }
      seen.set(card.uid, pileName)
    }
  }

  // Stapelsumme = Deckgröße + generierte − entfernte Karten
  const total = p.drawPile.length + p.hand.length + p.discardPile.length + p.exhaustPile.length
  const expected = deckSize + p.cardsGeneratedThisCombat - p.cardsRemovedThisCombat
  if (total !== expected) {
    violations.push({
      rule: 'pileSum',
      detail: `Stapelsumme ${total} ≠ Deck ${deckSize} + ${p.cardsGeneratedThisCombat} generiert − ${p.cardsRemovedThisCombat} entfernt (= ${expected})`,
    })
  }
  if (p.cardsGeneratedThisCombat < 0 || p.cardsRemovedThisCombat < 0) {
    violations.push({
      rule: 'counters>=0',
      detail: `Karten-Zähler negativ: generiert ${p.cardsGeneratedThisCombat}, entfernt ${p.cardsRemovedThisCombat}`,
    })
  }
  return violations
}
