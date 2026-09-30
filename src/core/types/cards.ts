// Karten-Typen gemäß Masterplan 6 (Datenmodell).
import type { EffectSpec } from './effects'

export type CardId = string // Definitions-ID, z. B. "rs_hammer_blow"
export type CardUid = string // Instanz-ID im Deck, z. B. "c_0042"

export type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse'
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special'
export type TargetMode = 'enemy' | 'allEnemies' | 'randomEnemy' | 'self' | 'none'

export type Keyword =
  | 'exhaust' // Erschöpfen: nach dem Spielen aus dem Kampf entfernt
  | 'ethereal' // Flüchtig: wird am Rundenende erschöpft, wenn noch auf der Hand
  | 'retain' // Beibehalten: bleibt am Rundenende auf der Hand
  | 'innate' // Angeboren: startet in der Anfangshand
  | 'unplayable' // Unspielbar

export interface CardDef {
  id: CardId
  nameKey: string // i18n-Schlüssel
  type: CardType
  rarity: Rarity
  cost: number | 'X' // 'X' = verbraucht gesamte Glut
  target: TargetMode
  keywords: Keyword[]
  effects: EffectSpec[] // deklarativ, siehe Masterplan 8
  upgrade: CardUpgradeSpec // Unterschiede der verbesserten Version
  descriptionKey: string // Text mit Platzhaltern {damage}, {block}, …
  characterId: string | 'neutral'
}

export interface CardUpgradeSpec {
  cost?: number | 'X'
  effects?: EffectSpec[] // ersetzt effects komplett, falls gesetzt
  addKeywords?: Keyword[]
  removeKeywords?: Keyword[]
}

export interface CardInstance {
  uid: CardUid
  defId: CardId
  upgraded: boolean
  costOverride?: { value: number; until: 'turn' | 'combat' | 'played' }
}
