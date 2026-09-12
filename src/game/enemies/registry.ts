type EnemyHandle = {
  id: number
  getPosition: () => { x: number; y: number; z: number }
  takeDamage: (amount: number) => void
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
) {
  const range = radius * radius
  for (const handle of handles.values()) {
    const pos = handle.getPosition()
    const dx = pos.x - point.x
    const dy = pos.y - point.y
    const dz = pos.z - point.z
    if (dx * dx + dy * dy + dz * dz <= range) {
      handle.takeDamage(damage)
    }
  }
}
