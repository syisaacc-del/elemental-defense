import type { WeaponDef, WeaponId } from '../types/game.ts'
import { ELEMENT_COLORS } from './elements.ts'

export const MATCH_SECONDS = 5 * 60
export const START_SCORE = 100
export const START_PLAYER_HP = 100
export const START_BASE_HP = 100
export const RELOAD_SECONDS = 2
export const VERSUS_HP = 800

export const WEAPON_LIST: WeaponDef[] = [
  {
    id: 'water-rifle',
    name: '潮汐突击步枪',
    element: 'water',
    elementLabel: '水',
    kind: 'rifle',
    kindLabel: '突击步枪',
    magazineSize: 65,
    fireRate: 10,
    damage: 18,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 0,
    description: '射速快，单发伤害中等。',
    accent: ELEMENT_COLORS.water,
  },
  {
    id: 'thunder-rifle',
    name: '怒雷突击步枪',
    element: 'thunder',
    elementLabel: '雷',
    kind: 'rifle',
    kindLabel: '突击步枪',
    magazineSize: 65,
    fireRate: 10,
    damage: 18,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 0,
    description: '射速快，单发伤害中等。',
    accent: ELEMENT_COLORS.thunder,
  },
  {
    id: 'ice-sniper',
    name: '凝霜狙击枪',
    element: 'ice',
    elementLabel: '冰',
    kind: 'sniper',
    kindLabel: '狙击枪',
    magazineSize: 3,
    fireRate: 0.7,
    damage: 1200,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 0,
    description: '射速慢，单发伤害极高，自带 5 倍镜。',
    accent: ELEMENT_COLORS.ice,
  },
  {
    id: 'wind-sniper',
    name: '裂空狙击枪',
    element: 'wind',
    elementLabel: '风',
    kind: 'sniper',
    kindLabel: '狙击枪',
    magazineSize: 3,
    fireRate: 0.7,
    damage: 1200,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 0,
    description: '射速慢，单发伤害极高，自带 5 倍镜。',
    accent: ELEMENT_COLORS.wind,
  },
  {
    id: 'fire-launcher',
    name: '炎爆榴弹枪',
    element: 'fire',
    elementLabel: '火',
    kind: 'launcher',
    kindLabel: '榴弹枪',
    magazineSize: 6,
    fireRate: 1.4,
    damage: 600,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 4.5,
    description: '射速中等，爆炸范围伤害。',
    accent: ELEMENT_COLORS.fire,
  },
  {
    id: 'grass-launcher',
    name: '生机榴弹枪',
    element: 'grass',
    elementLabel: '草',
    kind: 'launcher',
    kindLabel: '榴弹枪',
    magazineSize: 6,
    fireRate: 1.4,
    damage: 600,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 4.5,
    description: '射速中等，爆炸范围伤害。',
    accent: ELEMENT_COLORS.grass,
  },
  {
    id: 'ice-knife',
    name: '寒霜小刀',
    element: 'ice',
    elementLabel: '冰',
    kind: 'melee',
    kindLabel: '近战',
    magazineSize: 1,
    fireRate: 1.4,
    damage: 600,
    reloadTime: 0.35,
    aoeRadius: 0,
    description: '近距离挥砍，单次伤害 600。',
    accent: ELEMENT_COLORS.ice,
  },
  {
    id: 'fire-sticky',
    name: '炎核黏弹',
    element: 'fire',
    elementLabel: '火',
    kind: 'sticky',
    kindLabel: '黏性炸弹',
    magazineSize: 4,
    fireRate: 1.1,
    damage: 500,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 1.2,
    description: '投出后会黏在敌人身上，片刻后爆炸，伤害 500。',
    accent: ELEMENT_COLORS.fire,
  },
]

export function getWeapon(id: WeaponId): WeaponDef {
  const found = WEAPON_LIST.find((weapon) => weapon.id === id)
  if (!found) {
    throw new Error(`Unknown weapon: ${id}`)
  }
  return found
}
