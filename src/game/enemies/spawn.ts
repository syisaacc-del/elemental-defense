import {
  ELITE_HP,
  LEFT_SPAWN,
  LEFT_WAYPOINTS,
  NORMAL_HP,
  RIGHT_SPAWN,
  RIGHT_WAYPOINTS,
} from '../map/layout.ts'
import type { Vec2 } from '../map/layout.ts'

export type EnemyKind = 'zombie' | 'slime'
export type Lane = 'left' | 'right'

export type EnemySpawn = {
  id: number
  kind: EnemyKind
  elite: boolean
  hp: number
  lane: Lane
  position: [number, number, number]
  waypoints: Vec2[]
}

let nextEnemyId = 1

export function createEnemySpawn(kind?: EnemyKind): EnemySpawn {
  const lane: Lane = Math.random() > 0.5 ? 'left' : 'right'
  const elite = nextEnemyId % 5 === 0 || Math.random() < 0.14
  const spawn = lane === 'left' ? LEFT_SPAWN : RIGHT_SPAWN
  const waypoints = lane === 'left' ? LEFT_WAYPOINTS : RIGHT_WAYPOINTS

  return {
    id: nextEnemyId++,
    kind: kind ?? (Math.random() > 0.45 ? 'zombie' : 'slime'),
    elite,
    hp: elite ? ELITE_HP : NORMAL_HP,
    lane,
    position: [spawn.x, 1.35, spawn.z],
    waypoints,
  }
}

export function spawnIntervalForTime(timeLeft: number, matchSeconds: number) {
  const elapsed = matchSeconds - timeLeft
  if (elapsed < 40) return 2800
  if (elapsed < 120) return 2000
  return 1400
}
