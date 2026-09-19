import { CylinderCollider, RigidBody, interactionGroups } from '@react-three/rapier'
import { BASE_POSITION } from './layout.ts'

const propGroup = interactionGroups(2, [0, 2])

export function MainTower() {
  return (
    <group position={[BASE_POSITION.x, 0, BASE_POSITION.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[6.2, 48]} />
        <meshStandardMaterial color="#1a140c" emissive="#c9a227" emissiveIntensity={0.25} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[5.6, 6.2, 48]} />
        <meshStandardMaterial color="#f0c14b" emissive="#f0c14b" emissiveIntensity={1.4} />
      </mesh>

      <RigidBody type="fixed" colliders={false} collisionGroups={propGroup}>
        <CylinderCollider args={[1.6, 1.1]} position={[0, 1.6, 0]} />
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[2.4, 2.8, 0.7, 8]} />
          <meshStandardMaterial color="#3b3228" metalness={0.3} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[1.15, 1.6, 1.2, 8]} />
          <meshStandardMaterial color="#6d5a3a" metalness={0.45} roughness={0.4} />
        </mesh>
        <mesh position={[0, 3.1, 0]} castShadow>
          <octahedronGeometry args={[1.55, 0]} />
          <meshStandardMaterial
            color="#7ef0ff"
            emissive="#2ad4ff"
            emissiveIntensity={2.2}
            metalness={0.2}
            roughness={0.15}
          />
        </mesh>
        <mesh position={[0, 4.7, 0]} castShadow>
          <octahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color="#fff3b0" emissive="#ffd45a" emissiveIntensity={1.8} />
        </mesh>
        <mesh position={[0, 2.4, 0]}>
          <torusGeometry args={[1.35, 0.08, 10, 28]} />
          <meshStandardMaterial color="#f0c14b" emissive="#f0c14b" emissiveIntensity={1.1} />
        </mesh>
        <mesh position={[0, 6.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
          <meshStandardMaterial color="#7ef0ff" emissive="#7ef0ff" emissiveIntensity={2} />
        </mesh>
      </RigidBody>
    </group>
  )
}
