import { CylinderCollider, RigidBody, interactionGroups } from '@react-three/rapier'
import { GUARD_TOWER_SPOTS } from './layout.ts'

const propGroup = interactionGroups(2, [0, 2])

function GuardTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false} collisionGroups={propGroup}>
        <CylinderCollider args={[2.1, 0.7]} position={[0, 2.1, 0]} />
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.35, 1.55, 0.5, 8]} />
          <meshStandardMaterial color="#2d333c" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.1, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.75, 3.4, 8]} />
          <meshStandardMaterial color="#4a5564" metalness={0.4} roughness={0.45} />
        </mesh>
        <mesh position={[0, 3.95, 0]} castShadow>
          <cylinderGeometry args={[1.05, 0.7, 0.7, 8]} />
          <meshStandardMaterial color="#6d5a3a" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0, 4.7, 0]} castShadow>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshStandardMaterial color="#ff7a3a" emissive="#ff4d1a" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0, 3.4, 0]}>
          <torusGeometry args={[0.85, 0.06, 8, 20]} />
          <meshStandardMaterial color="#f0c14b" emissive="#c9a227" emissiveIntensity={0.8} />
        </mesh>
      </RigidBody>
    </group>
  )
}

export function GuardTowers() {
  return (
    <>
      {GUARD_TOWER_SPOTS.map((spot) => (
        <GuardTower key={`${spot.x}-${spot.z}`} position={[spot.x, 0, spot.z]} />
      ))}
    </>
  )
}
