import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { WeaponId } from '../types/game.ts'

const GUN_FILE: Record<WeaponId, string> = {
  'water-rifle': 'watergun.glb',
  'thunder-rifle': 'thundergun.glb',
  'ice-sniper': 'icegun.glb',
  'wind-sniper': 'windgun.glb',
  'fire-launcher': 'fire gun.glb',
  'grass-launcher': 'glassgun.glb',
}

const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)
const AXIS_Z = new Vector3(0, 0, 1)

function gunUrl(id: WeaponId) {
  return `${import.meta.env.BASE_URL}models/weapons/${encodeURIComponent(GUN_FILE[id])}`
}

for (const id of Object.keys(GUN_FILE) as WeaponId[]) {
  useGLTF.preload(gunUrl(id))
}

function isMesh(obj: Object3D): obj is Mesh {
  return (obj as Mesh).isMesh
}

function collectPoints(root: Object3D) {
  const pts: Vector3[] = []
  root.updateMatrixWorld(true)
  root.traverse((obj) => {
    if (!isMesh(obj) || !obj.geometry.attributes.position) return
    const pos = obj.geometry.attributes.position
    const step = Math.max(1, Math.floor(pos.count / 2500))
    const point = new Vector3()
    for (let i = 0; i < pos.count; i += step) {
      point.fromBufferAttribute(pos, i)
      obj.localToWorld(point)
      pts.push(point.clone())
    }
  })
  return pts
}

function crossSection(points: Vector3[]) {
  if (points.length < 5) return 0
  let minY = Infinity
  let maxY = -Infinity
  let minX = Infinity
  let maxX = -Infinity
  for (const point of points) {
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
  }
  return maxY - minY + (maxX - minX)
}

function fitViewmodel(source: Object3D, weaponId: WeaponId) {
  const model = source.clone(true)
  const helpers: Object3D[] = []
  model.traverse((obj) => {
    if (!isMesh(obj)) return
    if (/plane|area/i.test(obj.name)) helpers.push(obj)
    obj.frustumCulled = false
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue
      material.metalness = Math.min(material.metalness, 0.2)
      if (material.roughness > 0.92) material.roughness = 0.62
    }
  })
  for (const helper of helpers) helper.removeFromParent()

  model.updateMatrixWorld(true)
  const center = new Box3().setFromObject(model).getCenter(new Vector3())
  model.position.sub(center)
  model.updateMatrixWorld(true)

  const size = new Box3().setFromObject(model).getSize(new Vector3())
  const longAxis = (['x', 'y', 'z'] as const).reduce((best, axis) => (size[axis] > size[best] ? axis : best))

  const wrapper = new Group()
  wrapper.add(model)
  if (longAxis === 'x') wrapper.rotateOnWorldAxis(AXIS_Y, -Math.PI / 2)
  else if (longAxis === 'y') wrapper.rotateOnWorldAxis(AXIS_X, Math.PI / 2)
  wrapper.updateMatrixWorld(true)

  const endThickness = (pts: Vector3[]) => {
    let minZ = Infinity
    let maxZ = -Infinity
    for (const point of pts) {
      minZ = Math.min(minZ, point.z)
      maxZ = Math.max(maxZ, point.z)
    }
    const mid = (minZ + maxZ) / 2
    const span = maxZ - minZ || 1
    return {
      front: crossSection(pts.filter((point) => point.z < mid - span * 0.18)),
      back: crossSection(pts.filter((point) => point.z > mid + span * 0.18)),
    }
  }

  let pts = collectPoints(wrapper)
  const ends = endThickness(pts)
  if (ends.front > ends.back * 1.15) {
    wrapper.rotateOnWorldAxis(AXIS_Y, Math.PI)
    wrapper.updateMatrixWorld(true)
    pts = collectPoints(wrapper)
  }

  let bestRoll = 0
  let bestScore = -Infinity
  for (const deg of [0, 90, 180, 270]) {
    const rad = (deg * Math.PI) / 180
    const c = Math.cos(rad)
    const s = Math.sin(rad)
    const rolled = pts.map((point) => new Vector3(point.x * c - point.y * s, point.x * s + point.y * c, point.z))
    const ys = rolled.map((point) => point.y).sort((a, b) => a - b)
    const cut = ys[Math.max(1, Math.floor(ys.length * 0.12))]
    const low = rolled.filter((point) => point.y <= cut)
    const avgY = low.reduce((sum, point) => sum + point.y, 0) / low.length
    const avgZ = low.reduce((sum, point) => sum + point.z, 0) / low.length
    const score = -avgY + avgZ * 0.45
    if (score > bestScore) {
      bestScore = score
      bestRoll = deg
    }
  }
  if (bestRoll) wrapper.rotateOnWorldAxis(AXIS_Z, (bestRoll * Math.PI) / 180)
  if (weaponId === 'thunder-rifle' || weaponId === 'ice-sniper') {
    wrapper.rotateOnWorldAxis(AXIS_Y, Math.PI)
    wrapper.rotateOnWorldAxis(AXIS_Z, Math.PI)
  }
  if (weaponId === 'wind-sniper') {
    wrapper.rotateOnWorldAxis(AXIS_Z, Math.PI)
  }
  wrapper.updateMatrixWorld(true)

  const fitted = new Box3().setFromObject(wrapper).getSize(new Vector3())
  let scale = 0.5 / fitted.z
  if (fitted.y * scale > 0.28) scale = 0.28 / fitted.y
  wrapper.scale.setScalar(scale)
  return wrapper
}

function GunModel({ weaponId }: { weaponId: WeaponId }) {
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

    const ads = isAiming
    const dip = Math.sin(switchT.current * Math.PI) * 0.28
    const reloadDip = current.isReloading ? 0.18 : 0
    const targetX = ads ? 0 : 0.28
    const targetY = (ads ? -0.08 : -0.24) - dip - reloadDip
    const targetZ = ads ? (weapon.kind === 'sniper' ? -0.4 : -0.46) : -0.58

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
        <GunModel key={weapon.id} weaponId={weapon.id} />
      </group>
    </group>
  )
}
