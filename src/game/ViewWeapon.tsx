import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Group, Mesh } from 'three'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { LoadoutWeapon, WeaponId } from '../types/game.ts'
import { ProceduralWeapon } from './ProceduralWeapon.tsx'
import { fitViewmodel, gunUrl, hasGunModel } from './weaponModels.ts'

function reloadPose(current: LoadoutWeapon) {
  if (!current.isReloading) {
    return { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0 }
  }
  const def = getWeapon(current.id)
  const remain = Math.max(0, current.reloadEndsAt - performance.now())
  const t = 1 - remain / (def.reloadTime * 1000)
  if (t < 0.22) {
    const u = t / 0.22
    return { x: 0.04 * u, y: -0.22 * u, z: 0.1 * u, rotX: 0.42 * u, rotY: -0.08 * u, rotZ: 0.55 * u }
  }
  if (t < 0.58) {
    const u = (t - 0.22) / 0.36
    return {
      x: 0.04,
      y: -0.24 - 0.05 * Math.sin(u * Math.PI),
      z: 0.12,
      rotX: 0.45,
      rotY: -0.1,
      rotZ: 0.58,
    }
  }
  if (t < 0.78) {
    const u = (t - 0.58) / 0.2
    return {
      x: 0.03 * (1 - u),
      y: -0.16 + 0.08 * u,
      z: 0.08,
      rotX: 0.35 - 0.12 * u,
      rotY: -0.06 * (1 - u),
      rotZ: 0.35 * (1 - u),
    }
  }
  const u = (t - 0.78) / 0.22
  return {
    x: 0,
    y: -0.06 * (1 - u),
    z: 0.14 * Math.sin(u * Math.PI),
    rotX: 0.18 * (1 - u) + 0.22 * Math.sin(u * Math.PI),
    rotY: 0,
    rotZ: 0,
  }
}

for (const id of ['water-rifle', 'thunder-rifle', 'ice-sniper', 'wind-sniper', 'fire-launcher', 'grass-launcher'] as WeaponId[]) {
  useGLTF.preload(gunUrl(id))
}

function GunModel({ weaponId }: { weaponId: WeaponId }) {
  if (!hasGunModel(weaponId)) {
    return <ProceduralWeapon weaponId={weaponId} />
  }
  return <LoadedGunModel weaponId={weaponId} />
}

function LoadedGunModel({ weaponId }: { weaponId: WeaponId }) {
  const { scene } = useGLTF(gunUrl(weaponId))
  const model = useMemo(() => fitViewmodel(scene, weaponId), [scene, weaponId])
  return <primitive object={model} />
}

export function ViewWeapon() {
  const root = useRef<Group>(null)
  const local = useRef<Group>(null)
  const lastWeaponId = useRef<string | null>(null)
  const switchT = useRef(1)
  const recoil = useRef(0)
  const flash = useRef(0)
  const lastAmmo = useRef<number | null>(null)
  const muzzle = useRef<Mesh>(null)
  const { camera } = useThree()

  const currentSlot = useGameStore((state) => state.currentSlot)
  const loadout = useGameStore((state) => state.loadout)
  const isAiming = useGameStore((state) => state.isAiming)
  const current = loadout?.[currentSlot]
  const weapon = current ? getWeapon(current.id) : null

  useEffect(() => {
    lastAmmo.current = current?.ammoInMag ?? null
  }, [current?.id])

  useFrame((_, delta) => {
    if (!root.current || !local.current || !weapon || !current) return

    root.current.position.copy(camera.position)
    root.current.quaternion.copy(camera.quaternion)

    if (lastWeaponId.current !== weapon.id) {
      lastWeaponId.current = weapon.id
      switchT.current = 0
    }

    if (lastAmmo.current !== null && current.ammoInMag < lastAmmo.current) {
      recoil.current = weapon.kind === 'sniper' ? 0.14 : weapon.kind === 'launcher' ? 0.12 : 0.055
      flash.current = 1
    }
    lastAmmo.current = current.ammoInMag

    switchT.current = Math.min(1, switchT.current + delta * 3.6)
    recoil.current += (0 - recoil.current) * Math.min(1, delta * 10)
    flash.current += (0 - flash.current) * Math.min(1, delta * 22)

    const ads = isAiming
    const dip = Math.sin(switchT.current * Math.PI) * 0.28
    const reload = reloadPose(current)
    const targetX = (ads ? 0 : 0.28) + reload.x
    const targetY = (ads ? -0.08 : -0.24) - dip + reload.y
    const targetZ = (ads ? (weapon.kind === 'sniper' ? -0.4 : -0.46) : -0.58) + reload.z

    const follow = 1 - Math.exp(-delta * 14)
    local.current.position.x += (targetX - local.current.position.x) * follow
    local.current.position.y += (targetY - local.current.position.y) * follow
    local.current.position.z += (targetZ - local.current.position.z) * follow
    local.current.rotation.set(recoil.current + reload.rotX, reload.rotY, reload.rotZ)
    if (muzzle.current) {
      const glowing = flash.current > 0.08
      muzzle.current.visible = glowing
      const material = muzzle.current.material
      if (!Array.isArray(material) && 'opacity' in material) {
        material.opacity = flash.current * 0.9
      }
      const size = 0.7 + flash.current * 0.6
      muzzle.current.scale.setScalar(size)
    }
  })

  if (!weapon) return null

  return (
    <group ref={root}>
      <group ref={local} position={[0.28, -0.24, -0.58]}>
        {/* 獨立 Suspense：槍模型未載入時唔會阻住成個場景，載入完自己裝上 */}
        <Suspense fallback={null}>
          <GunModel key={weapon.id} weaponId={weapon.id} />
        </Suspense>
        <mesh ref={muzzle} position={[0.01, 0.03, -0.52]} visible={false}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  )
}
