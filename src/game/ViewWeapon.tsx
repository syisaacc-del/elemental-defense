import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group } from 'three'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { WeaponKind } from '../types/game.ts'

function WeaponMesh({ kind, accent }: { kind: WeaponKind; accent: string }) {
  if (kind === 'sniper') {
    return (
      <group>
        <mesh position={[0, 0.02, 0.02]}>
          <boxGeometry args={[0.07, 0.09, 0.62]} />
          <meshStandardMaterial color="#161b24" metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.03, -0.48]}>
          <boxGeometry args={[0.035, 0.035, 0.55]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0, 0.11, -0.08]}>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 12]} />
          <meshStandardMaterial color="#0f141c" metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh position={[0.015, -0.12, 0.16]}>
          <boxGeometry args={[0.06, 0.18, 0.14]} />
          <meshStandardMaterial color="#11141b" />
        </mesh>
      </group>
    )
  }

  if (kind === 'launcher') {
    return (
      <group>
        <mesh position={[0, 0.04, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.11, 0.62, 16]} />
          <meshStandardMaterial color="#1a1f28" metalness={0.35} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.04, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.85} />
        </mesh>
        <mesh position={[0.02, -0.12, 0.12]}>
          <boxGeometry args={[0.08, 0.2, 0.16]} />
          <meshStandardMaterial color="#11141b" />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      <mesh>
        <boxGeometry args={[0.09, 0.13, 0.58]} />
        <meshStandardMaterial color="#1f2430" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, -0.42]}>
        <boxGeometry args={[0.05, 0.05, 0.36]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.02, -0.14, 0.08]}>
        <boxGeometry args={[0.07, 0.2, 0.14]} />
        <meshStandardMaterial color="#11141b" />
      </mesh>
    </group>
  )
}

export function ViewWeapon() {
  const root = useRef<Group>(null)
  const local = useRef<Group>(null)
  const lastWeaponId = useRef<string | null>(null)
  const switchT = useRef(1)
  const recoil = useRef(0)
  const lastAmmo = useRef<number | null>(null)
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
      recoil.current = weapon.kind === 'sniper' ? 0.12 : weapon.kind === 'launcher' ? 0.1 : 0.045
    }
    lastAmmo.current = current.ammoInMag

    switchT.current = Math.min(1, switchT.current + delta * 3.6)
    recoil.current += (0 - recoil.current) * Math.min(1, delta * 10)

    const ads = isAiming && weapon.kind === 'sniper'
    const dip = Math.sin(switchT.current * Math.PI) * 0.28
    const reloadDip = current.isReloading ? 0.18 : 0
    const targetX = ads ? 0 : 0.28
    const targetY = (ads ? -0.08 : -0.24) - dip - reloadDip
    const targetZ = ads ? -0.4 : -0.58

    const follow = 1 - Math.exp(-delta * 14)
    local.current.position.x += (targetX - local.current.position.x) * follow
    local.current.position.y += (targetY - local.current.position.y) * follow
    local.current.position.z += (targetZ - local.current.position.z) * follow
    local.current.rotation.set(recoil.current, 0, 0)
  })

  if (!weapon) return null

  return (
    <group ref={root}>
      <group ref={local} position={[0.28, -0.24, -0.58]}>
        <WeaponMesh kind={weapon.kind} accent={weapon.accent} />
      </group>
    </group>
  )
}
