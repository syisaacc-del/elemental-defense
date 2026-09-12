import type { WeaponDef, WeaponId } from '../types/game.ts'

export const MATCH_SECONDS = 5 * 60
export const START_SCORE = 100
export const START_PLAYER_HP = 100
export const START_BASE_HP = 100
export const RELOAD_SECONDS = 2

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
    accent: '#38bdf8',
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
    accent: '#c084fc',
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
    damage: 120,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 0,
    description: '射速慢，单发伤害极高，自带 5 倍镜。',
    accent: '#7dd3fc',
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
    damage: 120,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 0,
    description: '射速慢，单发伤害极高，自带 5 倍镜。',
    accent: '#86efac',
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
    damage: 55,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 4.5,
    description: '射速中等，爆炸范围伤害。',
    accent: '#fb7185',
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
    damage: 55,
    reloadTime: RELOAD_SECONDS,
    aoeRadius: 4.5,
    description: '射速中等，爆炸范围伤害。',
    accent: '#4ade80',
  },
]

export function getWeapon(id: WeaponId): WeaponDef {
  const found = WEAPON_LIST.find((weapon) => weapon.id === id)
  if (!found) {
    throw new Error(`Unknown weapon: ${id}`)
  }
  return found
}
