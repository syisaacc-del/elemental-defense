import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { BallCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { ELEMENT_COLORS } from '../data/elements.ts'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { FireResult } from '../types/game.ts'
import { damageEnemiesAt } from './enemies/registry.ts'
import {
  DEFAULT_FOV,
  ENEMY_HIT_RADIUS,
  GRENADE_SPEED,
  HIP_ADS_FOV,
  PLAYER_EYE_OFFSET,
  SHOT_RANGE,
  SNIPER_ADS_FOV,
} from './constants.ts'

type Tracer = {
  id: number
  start: [number, number, number]
  end: [number, number, number]
  color: string
}

type Grenade = {
  id: number
  origin: [number, number, number]
  velocity: [number, number, number]
  color: string
  damage: number
  radius: number
  element: FireResult['element']
}

type Burst = {
  id: number
  point: [number, number, number]
  color: string
  scale: number
}

let nextFxId = 1

function GrenadeBody({
  grenade,
  onBurst,
}: {
  grenade: Grenade
  onBurst: (point: [number, number, number], color: string) => void
}) {
  const body = useRef<RapierRigidBody>(null)
  const born = useRef(performance.now())
  const done = useRef(false)
  const onBurstRef = useRef(onBurst)
  onBurstRef.current = onBurst

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (done.current) return
      done.current = true
      const t = body.current?.translation()
      onBurstRef.current(t ? [t.x, t.y, t.z] : grenade.origin, grenade.color)
    }, 3500)
    return () => window.clearTimeout(timer)
  }, [grenade.color, grenade.origin])

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={grenade.origin}
      linearVelocity={grenade.velocity}
      gravityScale={0.9}
      ccd
      onCollisionEnter={() => {
        if (done.current || performance.now() - born.current < 90) return
        done.current = true
        const t = body.current?.translation()
        onBurst(t ? [t.x, t.y, t.z] : grenade.origin, grenade.color)
      }}
    >
      <BallCollider args={[0.12]} />
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={grenade.color} emissive={grenade.color} emissiveIntensity={1.2} />
      </mesh>
    </RigidBody>
  )
}

