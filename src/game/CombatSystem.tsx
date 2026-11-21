import { Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { BallCollider, RigidBody, interactionGroups, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Group, PerspectiveCamera, Vector3 } from 'three'
import { ELEMENT_COLORS } from '../data/elements.ts'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import { useSettingsStore } from '../store/settingsStore.ts'
import type { ElementId, FireResult } from '../types/game.ts'
import { damageEnemiesAt, enemyStillAlive, findEnemyNear, getEnemy } from './enemies/registry.ts'
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

// 炸彈只撞地板／障礙（0、2），唔好撞玩家同敵人，否則會擊飛導致鏡頭掉落變黑
const projectileGroup = interactionGroups(3, [0, 2])

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
      collisionGroups={projectileGroup}
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

function stickyOffset(id: number): [number, number, number] {
  // 多粒炸彈黐同一隻時，散開喺身體四周，睇得出係「黐住」
  const angle = (id * 2.399) % (Math.PI * 2)
  const lift = 0.35 + (id % 4) * 0.22
  const radius = 0.48 + (id % 3) * 0.08
  return [Math.cos(angle) * radius, lift, Math.sin(angle) * radius]
}

function StickyBombMesh({ color, stuck }: { color: string; stuck: boolean }) {
  const size = stuck ? 0.18 : 0.11
  return (
    <group>
      <mesh>
        <sphereGeometry args={[size, 14, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={stuck ? 2.2 : 1.2} roughness={0.35} />
      </mesh>
      <mesh position={[0, size * 0.95, 0]}>
        <cylinderGeometry args={[0.028, 0.038, size * 0.75, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={stuck ? 1.6 : 0.7} />
      </mesh>
      {stuck && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 1.85, 22]} />
          <meshBasicMaterial color="#ffcc66" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
    </group>
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
  const visual = useRef<Group>(null)
  const pulseMesh = useRef<Group>(null)
  const born = useRef(performance.now())
  const stuckAt = useRef(0)
  const done = useRef(false)
  const stuckRef = useRef(false)
  const [stuck, setStuck] = useState(false)
  const enemyId = useRef<number | null>(null)
  const followRemote = useRef(false)
  const worldPos = useRef<[number, number, number] | null>(null)
  const lastPos = useRef<[number, number, number]>([...grenade.origin])
  const offset = useMemo(() => stickyOffset(grenade.id), [grenade.id])
  const onBurstRef = useRef(onBurst)
  onBurstRef.current = onBurst

  const detonate = (point: [number, number, number]) => {
    if (done.current) return
    done.current = true
    onBurstRef.current(point, grenade.color)
  }

  const beginStick = () => {
    if (stuckRef.current || done.current) return
    stuckRef.current = true
    stuckAt.current = performance.now()
    setStuck(true)
  }

  useFrame((_, delta) => {
    if (done.current) return

    if (!stuckRef.current) {
      const rb = body.current
      if (!rb) return
      const t = rb.translation()
      lastPos.current = [t.x, t.y, t.z]

      if (isVersus() && remotePlayer.active) {
        const dx = remotePlayer.x - t.x
        const dy = remotePlayer.y - t.y
        const dz = remotePlayer.z - t.z
        if (dx * dx + dy * dy + dz * dz <= STICKY_STICK_RADIUS * STICKY_STICK_RADIUS) {
          followRemote.current = true
          beginStick()
          return
        }
      }

      const near = findEnemyNear(t.x, t.y, t.z, STICKY_STICK_RADIUS)
      if (near) {
        enemyId.current = near.id
        beginStick()
        return
      }

      if (performance.now() - born.current > 4500) {
        detonate([t.x, t.y, t.z])
      }
      return
    }

    // 已黐住：純視覺跟住目標，唔再行物理（多粒一齊都唔會黑屏）
    let px = lastPos.current[0]
    let py = lastPos.current[1]
    let pz = lastPos.current[2]

    if (followRemote.current) {
      px = remotePlayer.x + offset[0]
      py = remotePlayer.y + offset[1]
      pz = remotePlayer.z + offset[2]
    } else if (enemyId.current !== null) {
      if (!enemyStillAlive(enemyId.current)) {
        detonate([px, py, pz])
        return
      }
      const pos = getEnemy(enemyId.current)?.getPosition()
      if (pos) {
        px = pos.x + offset[0]
        py = pos.y + offset[1]
        pz = pos.z + offset[2]
      }
    } else if (worldPos.current) {
      px = worldPos.current[0]
      py = worldPos.current[1] + 0.12
      pz = worldPos.current[2]
    }

    lastPos.current = [px, py, pz]
    if (visual.current) {
      visual.current.position.set(px, py, pz)
      visual.current.rotation.y += delta * 3.5
    }
    const life = (performance.now() - stuckAt.current) / STICKY_FUSE_MS
    const pulse = 0.5 + 0.5 * Math.sin(life * Math.PI * 10)
    if (pulseMesh.current) pulseMesh.current.scale.setScalar(1 + pulse * 0.18)

    if (performance.now() - stuckAt.current >= STICKY_FUSE_MS) {
      detonate([px, py, pz])
    }
  })

  if (stuck) {
    return (
      <group ref={visual} position={lastPos.current}>
        <group ref={pulseMesh}>
          <StickyBombMesh color={grenade.color} stuck />
        </group>
      </group>
    )
  }

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={grenade.origin}
      linearVelocity={grenade.velocity}
      gravityScale={0.85}
      ccd
      collisionGroups={projectileGroup}
      onCollisionEnter={() => {
        if (done.current || stuckRef.current || performance.now() - born.current < 70) return
        const t = body.current?.translation()
        worldPos.current = t ? [t.x, t.y, t.z] : [...grenade.origin]
        beginStick()
      }}
    >
      <BallCollider args={[0.11]} />
      <StickyBombMesh color={grenade.color} stuck={false} />
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
    // 爆炸太近鏡頭／太多叠埋會蓋住成個畫面變黑 → 強制細同限數量
    const dx = point[0] - camera.position.x
    const dy = point[1] - camera.position.y
    const dz = point[2] - camera.position.z
    const dist = Math.hypot(dx, dy, dz)
    if (dist < 1.6) return
    const safeScale = dist < 4 ? Math.min(scale, 0.28) : Math.min(scale, 0.7)
    const id = nextFxId++
    setBursts((list) => {
      const next = [...list, { id, point, color, scale: safeScale }]
      return next.length > 4 ? next.slice(next.length - 4) : next
    })
    window.setTimeout(() => {
      setBursts((list) => list.filter((item) => item.id !== id))
    }, Math.min(life, 160))
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
    // 黏彈用好細嘅閃光；榴彈都縮細，避免多粒同時爆蓋黑畫面
    addBurst(point, color, grenade.sticky ? 0.22 : 0.55, grenade.sticky ? 90 : 180)
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
        <mesh key={burst.id} position={burst.point} renderOrder={2}>
          <sphereGeometry args={[burst.scale, 10, 10]} />
          <meshBasicMaterial
            color={burst.color}
            transparent
            opacity={0.28}
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}
