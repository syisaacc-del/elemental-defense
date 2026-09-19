import { Billboard, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { BallCollider, CapsuleCollider, RigidBody, interactionGroups } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import { AURA_MS, ELEMENT_COLORS, resolveReaction } from '../../data/elements.ts'
import type { ElementId } from '../../types/game.ts'
import { useGameStore } from '../../store/gameStore.ts'
import { BASE_TRIGGER_RADIUS } from '../constants.ts'
import { BASE_POSITION, ELITE_SPEED, NORMAL_SPEED, WAYPOINT_REACH } from '../map/layout.ts'
import { emitHitPopup } from '../combat/combatFx.ts'
import { registerEnemy } from './registry.ts'
import type { EnemyKind } from './spawn.ts'
import type { Vec2 } from '../map/layout.ts'

const LOOKS = {
  zombie: { color: '#4b6b3a', eye: '#9cff57' },
  slime: { color: '#3ecf7a', eye: '#d8ffe4' },
}

const enemyGroup = interactionGroups(1, [0])

export function Enemy({
  id,
  kind,
  elite,
  hp,
  position,
  waypoints,
  onRemove,
}: {
  id: number
  kind: EnemyKind
  elite: boolean
  hp: number
  position: [number, number, number]
  waypoints: Vec2[]
  onRemove: (id: number) => void
}) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const settled = useRef(false)
  const waypointIndex = useRef(1)
  const hpRef = useRef(hp)
  const auraRef = useRef<ElementId | null>(null)
  const auraUntil = useRef(0)
  const [currentHp, setCurrentHp] = useState(hp)
  const [aura, setAura] = useState<ElementId | null>(null)
  const look = LOOKS[kind]
  const scale = elite ? 2 : 1
  const speed = elite ? ELITE_SPEED : NORMAL_SPEED

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
      hitRadius: elite ? 2.1 : 1.15,
      takeDamage: (amount, element) => {
        if (settled.current) return null

        const now = performance.now()
        if (auraUntil.current < now) {
          auraRef.current = null
        }

        const attached = auraRef.current
        const pos = body.current?.translation() ?? { x: position[0], y: position[1], z: position[2] }
        const jitter = (Math.random() - 0.5) * 0.35
        const headY = pos.y + (elite ? 2.4 : 1.35)
        const reaction = attached && attached !== element ? resolveReaction(attached, element) : null

        let dealt = amount
        let text = String(Math.round(amount))
        let color = ELEMENT_COLORS[element]
        let kind: 'damage' | 'reaction' = 'damage'

        if (reaction) {
          dealt = Math.round(amount * reaction.multiplier)
          text = reaction.name
          color = reaction.color
          kind = 'reaction'
          auraRef.current = null
          auraUntil.current = 0
          setAura(null)
        } else {
          auraRef.current = element
          auraUntil.current = now + AURA_MS
          setAura(element)
        }

        hpRef.current -= dealt
        setCurrentHp(hpRef.current)
        if (hpRef.current <= 0) finish('kill')

        const popup = {
          position: [pos.x + jitter, headY, pos.z] as [number, number, number],
          text,
          color,
          kind,
        }
        emitHitPopup(popup)
        return popup
      },
    })
  }, [elite, id, position])

  useFrame(() => {
    if (!body.current || settled.current) return
    if (useGameStore.getState().phase !== 'playing') return
    if (auraRef.current && performance.now() > auraUntil.current) {
      auraRef.current = null
      setAura(null)
    }

    const pos = body.current.translation()
    const vel = body.current.linvel()
    const target = waypoints[Math.min(waypointIndex.current, waypoints.length - 1)]
    if (!target) return

    const dx = target.x - pos.x
    const dz = target.z - pos.z
    const dist = Math.hypot(dx, dz)
    const toBase = Math.hypot(pos.x - BASE_POSITION.x, pos.z - BASE_POSITION.z)

    if (toBase < BASE_TRIGGER_RADIUS) {
      finish('leak')
      return
    }

    if (dist < WAYPOINT_REACH && waypointIndex.current < waypoints.length - 1) {
      waypointIndex.current += 1
    }

    if (dist > 0.001) {
      body.current.setLinvel({ x: (dx / dist) * speed, y: vel.y, z: (dz / dist) * speed }, true)
      if (visual.current) visual.current.rotation.y = Math.atan2(dx, dz)
    }
  })

  const ratio = Math.max(0, currentHp / hp)
  const barWidth = elite ? 1.6 : 0.85
  const barY = elite ? 3.15 : kind === 'slime' ? 1.05 : 1.45

  return (
    <RigidBody
      ref={body}
      position={position}
      colliders={false}
      mass={elite ? 2.4 : 1.2}
      lockRotations
      friction={0}
      linearDamping={0.15}
      userData={{ enemyId: id }}
      canSleep={false}
      collisionGroups={enemyGroup}
    >
      {kind === 'slime' ? (
        <BallCollider args={[0.55 * scale]} />
      ) : (
        <CapsuleCollider args={[0.42 * scale, 0.38 * scale]} />
      )}
      <group ref={visual} scale={scale}>
        {kind === 'slime' ? (
          <mesh castShadow position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshStandardMaterial
              color={elite ? '#8b1d1d' : look.color}
              roughness={0.25}
              metalness={0.05}
            />
          </mesh>
        ) : (
          <group>
            <mesh castShadow position={[0, 0.1, 0]}>
              <capsuleGeometry args={[0.38, 0.84, 6, 12]} />
              <meshStandardMaterial color={elite ? '#6b2020' : look.color} roughness={0.8} />
            </mesh>
            <mesh position={[0.14, 0.55, 0.28]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={look.eye} emissive={look.eye} emissiveIntensity={1.4} />
            </mesh>
            <mesh position={[-0.14, 0.55, 0.28]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color={look.eye} emissive={look.eye} emissiveIntensity={1.4} />
            </mesh>
          </group>
        )}
      </group>
      <Billboard position={[0, barY, 0]}>
        <mesh>
          <planeGeometry args={[barWidth, 0.1]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[(ratio - 1) * (barWidth / 2), 0, 0.01]} scale={[ratio, 1, 1]}>
          <planeGeometry args={[barWidth, 0.1]} />
          <meshBasicMaterial color={elite ? '#ef4444' : ratio > 0.35 ? '#4ade80' : '#f87171'} />
        </mesh>
      </Billboard>
      {aura && (
        <mesh position={[0, barY + 0.28, 0]}>
          <sphereGeometry args={[elite ? 0.16 : 0.11, 10, 10]} />
          <meshBasicMaterial color={ELEMENT_COLORS[aura]} />
        </mesh>
      )}
      {elite && (
        <Html center position={[0, barY + 0.55, 0]} distanceFactor={12} occlude={false}>
          <div
            style={{
              color: '#ff1a1a',
              fontWeight: 900,
              fontSize: '18px',
              letterSpacing: '0.2em',
              textShadow: '0 0 8px #000, 0 1px 0 #000',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
            }}
          >
            精英
          </div>
        </Html>
      )}
    </RigidBody>
  )
}
