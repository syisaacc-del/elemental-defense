import type { ElementId } from '../types/game.ts'

export const ELEMENT_COLORS: Record<ElementId, string> = {
  water: '#00008B',
  grass: '#90EE90',
  ice: '#87CEEB',
  fire: '#FF0000',
  wind: '#00FA9A',
  thunder: '#800080',
}

export const AURA_MS = 8000

export type ReactionKind = 'damage' | 'reaction'

export type HitPopup = {
  position: [number, number, number]
  text: string
  color: string
  kind: ReactionKind
}

type ReactionDef = {
  name: string
  multiplier: number
  color?: string
}

const REACTION_TABLE: Record<string, ReactionDef> = {
  'fire+ice': { name: '融化', multiplier: 1.5, color: '#FFA500' },
  'fire+water': { name: '蒸发', multiplier: 1.5, color: '#FF00FF' },
  'ice+thunder': { name: '超导', multiplier: 1.25, color: '#4B0082' },
  'fire+thunder': { name: '超载', multiplier: 1.35, color: '#8B0000' },
  'thunder+water': { name: '感电', multiplier: 1.3 },
  'ice+water': { name: '冻结', multiplier: 1.2 },
  'fire+grass': { name: '燃烧', multiplier: 1.35 },
  'grass+water': { name: '绽放', multiplier: 1.35 },
  'grass+thunder': { name: '激化', multiplier: 1.3 },
  'grass+ice': { name: '碎冰', multiplier: 1.15 },
  'fire+wind': { name: '扩散', multiplier: 1.15 },
  'grass+wind': { name: '扩散', multiplier: 1.15 },
  'ice+wind': { name: '扩散', multiplier: 1.15 },
  'thunder+wind': { name: '扩散', multiplier: 1.15 },
  'water+wind': { name: '扩散', multiplier: 1.15 },
}

function pairKey(a: ElementId, b: ElementId) {
  return a < b ? `${a}+${b}` : `${b}+${a}`
}

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace('#', '')
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ]
}

export function mixHex(first: string, second: string) {
  const [ar, ag, ab] = parseHex(first)
  const [br, bg, bb] = parseHex(second)
  const mix = [
    Math.round((ar + br) / 2),
    Math.round((ag + bg) / 2),
    Math.round((ab + bb) / 2),
  ]
  return `#${mix.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function mixElementColors(first: ElementId, second: ElementId) {
  const reaction = REACTION_TABLE[pairKey(first, second)]
  if (reaction?.color) return reaction.color
  return mixHex(ELEMENT_COLORS[first], ELEMENT_COLORS[second])
}

export function resolveReaction(first: ElementId, second: ElementId) {
  const reaction = REACTION_TABLE[pairKey(first, second)]
  if (!reaction) return null
  return {
    name: reaction.name,
    multiplier: reaction.multiplier,
    color: reaction.color ?? mixElementColors(first, second),
  }
}
