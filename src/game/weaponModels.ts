import { Box3, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import type { WeaponId } from '../types/game.ts'

export const GUN_FILE: Partial<Record<WeaponId, string>> = {
  'water-rifle': 'watergun.glb',
  'thunder-rifle': 'thundergun.glb',
  'ice-sniper': 'icegun.glb',
  'wind-sniper': 'windgun.glb',
  'fire-launcher': 'fire gun.glb',
  'grass-launcher': 'glassgun.glb',
}

export function hasGunModel(id: WeaponId) {
  return Boolean(GUN_FILE[id])
}

const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)
const AXIS_Z = new Vector3(0, 0, 1)

export function gunUrl(id: WeaponId) {
  const file = GUN_FILE[id]
  if (!file) throw new Error(`No gun model for ${id}`)
  // ?v=2：水槍模型修過自發光（2026-10-31），避免瀏覽器繼續用舊快取
  return `${import.meta.env.BASE_URL}models/weapons/${encodeURIComponent(file)}?v=2`
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

export function fitViewmodel(source: Object3D, weaponId: WeaponId) {
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
