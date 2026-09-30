// Registry gemäß Masterplan 8.4: Der Core kennt keine Inhalte. Er hält nur
// Maps für alle Inhaltstypen; Inhalte registrieren sich selbst über
// registerAllContent() in src/content. Unbekannte ID → Fehler mit ID im Text.
import type { CardDef, CardId } from './types/cards'
import type { EnemyDef } from './types/enemies'

// Minimale Def-Formen für Inhalte ohne Typ im Plan; Details folgen später
// (Begegnungen M2.5, Artefakte M6, Tränke M7, Events M10).
export interface EncounterDef {
  id: string
  nameKey: string
  enemyIds: string[]
}

export interface RelicDef {
  id: string
  nameKey: string
  descriptionKey: string
}

export interface PotionDef {
  id: string
  nameKey: string
  descriptionKey: string
}

export interface EventDef {
  id: string
  nameKey: string
  descriptionKey: string
}

// Skript-Signatur (Effect-Skripte und Skript-KI): ctx-Typ wird mit der
// Kampf-Engine (M3.1) bzw. Gegner-KI (M8.2) konkretisiert.
export type ScriptFn = (ctx: unknown, params?: Record<string, number>) => void

const cards = new Map<CardId, CardDef>()
const enemies = new Map<string, EnemyDef>()
const encounters = new Map<string, EncounterDef>()
const relics = new Map<string, RelicDef>()
const potions = new Map<string, PotionDef>()
const events = new Map<string, EventDef>()
const scripts = new Map<string, ScriptFn>()

function unknown(kind: string, id: string): Error {
  return new Error(`Unbekannte ${kind}-ID: "${id}"`)
}

// register* überschreibt bewusst – mehrfaches Registrieren derselben Def
// ist harmlos (registerAllContent() ist idempotent).
export function registerCard(def: CardDef): void {
  cards.set(def.id, def)
}
export function getCard(id: CardId): CardDef {
  const def = cards.get(id)
  if (!def) throw unknown('Karte', id)
  return def
}

export function registerEnemy(def: EnemyDef): void {
  enemies.set(def.id, def)
}
export function getEnemy(id: string): EnemyDef {
  const def = enemies.get(id)
  if (!def) throw unknown('Gegner', id)
  return def
}

export function registerEncounter(def: EncounterDef): void {
  encounters.set(def.id, def)
}
export function getEncounter(id: string): EncounterDef {
  const def = encounters.get(id)
  if (!def) throw unknown('Begegnung', id)
  return def
}

export function registerRelic(def: RelicDef): void {
  relics.set(def.id, def)
}
export function getRelic(id: string): RelicDef {
  const def = relics.get(id)
  if (!def) throw unknown('Artefakt', id)
  return def
}

export function registerPotion(def: PotionDef): void {
  potions.set(def.id, def)
}
export function getPotion(id: string): PotionDef {
  const def = potions.get(id)
  if (!def) throw unknown('Trank', id)
  return def
}

export function registerEvent(def: EventDef): void {
  events.set(def.id, def)
}
export function getEvent(id: string): EventDef {
  const def = events.get(id)
  if (!def) throw unknown('Event', id)
  return def
}

export function registerScript(id: string, fn: ScriptFn): void {
  scripts.set(id, fn)
}
export function getScript(id: string): ScriptFn {
  const fn = scripts.get(id)
  if (!fn) throw unknown('Skript', id)
  return fn
}
