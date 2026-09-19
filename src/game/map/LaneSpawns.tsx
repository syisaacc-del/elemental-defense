import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh } from 'three'
import { LEFT_SPAWN, RIGHT_SPAWN } from './layout.ts'

function SpawnCircle({
  position,
  accent,
}: {
  position: [number, number, number]
  accent: string
}) {
  const ring = useRef<Mesh>(null)

  useFrame((state) => {
    if (!ring.current) return
    const pulse = 0.08 * Math.sin(state.clock.elapsedTime * 2.4)
    ring.current.scale.setScalar(1 + pulse)
  })

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[4.2, 48]} />
        <meshStandardMaterial color="#0b1220" emissive={accent} emissiveIntensity={0.35} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[4.15, 4.85, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[2.3, 0.07, 10, 36]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.35, 28]} />
        <meshStandardMaterial color="#ffffff" emissive={accent} emissiveIntensity={1.2} />
      </mesh>
    </group>
  )
}

export function LaneSpawns() {
  return (
    <>
      <SpawnCircle position={[LEFT_SPAWN.x, 0, LEFT_SPAWN.z]} accent="#ff7a4d" />
      <SpawnCircle position={[RIGHT_SPAWN.x, 0, RIGHT_SPAWN.z]} accent="#7aa8ff" />
    </>
  )
}
