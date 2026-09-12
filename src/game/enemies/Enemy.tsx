import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { BallCollider, CapsuleCollider, RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import { useGameStore } from '../../store/gameStore.ts'
import { BASE_TRIGGER_RADIUS } from '../constants.ts'
import { registerEnemy } from './registry.ts'
import type { EnemyKind } from './spawn.ts'

const STATS = {
  zombie: { hp: 54, speed: 2.35, color: '#4b6b3a', eye: '#9cff57' },
  slime: { hp: 36, speed: 3.15, color: '#3ecf7a', eye: '#d8ffe4' },
}

export function Enemy({
  id,
  kind,
  position,
  onRemove,
}: {
  id: number
  kind: EnemyKind
  position: [number, number, number]
  onRemove: (id: number) => void
}) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const settled = useRef(false)
  const hpRef = useRef(STATS[kind].hp)
  const [hp, setHp] = useState(STATS[kind].hp)
  const stats = STATS[kind]

  const finish = (result: 'kill' | 'leak') => {
    if (settled.current) return
    settled.current = true
    if (result === 'kill') useGameStore.getState().recordKill()
    else useGameStore.getState().recordLeak()
    onRemove(id)
  }

  useEffect(() => {
    return registerEnemy({
      id,
      getPosition: () => body.current?.translation() ?? { x: position[0], y: position[1], z: position[2] },
      takeDamage: (amount) => {
        if (settled.current) return
        hpRef.current -= amount
        setHp(hpRef.current)
        if (hpRef.current <= 0) finish('kill')
      },
    })
  }, [id, position])

  useFrame(() => {
    if (!body.current || settled.current) return
    if (useGameStore.getState().phase !== 'playing') return

    const pos = body.current.translation()
    const vel = body.current.linvel()
    const dx = -pos.x
    const dz = -pos.z
    const dist = Math.hypot(dx, dz)

    if (dist < BASE_TRIGGER_RADIUS) {
      finish('leak')
      return
    }

    const speed = stats.speed
    body.current.setLinvel({ x: (dx / dist) * speed, y: vel.y, z: (dz / dist) * speed }, true)
    if (visual.current) visual.current.rotation.y = Math.atan2(dx, dz)
  })

  const ratio = Math.max(0, hp / stats.hp)

  return (
    <RigidBody
      ref={body}
      position={position}
      colliders={false}
      mass={1.2}
      lockRotations
      friction={0.2}
      linearDamping={0.4}
      userData={{ enemyId: id }}
      canSleep={false}
    >
      {kind === 'slime' ? <BallCollider args={[0.55]} /> : <CapsuleCollider args={[0.42, 0.38]} />}
      <group ref={visual}>
        {kind === 'slime' ? (
          <mesh castShadow position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshStandardMaterial color={stats.color} roughness={0.25} metalness={0.05} />
          </mesh>
        ) : (
          <group>
            <mesh castShadow position={[0, 0.1, 0]}>
              <capsuleGeometry args={[0.38, 0.84, 6, 12]} />
              <meshStandardMaterial color={stats.color} roughness={0.8} />
            </mesh>
            <mesh position={[0.14, 0.55, 0.28]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={stats.eye} emissive={stats.eye} emissiveIntensity={1.4} />
            </mesh>
            <mesh position={[-0.14, 0.55, 0.28]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={stats.eye} emissive={stats.eye} emissiveIntensity={1.4} />
            </mesh>
          </group>
        )}
      </group>
      <Billboard position={[0, kind === 'slime' ? 1.05 : 1.45, 0]}>
        <mesh>
          <planeGeometry args={[0.85, 0.08]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[(ratio - 1) * 0.425, 0, 0.01]} scale={[ratio, 1, 1]}>
          <planeGeometry args={[0.85, 0.08]} />
          <meshBasicMaterial color={ratio > 0.35 ? '#4ade80' : '#f87171'} />
        </mesh>
      </Billboard>
    </RigidBody>
  )
}
