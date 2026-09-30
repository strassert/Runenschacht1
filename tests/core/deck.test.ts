// Stapel-Logik (Masterplan 7.2): Ziehen, Nachmischen, Überlauf, Ablegen,
// Erschöpfen, innate-Karten – inklusive Determinismus-Check.
import { describe, expect, it } from 'vitest'
import { discardCard, drawCards, exhaustCard, prepareDrawPile } from '../../src/core/deck/piles'
import { MAX_HAND } from '../../src/core/constants'
import { makeCards, makeCard, makePlayer, makeRngStates } from './helpers'

describe('drawCards', () => {
  it('zieht 5 aus vollem Nachziehstapel (Spitze = Array-Ende)', () => {
    const player = makePlayer({ drawPile: makeCards(10) })
    const result = drawCards(player, makeRngStates(), 5)
    expect(result.player.hand.map((c) => c.uid)).toEqual(['c_10', 'c_9', 'c_8', 'c_7', 'c_6'])
    expect(result.player.drawPile.map((c) => c.uid)).toEqual(['c_1', 'c_2', 'c_3', 'c_4', 'c_5'])
    expect(result.events.filter((e) => e.type === 'cardDrawn')).toHaveLength(5)
  })

  it('mischt die Ablage nach, wenn der Nachziehstapel leer ist', () => {
    const player = makePlayer({
      drawPile: makeCards(2, 'd_'),
      discardPile: makeCards(8, 'a_'),
    })
    const result = drawCards(player, makeRngStates(), 5)
    expect(result.player.hand).toHaveLength(5)
    expect(result.player.drawPile).toHaveLength(5) // 8 gemischt − 3 nachgezogen
    expect(result.player.discardPile).toHaveLength(0)
    expect(result.events.some((e) => e.type === 'drawPileRefilled')).toBe(true)
  })

  it('Nachziehen aus gemischter Ablage ist seed-deterministisch', () => {
    const build = () =>
      makePlayer({ drawPile: makeCards(2, 'd_'), discardPile: makeCards(8, 'a_') })
    const a = drawCards(build(), makeRngStates('TEST1'), 5)
    const b = drawCards(build(), makeRngStates('TEST1'), 5)
    const c = drawCards(build(), makeRngStates('TEST2'), 5)
    expect(a.player.hand.map((x) => x.uid)).toEqual(b.player.hand.map((x) => x.uid))
    expect(a.player.hand.map((x) => x.uid)).not.toEqual(c.player.hand.map((x) => x.uid))
  })

  it('schiebt überzählige Karten in die Ablage (Hand-Cap MAX_HAND)', () => {
    const player = makePlayer({
      hand: makeCards(MAX_HAND - 1, 'h_'), // 9 Karten
      drawPile: makeCards(5, 'd_'),
    })
    const result = drawCards(player, makeRngStates(), 5)
    expect(result.player.hand).toHaveLength(MAX_HAND)
    expect(result.player.discardPile).toHaveLength(4)
    expect(result.events.filter((e) => e.type === 'cardDrawn')).toHaveLength(5)
    expect(result.events.filter((e) => e.type === 'cardDiscarded')).toHaveLength(4)
  })

  it('stoppt still, wenn Nachzieh- und Ablagestapel leer sind', () => {
    const player = makePlayer({ hand: makeCards(1, 'h_') })
    const result = drawCards(player, makeRngStates(), 5)
    expect(result.player.hand).toHaveLength(1)
    expect(result.events).toHaveLength(0)
  })

  it('leere Ablage + 1 Karte im Nachziehstapel → nur diese Karte', () => {
    const player = makePlayer({ drawPile: makeCards(1) })
    const result = drawCards(player, makeRngStates(), 5)
    expect(result.player.hand).toHaveLength(1)
    expect(result.player.drawPile).toHaveLength(0)
  })

  it('negative Anzahl wirft', () => {
    expect(() => drawCards(makePlayer(), makeRngStates(), -1)).toThrow()
  })

  it('pure: Originalzustand bleibt unverändert', () => {
    const player = makePlayer({ drawPile: makeCards(10) })
    const snapshot = JSON.stringify(player)
    drawCards(player, makeRngStates(), 5)
    expect(JSON.stringify(player)).toBe(snapshot)
  })
})

describe('discardCard / exhaustCard', () => {
  it('Ablegen verschiebt die UID von der Hand in die Ablage', () => {
    const player = makePlayer({ hand: makeCards(3, 'h_') })
    const result = discardCard(player, 'h_2')
    expect(result.player.hand.map((c) => c.uid)).toEqual(['h_1', 'h_3'])
    expect(result.player.discardPile.map((c) => c.uid)).toEqual(['h_2'])
    expect(result.events).toEqual([{ type: 'cardDiscarded', cardUid: 'h_2', cardId: 'strike' }])
  })

  it('Erschöpfen verschiebt die UID in den Erschöpfungsstapel', () => {
    const player = makePlayer({ hand: makeCards(3, 'h_') })
    const result = exhaustCard(player, 'h_1')
    expect(result.player.hand.map((c) => c.uid)).toEqual(['h_2', 'h_3'])
    expect(result.player.exhaustPile.map((c) => c.uid)).toEqual(['h_1'])
    expect(result.events[0]?.type).toBe('cardExhausted')
  })

  it('unbekannte UID wirft', () => {
    const player = makePlayer({ hand: makeCards(2, 'h_') })
    expect(() => discardCard(player, 'h_99')).toThrow()
    expect(() => exhaustCard(player, 'h_99')).toThrow()
  })
})

describe('prepareDrawPile (innate an die Spitze)', () => {
  it('innate-Karten landen am Array-Ende (zuerst gezogen)', () => {
    const player = makePlayer({
      drawPile: [makeCard('c_1'), makeCard('c_2', 'shield'), makeCard('c_3'), makeCard('c_4', 'shield')],
    })
    const prepared = prepareDrawPile(player, (c) => c.defId === 'shield')
    expect(prepared.drawPile.map((c) => c.uid)).toEqual(['c_1', 'c_3', 'c_2', 'c_4'])
    // die nächsten zwei Züge sind garantiert die innate-Karten
    const drawn = drawCards(prepared, makeRngStates(), 2)
    expect(drawn.player.hand.map((c) => c.uid)).toEqual(['c_4', 'c_2'])
  })
})

describe('Determinismus der Stapel-Logik', () => {
  it('gleicher Startzustand + gleicher Seed → identisches Ergebnis', () => {
    const build = () =>
      makePlayer({ drawPile: makeCards(10), discardPile: makeCards(4, 'a_') })
    const run = (seed: string) => {
      const states = makeRngStates(seed)
      const first = drawCards(build(), states, 12) // erzwingt Nachmischen
      return {
        hand: first.player.hand.map((c) => c.uid),
        states: first.rngStates,
      }
    }
    const a = run('TEST1')
    const b = run('TEST1')
    expect(a.hand).toEqual(b.hand)
    expect(a.states).toEqual(b.states)
  })
})
