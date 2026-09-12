import { MAP_SIZE } from '../constants.ts'

export type EnemyKind = 'zombie' | 'slime'

export type EnemySpawn = {
  id: number
  kind: EnemyKind
  position: [number, number, number]
}

let nextEnemyId = 1

export function createEnemySpawn(kind?: EnemyKind): EnemySpawn {
  const edge = Math.floor(Math.random() * 4)
  const spread = (Math.random() - 0.5) * (MAP_SIZE - 24)
  const dist = MAP_SIZE / 2 - 6
  let x = 0
  let z = 0
  if (edge === 0) {
    x = spread
    z = dist
  } else if (edge === 1) {
    x = spread
    z = -dist
  } else if (edge === 2) {
    x = dist
    z = spread
  } else {
    x = -dist
    z = spread
  }

  return {
    id: nextEnemyId++,
    kind: kind ?? (Math.random() > 0.45 ? 'zombie' : 'slime'),
    position: [x, 1.3, z],
  }
}

export function spawnIntervalForTime(timeLeft: number, matchSeconds: number) {
  const elapsed = matchSeconds - timeLeft
  if (elapsed < 40) return 2800
  if (elapsed < 120) return 2000
  return 1400
}
