export type Vec2 = { x: number; z: number }

export const CROSSBAR_LENGTH = 140
export const LANE_WIDTH = 32
export const CROSSBAR_Z = 42
export const STEM_LENGTH = 88
export const STEM_CENTER_Z = -2
export const FLOOR_Y = -0.4
export const FLOOR_THICKNESS = 0.8

export const LEFT_SPAWN: Vec2 = { x: -52, z: CROSSBAR_Z }
export const RIGHT_SPAWN: Vec2 = { x: 52, z: CROSSBAR_Z }
export const JUNCTION: Vec2 = { x: 0, z: CROSSBAR_Z }
export const BASE_POSITION: Vec2 = { x: 0, z: -38 }

export const LEFT_WAYPOINTS: Vec2[] = [
  LEFT_SPAWN,
  { x: -24, z: CROSSBAR_Z },
  JUNCTION,
  { x: 0, z: 16 },
  { x: 0, z: -10 },
  BASE_POSITION,
]

export const RIGHT_WAYPOINTS: Vec2[] = [
  RIGHT_SPAWN,
  { x: 24, z: CROSSBAR_Z },
  JUNCTION,
  { x: 0, z: 16 },
  { x: 0, z: -10 },
  BASE_POSITION,
]

export const GUARD_TOWER_SPOTS: Vec2[] = [
  { x: 11, z: -30 },
  { x: -11, z: -30 },
  { x: 11, z: -44 },
  { x: -11, z: -44 },
]

export const PLAYER_START: [number, number, number] = [0, 2.2, -26]

export const NORMAL_HP = 600
export const ELITE_HP = 6000
export const NORMAL_SPEED = 2.55
export const ELITE_SPEED = 1.85
export const WAYPOINT_REACH = 1.35

export const OBSTACLE_SPOTS: Array<{
  position: [number, number, number]
  size: [number, number, number]
  color: string
}> = [
  { position: [-12.5, 0.7, 50], size: [1.8, 1.4, 1.8], color: '#6b5a4a' },
  { position: [13, 0.85, 51], size: [2.1, 1.7, 1.6], color: '#5a6570' },
  { position: [-36, 0.7, 52], size: [1.6, 1.4, 1.6], color: '#6b5a4a' },
  { position: [38, 0.75, 28.8], size: [1.7, 1.5, 1.5], color: '#5a6570' },
  { position: [12.4, 0.8, 8], size: [1.8, 1.6, 1.8], color: '#6b5a4a' },
  { position: [-12.6, 0.7, -8], size: [1.6, 1.4, 1.8], color: '#5a6570' },
  { position: [12.2, 0.9, -18], size: [2, 1.8, 1.5], color: '#6b5a4a' },
]
