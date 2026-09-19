import { CuboidCollider, RigidBody, interactionGroups } from '@react-three/rapier'
import {
  CROSSBAR_LENGTH,
  CROSSBAR_Z,
  FLOOR_THICKNESS,
  FLOOR_Y,
  LANE_WIDTH,
  LEFT_WAYPOINTS,
  OBSTACLE_SPOTS,
  RIGHT_WAYPOINTS,
  STEM_CENTER_Z,
  STEM_LENGTH,
} from './layout.ts'
import { useGridTexture } from './gridTexture.ts'

const wallH = 5
const wallT = 1.2
const floorGroup = interactionGroups(0, [0, 1, 2])
const propGroup = interactionGroups(2, [0, 2])

function FloorPad({
  position,
  size,
  repeat,
}: {
  position: [number, number, number]
  size: [number, number, number]
  repeat: [number, number]
}) {
  const texture = useGridTexture(repeat[0], repeat[1])
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        map={texture}
        color="#9ec4e8"
        metalness={0.35}
        roughness={0.45}
        emissive="#12324a"
        emissiveIntensity={0.2}
      />
    </mesh>
  )
}

function Wall({
  position,
  size,
}: {
  position: [number, number, number]
  size: [number, number, number]
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} collisionGroups={propGroup}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#2a3c55" metalness={0.25} roughness={0.55} />
      </mesh>
    </RigidBody>
  )
}

function PathGlow({ from, to }: { from: { x: number; z: number }; to: { x: number; z: number } }) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.hypot(dx, dz)
  const angle = Math.atan2(dx, dz)
  return (
    <mesh position={[(from.x + to.x) / 2, 0.03, (from.z + to.z) / 2]} rotation={[0, angle, 0]}>
      <boxGeometry args={[1.6, 0.04, length]} />
      <meshStandardMaterial
        color="#5cecff"
        emissive="#5cecff"
        emissiveIntensity={1.6}
        transparent
        opacity={0.55}
      />
    </mesh>
  )
}

export function TMap() {
  return (
    <>
      <RigidBody type="fixed" colliders={false} collisionGroups={floorGroup}>
        <CuboidCollider
          args={[CROSSBAR_LENGTH / 2, FLOOR_THICKNESS / 2, LANE_WIDTH / 2]}
          position={[0, FLOOR_Y, CROSSBAR_Z]}
        />
        <CuboidCollider
          args={[LANE_WIDTH / 2, FLOOR_THICKNESS / 2, STEM_LENGTH / 2]}
          position={[0, FLOOR_Y, STEM_CENTER_Z]}
        />
        <FloorPad
          position={[0, FLOOR_Y, CROSSBAR_Z]}
          size={[CROSSBAR_LENGTH, FLOOR_THICKNESS, LANE_WIDTH]}
          repeat={[14, 3]}
        />
        <FloorPad
          position={[0, FLOOR_Y, STEM_CENTER_Z]}
          size={[LANE_WIDTH, FLOOR_THICKNESS, STEM_LENGTH]}
          repeat={[3, 9]}
        />
      </RigidBody>

      {LEFT_WAYPOINTS.slice(0, -1).map((point, index) => (
        <PathGlow key={`l-${index}`} from={point} to={LEFT_WAYPOINTS[index + 1]!} />
      ))}
      {RIGHT_WAYPOINTS.slice(0, -1).map((point, index) => (
        <PathGlow key={`r-${index}`} from={point} to={RIGHT_WAYPOINTS[index + 1]!} />
      ))}

      <Wall position={[0, wallH / 2, 58]} size={[CROSSBAR_LENGTH, wallH, wallT]} />
      <Wall position={[-43, wallH / 2, 26]} size={[54, wallH, wallT]} />
      <Wall position={[43, wallH / 2, 26]} size={[54, wallH, wallT]} />
      <Wall position={[-70, wallH / 2, CROSSBAR_Z]} size={[wallT, wallH, LANE_WIDTH]} />
      <Wall position={[70, wallH / 2, CROSSBAR_Z]} size={[wallT, wallH, LANE_WIDTH]} />
      <Wall position={[-LANE_WIDTH / 2, wallH / 2, -10]} size={[wallT, wallH, 72]} />
      <Wall position={[LANE_WIDTH / 2, wallH / 2, -10]} size={[wallT, wallH, 72]} />
      <Wall position={[0, wallH / 2, -46]} size={[LANE_WIDTH, wallH, wallT]} />

      {OBSTACLE_SPOTS.map((item) => (
        <RigidBody
          key={`${item.position[0]}-${item.position[2]}`}
          type="fixed"
          colliders="cuboid"
          position={item.position}
          collisionGroups={propGroup}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={item.size} />
            <meshStandardMaterial color={item.color} roughness={0.8} metalness={0.1} />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}
