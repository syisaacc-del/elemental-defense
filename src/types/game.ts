export type ElementId = 'water' | 'thunder' | 'ice' | 'fire' | 'grass' | 'wind'

export type WeaponKind = 'rifle' | 'sniper' | 'launcher'

export type GamePhase = 'lobby' | 'playing' | 'ended'

export type EndReason = 'time' | 'score'

export type WeaponId =
  | 'water-rifle'
  | 'thunder-rifle'
  | 'ice-sniper'
  | 'wind-sniper'
  | 'fire-launcher'
  | 'grass-launcher'

export type WeaponDef = {
  id: WeaponId
  name: string
  element: ElementId
  elementLabel: string
  kind: WeaponKind
  kindLabel: string
  magazineSize: number
  fireRate: number
  damage: number
  reloadTime: number
  aoeRadius: number
  description: string
  accent: string
}

export type LoadoutWeapon = {
  id: WeaponId
  ammoInMag: number
  reserveAmmo: number
  isReloading: boolean
  lastShotAt: number
  reloadEndsAt: number
}

export type FireResult = {
  kind: WeaponKind
  damage: number
  aoeRadius: number
  accent: string
  element: ElementId
}
