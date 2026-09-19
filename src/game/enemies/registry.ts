import type { HitPopup } from '../../data/elements.ts'
import type { ElementId } from '../../types/game.ts'

type EnemyHandle = {
  id: number
  getPosition: () => { x: number; y: number; z: number }
  hitRadius: number
  takeDamage: (amount: number, element: ElementId) => HitPopup | null
}

const handles = new Map<number, EnemyHandle>()

export function registerEnemy(handle: EnemyHandle) {
  handles.set(handle.id, handle)
  return () => {
    handles.delete(handle.id)
  }
}

export function damageEnemiesAt(
  point: { x: number; y: number; z: number },
  radius: number,
  damage: number,
  element: ElementId,
) {
  const popups: HitPopup[] = []
  for (const handle of handles.values()) {
    const pos = handle.getPosition()
    const dx = pos.x - point.x
    const dy = pos.y - point.y
    const dz = pos.z - point.z
    const reach = Math.max(radius, handle.hitRadius)
    if (dx * dx + dy * dy + dz * dz <= reach * reach) {
      const popup = handle.takeDamage(damage, element)
      if (popup) popups.push(popup)
    }
  }
  return popups
}
