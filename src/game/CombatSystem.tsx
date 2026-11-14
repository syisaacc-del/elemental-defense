import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { BallCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Mesh, PerspectiveCamera, Vector3 } from 'three'
import { ELEMENT_COLORS } from '../data/elements.ts'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import { useSettingsStore } from '../store/settingsStore.ts'
import type { ElementId, FireResult } from '../types/game.ts'
import { damageEnemiesAt, findEnemyNear } from './enemies/registry.ts'
import { playShotSound } from './combatAudio.ts'
import { isVersus, remotePlayer, remoteRayHit, versusSendHit, versusSendShot } from './net/peer.ts'
import { detectTouch, touchInput } from './touchInput.ts'
import {
  ENEMY_HIT_RADIUS,
  GRENADE_SPEED,
  HIP_ADS_FOV,
  MELEE_RANGE,
  PLAYER_EYE_OFFSET,
  SHOT_RANGE,
  SNIPER_ADS_FOV,
  STICKY_FUSE_MS,
  STICKY_SPEED,
  STICKY_STICK_RADIUS,
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
  element: ElementId
  sticky?: boolean
}

type Burst = {
  id: number
  point: [number, number, number]
  color: string
  scale: number
}

let nextFxId = 1

function hitRemoteAt(point: [number, number, number], radius: number, damage: number, element: ElementId) {
  if (!isVersus() || !remotePlayer.active || remotePlayer.invincible) return
  const dx = remotePlayer.x - point[0]
  const dy = remotePlayer.y - point[1]
  const dz = remotePlayer.z - point[2]
  if (dx * dx + dy * dy + dz * dz <= (radius + 0.85) * (radius + 0.85)) {
    versusSendHit(damage, element)
  }
}

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