export function CombatSystem({ playerBody }: { playerBody: RefObject<RapierRigidBody | null> }) {
  const { camera } = useThree()
  const { rapier, world } = useRapier()
  const firing = useRef(false)
  const fireAcc = useRef(99)
  const origin = useRef(new Vector3())
  const direction = useRef(new Vector3())
  const [tracers, setTracers] = useState<Tracer[]>([])
  const [grenades, setGrenades] = useState<Grenade[]>([])
  const [bursts, setBursts] = useState<Burst[]>([])

  const isPointerLocked = useGameStore((state) => state.isPointerLocked)
  const currentSlot = useGameStore((state) => state.currentSlot)
  const loadout = useGameStore((state) => state.loadout)
  const current = loadout?.[currentSlot]
  const weapon = current ? getWeapon(current.id) : null

  useEffect(() => {
    fireAcc.current = 99
  }, [current?.id])

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const store = useGameStore.getState()
      if (store.phase !== 'playing' || !store.isPointerLocked) return
      if (event.button === 0) {
        firing.current = true
        fireAcc.current = 99
      }
      if (event.button === 2) store.setAiming(true)
    }

    const onUp = (event: MouseEvent) => {
      if (event.button === 0) firing.current = false
      if (event.button === 2) useGameStore.getState().setAiming(false)
    }

    const onContext = (event: MouseEvent) => {
      event.preventDefault()
    }

    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('contextmenu', onContext)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('contextmenu', onContext)
    }
  }, [])

  useEffect(() => {
    if (isPointerLocked) return
    firing.current = false
    fireAcc.current = 99
    useGameStore.getState().setAiming(false)
  }, [isPointerLocked])

  const addBurst = (point: [number, number, number], color: string, scale: number, life: number) => {
    const id = nextFxId++
    setBursts((list) => [...list, { id, point, color, scale }])
    window.setTimeout(() => {
      setBursts((list) => list.filter((item) => item.id !== id))
    }, life)
  }

  const spawnShot = (shot: FireResult) => {
    camera.getWorldDirection(direction.current)
    const store = useGameStore.getState()
    if (store.cameraMode === 'tps' && playerBody.current) {
      const pos = playerBody.current.translation()
      origin.current.set(pos.x, pos.y + PLAYER_EYE_OFFSET, pos.z)
      origin.current.addScaledVector(direction.current, 0.7)
    } else {
      origin.current.copy(camera.position).addScaledVector(direction.current, 0.7)
    }

    if (shot.kind === 'launcher') {
      setGrenades((list) => [
        ...list,
        {
          id: nextFxId++,
          origin: [origin.current.x, origin.current.y, origin.current.z],
          velocity: [
            direction.current.x * GRENADE_SPEED,
            direction.current.y * GRENADE_SPEED,
            direction.current.z * GRENADE_SPEED,
          ],
          color: ELEMENT_COLORS[shot.element],
          damage: shot.damage,
          radius: shot.aoeRadius,
          element: shot.element,
        },
      ])
      return
    }

    const ray = new rapier.Ray(origin.current, direction.current)
    const hit = world.castRay(
      ray,
      SHOT_RANGE,
      true,
      undefined,
      undefined,
      undefined,
      playerBody.current ?? undefined,
    )
    const distance = hit ? hit.timeOfImpact : SHOT_RANGE
    const end = origin.current.clone().addScaledVector(direction.current, distance)
    const id = nextFxId++

    setTracers((list) => [
      ...list,
      {
        id,
        start: [origin.current.x, origin.current.y, origin.current.z],
        end: [end.x, end.y, end.z],
        color: ELEMENT_COLORS[shot.element],
      },
    ])
    addBurst([end.x, end.y, end.z], ELEMENT_COLORS[shot.element], shot.kind === 'sniper' ? 0.28 : 0.14, 90)
    damageEnemiesAt(end, ENEMY_HIT_RADIUS, shot.damage, shot.element)
    window.setTimeout(() => {
      setTracers((list) => list.filter((item) => item.id !== id))
    }, 70)
  }

  useFrame((_, delta) => {
    const now = performance.now()
    const store = useGameStore.getState()
    store.completeReloadIfDue(now)

    const ads = store.isAiming
    const targetFov = ads
      ? weapon?.kind === 'sniper'
        ? SNIPER_ADS_FOV
        : HIP_ADS_FOV
      : DEFAULT_FOV
    const view = camera as PerspectiveCamera
    view.fov += (targetFov - view.fov) * Math.min(1, delta * 9)
    view.updateProjectionMatrix()

    if (!firing.current || !weapon) {
      if (!firing.current) fireAcc.current = 99
      return
    }

    fireAcc.current += delta
    const interval = 1 / weapon.fireRate
    if (fireAcc.current < interval) return
    fireAcc.current = 0
    const shot = store.tryFire(now)
    if (shot) spawnShot(shot)
  })

  return (
    <>
      {tracers.map((tracer) => (
        <Line key={tracer.id} points={[tracer.start, tracer.end]} color={tracer.color} lineWidth={2} />
      ))}

      {grenades.map((grenade) => (
        <GrenadeBody
          key={grenade.id}
          grenade={grenade}
          onBurst={(point, color) => {
            setGrenades((list) => list.filter((item) => item.id !== grenade.id))
            addBurst(point, color, 1.6, 280)
            damageEnemiesAt(
              { x: point[0], y: point[1], z: point[2] },
              grenade.radius,
              grenade.damage,
              grenade.element,
            )
          }}
        />
      ))}

      {bursts.map((burst) => (
        <mesh key={burst.id} position={burst.point}>
          <sphereGeometry args={[burst.scale, 12, 12]} />
          <meshBasicMaterial color={burst.color} transparent opacity={0.55} />
        </mesh>
      ))}

    </>
  )
}
