import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { MAP_SIZE } from './constants.ts'

const half = MAP_SIZE / 2
const wallHeight = 5
const wallThickness = 1.2

function Wall({
  position,
  size,
}: {
  position: [number, number, number]
  size: [number, number, number]
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#5b6570" roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}

function Crate({
  position,
  size = [1.6, 1.6, 1.6],
}: {
  position: [number, number, number]
  size?: [number, number, number]
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.85} />
      </mesh>
    </RigidBody>
  )
}

export function Ground() {
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[half, 0.2, half]} position={[0, -0.2, 0]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
          <meshStandardMaterial color="#4a6a3e" roughness={0.95} />
        </mesh>
      </RigidBody>

      <gridHelper args={[MAP_SIZE, 35, '#6f8a55', '#3d5234']} position={[0, 0.02, 0]} />

      <Wall position={[0, wallHeight / 2, half]} size={[MAP_SIZE, wallHeight, wallThickness]} />
      <Wall position={[0, wallHeight / 2, -half]} size={[MAP_SIZE, wallHeight, wallThickness]} />
      <Wall position={[half, wallHeight / 2, 0]} size={[wallThickness, wallHeight, MAP_SIZE]} />
      <Wall position={[-half, wallHeight / 2, 0]} size={[wallThickness, wallHeight, MAP_SIZE]} />

      <Crate position={[-10, 0.8, -8]} />
      <Crate position={[12, 0.8, 6]} />
      <Crate position={[8, 1.1, -14]} size={[2.2, 2.2, 2.2]} />
      <Crate position={[-16, 0.8, 11]} />
    </>
  )
}