function StickyBody({
  grenade,
  onBurst,
}: {
  grenade: Grenade
  onBurst: (point: [number, number, number], color: string) => void
}) {
  const body = useRef<RapierRigidBody>(null)
  const mesh = useRef<Mesh>(null)
  const born = useRef(performance.now())
  const stuck = useRef(false)
  const done = useRef(false)
  const followEnemy = useRef<(() => { x: number; y: number; z: number }) | null>(null)
  const followRemote = useRef(false)
  const onBurstRef = useRef(onBurst)
  onBurstRef.current = onBurst

  const detonate = (point: [number, number, number]) => {
    if (done.current) return
    done.current = true
    onBurstRef.current(point, grenade.color)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (done.current) return
      if (followRemote.current) {
        detonate([remotePlayer.x, remotePlayer.y, remotePlayer.z])
        return
      }
      if (followEnemy.current) {
        const p = followEnemy.current()
        detonate([p.x, p.y, p.z])
        return
      }
      const t = body.current?.translation()
      detonate(t ? [t.x, t.y, t.z] : grenade.origin)
    }, STICKY_FUSE_MS + 2500)
    return () => window.clearTimeout(timer)
  }, [grenade.origin])

  useFrame(() => {
    if (done.current) return
    const rb = body.current
    if (!rb) return

    if (stuck.current) {
      if (followRemote.current) {
        const p: [number, number, number] = [remotePlayer.x, remotePlayer.y + 0.35, remotePlayer.z]
        rb.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] })
        if (performance.now() - born.current >= STICKY_FUSE_MS) detonate(p)
        return
      }
      if (followEnemy.current) {
        const p = followEnemy.current()
        rb.setNextKinematicTranslation({ x: p.x, y: p.y + 0.45, z: p.z })
        if (performance.now() - born.current >= STICKY_FUSE_MS) detonate([p.x, p.y, p.z])
        return
      }
      if (performance.now() - born.current >= STICKY_FUSE_MS) {
        const t = rb.translation()
        detonate([t.x, t.y, t.z])
      }
      return
    }

    const t = rb.translation()

    if (isVersus() && remotePlayer.active) {
      const dx = remotePlayer.x - t.x
      const dy = remotePlayer.y - t.y
      const dz = remotePlayer.z - t.z
      if (dx * dx + dy * dy + dz * dz <= STICKY_STICK_RADIUS * STICKY_STICK_RADIUS) {
        stuck.current = true
        followRemote.current = true
        born.current = performance.now()
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
        rb.setBodyType(2, true)
        return
      }
    }

    const near = findEnemyNear(t.x, t.y, t.z, STICKY_STICK_RADIUS)
    if (near) {
      stuck.current = true
      followEnemy.current = near.getPosition
      born.current = performance.now()
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rb.setBodyType(2, true)
    }
  })

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={grenade.origin}
      linearVelocity={grenade.velocity}
      gravityScale={0.85}
      ccd
      onCollisionEnter={() => {
        if (done.current || stuck.current || performance.now() - born.current < 70) return
        stuck.current = true
        born.current = performance.now()
        body.current?.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.current?.setBodyType(2, true)
      }}
    >
      <BallCollider args={[0.11]} />
      <mesh ref={mesh}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial color={grenade.color} emissive={grenade.color} emissiveIntensity={1.4} />
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
      if (detectTouch()) return
      const store = useGameStore.getState()
      if (store.phase !== 'playing' || !store.isPointerLocked || useSettingsStore.getState().settingsOpen) return
      if (event.button === 0) {
        firing.current = true
        fireAcc.current = 99
      }
      if (event.button === 2) store.setAiming(true)
    }

    const onUp = (event: MouseEvent) => {
      if (detectTouch()) return
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
      origin.current.addScaledVector(direction.current, 0.55)
    } else {
      origin.current.copy(camera.position).addScaledVector(direction.current, 0.55)
    }

    playShotSound(shot.kind)

    if (shot.kind === 'launcher' || shot.kind === 'sticky') {
      if (isVersus()) {
        versusSendShot(
          [origin.current.x, origin.current.y, origin.current.z],
          [direction.current.x, direction.current.y, direction.current.z],
          shot.element,
          shot.kind,
        )
      }
      setGrenades((list) => [
        ...list,
        {
          id: nextFxId++,
          origin: [origin.current.x, origin.current.y, origin.current.z],
          velocity: [
            direction.current.x * (shot.kind === 'sticky' ? STICKY_SPEED : GRENADE_SPEED),
            direction.current.y * (shot.kind === 'sticky' ? STICKY_SPEED : GRENADE_SPEED),
            direction.current.z * (shot.kind === 'sticky' ? STICKY_SPEED : GRENADE_SPEED),
          ],
          color: ELEMENT_COLORS[shot.element],
          damage: shot.damage,
          radius: shot.aoeRadius,
          element: shot.element,
          sticky: shot.kind === 'sticky',
        },
      ])
      return
    }

    const range = shot.kind === 'melee' ? MELEE_RANGE : SHOT_RANGE
    const ray = new rapier.Ray(origin.current, direction.current)
    const hit = world.castRay(
      ray,
      range,
      true,
      undefined,
      undefined,
      undefined,
      playerBody.current ?? undefined,
    )
    let distance = hit ? hit.timeOfImpact : range
    if (isVersus()) {
      versusSendShot(
        [origin.current.x, origin.current.y, origin.current.z],
        [direction.current.x, direction.current.y, direction.current.z],
        shot.element,
        shot.kind,
      )
      const remoteDist = remoteRayHit(
        origin.current.x,
        origin.current.y,
        origin.current.z,
        direction.current.x,
        direction.current.y,
        direction.current.z,
        distance,
      )
      if (remoteDist !== null) {
        distance = remoteDist
        versusSendHit(shot.damage, shot.element)
      }
    }
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
    addBurst(
      [end.x, end.y, end.z],
      ELEMENT_COLORS[shot.element],
      shot.kind === 'sniper' ? 0.28 : shot.kind === 'melee' ? 0.22 : 0.14,
      90,
    )
    damageEnemiesAt(end, shot.kind === 'melee' ? 1.35 : ENEMY_HIT_RADIUS, shot.damage, shot.element)
    window.setTimeout(() => {
      setTracers((list) => list.filter((item) => item.id !== id))
    }, 70)
  }

  useFrame((_, delta) => {
    const now = performance.now()
    const store = useGameStore.getState()
    store.completeReloadIfDue(now)

    const ads = store.isAiming
    const hipFov = useSettingsStore.getState().fov
    const targetFov = ads
      ? weapon?.kind === 'sniper'
        ? SNIPER_ADS_FOV
        : Math.min(HIP_ADS_FOV, hipFov - 12)
      : hipFov
    const view = camera as PerspectiveCamera
    view.fov += (targetFov - view.fov) * Math.min(1, delta * 9)
    view.updateProjectionMatrix()

    if (useSettingsStore.getState().settingsOpen) return

    const holding = firing.current || touchInput.firing
    if (!holding || !weapon) {
      if (!holding) fireAcc.current = 99
      return
    }

    fireAcc.current += delta
    const interval = 1 / weapon.fireRate
    if (fireAcc.current < interval) return
    fireAcc.current = 0
    const shot = store.tryFire(now)
    if (shot) spawnShot(shot)
  })

  const burstGrenade = (grenade: Grenade, point: [number, number, number], color: string) => {
    setGrenades((list) => list.filter((item) => item.id !== grenade.id))
    addBurst(point, color, grenade.sticky ? 1.1 : 1.6, 280)
    hitRemoteAt(point, grenade.radius, grenade.damage, grenade.element)
    damageEnemiesAt(
      { x: point[0], y: point[1], z: point[2] },
      grenade.radius || ENEMY_HIT_RADIUS,
      grenade.damage,
      grenade.element,
    )
  }

  return (
    <>
      {tracers.map((tracer) => (
        <Line key={tracer.id} points={[tracer.start, tracer.end]} color={tracer.color} lineWidth={2} />
      ))}

      {grenades.map((grenade) =>
        grenade.sticky ? (
          <StickyBody
            key={grenade.id}
            grenade={grenade}
            onBurst={(point, color) => burstGrenade(grenade, point, color)}
          />
        ) : (
          <GrenadeBody
            key={grenade.id}
            grenade={grenade}
            onBurst={(point, color) => burstGrenade(grenade, point, color)}
          />
        ),
      )}

      {bursts.map((burst) => (
        <mesh key={burst.id} position={burst.point}>
          <sphereGeometry args={[burst.scale, 12, 12]} />
          <meshBasicMaterial color={burst.color} transparent opacity={0.55} />
        </mesh>
      ))}
    </>
  )
}
