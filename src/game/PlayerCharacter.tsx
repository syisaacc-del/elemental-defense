import { useFBX, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { RapierRigidBody } from '@react-three/rapier'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import {
  AnimationMixer,
  Box3,
  Euler,
  Group,
  Mesh,
  Quaternion,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Object3D,
} from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { WeaponId } from '../types/game.ts'
import { remotePlayer, remoteRecoil, useVersusStore } from './net/peer.ts'
import { playerMotion } from './playerMotion.ts'
import { fitViewmodel, gunUrl } from './weaponModels.ts'

const IDLE_URL = `${import.meta.env.BASE_URL}models/player/idle-rifle.fbx`
const RUN_URL = `${import.meta.env.BASE_URL}models/player/run-rifle.fbx`

useFBX.preload(IDLE_URL)
useFBX.preload(RUN_URL)
for (const id of ['water-rifle', 'thunder-rifle', 'ice-sniper', 'wind-sniper', 'fire-launcher', 'grass-launcher'] as WeaponId[]) {
  useGLTF.preload(gunUrl(id))
}

const TMP_POS = new Vector3()
const TMP_OFFSET = new Vector3()
const TMP_QUAT = new Quaternion()
const ROOT_QUAT = new Quaternion()
const GUN_HOLD_POS = new Vector3(0.12, 0.035, 0.018)
const GUN_HOLD_ROT = new Quaternion().setFromEuler(new Euler(Math.PI / 2, Math.PI, 0))

type Bones = {
  hips: Object3D | null
  spine: Object3D | null
  spine1: Object3D | null
  spine2: Object3D | null
  neck: Object3D | null
  head: Object3D | null
  rightArm: Object3D | null
  rightFore: Object3D | null
  rightHand: Object3D | null
  leftArm: Object3D | null
  leftFore: Object3D | null
  leftHand: Object3D | null
  rightUpLeg: Object3D | null
  rightLeg: Object3D | null
  leftUpLeg: Object3D | null
  leftLeg: Object3D | null
}

function boneName(obj: Object3D) {
  return obj.name.replace(/^mixamorig:?/i, '').toLowerCase()
}

function findBone(root: Object3D, names: string[]) {
  let found: Object3D | null = null
  const wanted = names.map((name) => name.toLowerCase())
  root.traverse((obj) => {
    if (found) return
    const name = boneName(obj)
    if (wanted.some((item) => name === item || name.endsWith(item))) found = obj
  })
  return found
}

function hidePropGuns(root: Object3D) {
  root.traverse((obj) => {
    const name = obj.name
    if (!/rifle|weapon|pistol|shotgun|musket|ak47|m4/i.test(name)) return
    if (/hand|arm|finger|shoulder|spine/i.test(name)) return
    obj.visible = false
  })
}

function readyMeshes(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
  })
}

function clipOf(source: { animations: AnimationClip[] }, fallbackName: string) {
  const clip = source.animations[0]
  if (!clip) return null
  const copy = clip.clone()
  copy.name = fallbackName
  return copy
}

function lerpWeight(action: AnimationAction | null, target: number, delta: number) {
  if (!action) return
  const next = action.getEffectiveWeight() + (target - action.getEffectiveWeight()) * Math.min(1, delta * 8)
  action.setEffectiveWeight(next)
}

function TpsGun({ weaponId }: { weaponId: WeaponId }) {
  const { scene } = useGLTF(gunUrl(weaponId))
  const model = useMemo(() => {
    const fitted = fitViewmodel(scene, weaponId)
    fitted.scale.multiplyScalar(1.55)
    return fitted
  }, [scene, weaponId])
  return <primitive object={model} />
}

function FbxCharacter({
  body,
  visible,
  remote = false,
}: {
  body: RefObject<RapierRigidBody | null>
  visible: boolean
  remote?: boolean
}) {
  const root = useRef<Group>(null)
  const scaled = useRef<Group>(null)
  const gunRoot = useRef<Group>(null)
  const look = useMemo(() => new Vector3(), [])
  const idleFbx = useFBX(IDLE_URL)
  const runFbx = useFBX(RUN_URL)
  const recoil = useRef(0)
  const lastAmmo = useRef<number | null>(null)
  const aimBlend = useRef(0)
  const jumpBlend = useRef(0)
  const reloadBlend = useRef(0)

  const currentSlot = useGameStore((state) => state.currentSlot)
  const loadout = useGameStore((state) => state.loadout)
  const isAiming = useGameStore((state) => state.isAiming)
  const versusRifle = useVersusStore((state) => state.remoteRifle)
  const shieldOn = useVersusStore((state) => state.remoteInvincible)
  const current = loadout?.[currentSlot]
  const weapon = remote ? getWeapon(versusRifle) : current ? getWeapon(current.id) : null

  const { model, scale } = useMemo(() => {
    const cloned = cloneSkinned(idleFbx) as Group
    hidePropGuns(cloned)
    readyMeshes(cloned)
    cloned.updateMatrixWorld(true)
    const box = new Box3().setFromObject(cloned)
    const height = Math.max(0.01, box.max.y - box.min.y)
    const nextScale = 1.72 / height
    cloned.position.y = -box.min.y
    return { model: cloned, scale: nextScale }
  }, [idleFbx])

  const bones = useMemo<Bones>(
    () => ({
      hips: findBone(model, ['hips']),
      spine: findBone(model, ['spine']),
      spine1: findBone(model, ['spine1']),
      spine2: findBone(model, ['spine2']),
      neck: findBone(model, ['neck']),
      head: findBone(model, ['head']),
      rightArm: findBone(model, ['rightarm', 'rightshoulder']),
      rightFore: findBone(model, ['rightforearm']),
      rightHand: findBone(model, ['righthand']),
      leftArm: findBone(model, ['leftarm', 'leftshoulder']),
      leftFore: findBone(model, ['leftforearm']),
      leftHand: findBone(model, ['lefthand']),
      rightUpLeg: findBone(model, ['rightupleg']),
      rightLeg: findBone(model, ['rightleg']),
      leftUpLeg: findBone(model, ['leftupleg']),
      leftLeg: findBone(model, ['leftleg']),
    }),
    [model],
  )

  const mixerData = useMemo(() => {
    const mixer = new AnimationMixer(model)
    const idleClip = clipOf(idleFbx, 'idle')
    const runClip = clipOf(runFbx, 'run')
    const walkClip = runClip?.clone() ?? null
    if (walkClip) walkClip.name = 'walk'

    const idle = idleClip ? mixer.clipAction(idleClip) : null
    const run = runClip ? mixer.clipAction(runClip) : null
    const walk = walkClip ? mixer.clipAction(walkClip) : null
    idle?.play()
    run?.play()
    walk?.play()
    idle?.setEffectiveWeight(1)
    run?.setEffectiveWeight(0)
    walk?.setEffectiveWeight(0)
    if (walk) walk.timeScale = 0.58
    return { mixer, idle, run, walk }
  }, [model, idleFbx, runFbx])

  useEffect(() => {
    lastAmmo.current = current?.ammoInMag ?? null
  }, [current?.id])

  useEffect(() => {
    return () => {
      mixerData.mixer.stopAllAction()
      mixerData.mixer.uncacheRoot(model)
    }
  }, [mixerData, model])

  useFrame((state, delta) => {
    if (!root.current) return

    let moving: boolean
    let walking: boolean
    let airborne: boolean

    if (remote) {
      const feet = remotePlayer.y - 0.85
      const dx = remotePlayer.x - root.current.position.x
      const dy = feet - root.current.position.y
      const dz = remotePlayer.z - root.current.position.z
      if (dx * dx + dy * dy + dz * dz > 9) {
        root.current.position.set(remotePlayer.x, feet, remotePlayer.z)
      } else {
        const follow = Math.min(1, delta * 12)
        root.current.position.x += dx * follow
        root.current.position.y += dy * follow
        root.current.position.z += dz * follow
      }
      root.current.rotation.y = remotePlayer.yaw
      moving = remotePlayer.speed > 0.35
      walking = false
      airborne = remotePlayer.airborne
    } else {
      if (!body.current) return
      const pos = body.current.translation()
      root.current.position.set(pos.x, pos.y - 0.85, pos.z)
      state.camera.getWorldDirection(look)
      look.y = 0
      if (look.lengthSq() > 0.0001) {
        look.normalize()
        root.current.rotation.y = Math.atan2(look.x, look.z)
      }
      moving = playerMotion.moveSpeed > 0.35
      walking = moving && playerMotion.walking
      airborne = playerMotion.airborne
    }

    const running = moving && !walking
    lerpWeight(mixerData.idle, moving || airborne ? 0.12 : 1, delta)
    lerpWeight(mixerData.run, running && !airborne ? 1 : 0, delta)
    lerpWeight(mixerData.walk, walking && !airborne ? 1 : 0, delta)
    mixerData.mixer.update(delta)

    if (remote) {
      if (remoteRecoil.pulse > 0.5) {
        recoil.current = 0.55
        remoteRecoil.pulse = 0
      }
    } else {
      if (current && lastAmmo.current !== null && current.ammoInMag < lastAmmo.current) {
        recoil.current = weapon?.kind === 'sniper' ? 1 : weapon?.kind === 'launcher' ? 0.85 : 0.55
      }
      lastAmmo.current = current?.ammoInMag ?? null
    }
    recoil.current += (0 - recoil.current) * Math.min(1, delta * 9)

    const reloadT = !remote && current?.isReloading
      ? 1 - Math.max(0, current.reloadEndsAt - performance.now()) / (getWeapon(current.id).reloadTime * 1000)
      : 0
    aimBlend.current += ((isAiming && !remote ? 1 : 0) - aimBlend.current) * Math.min(1, delta * 8)
    jumpBlend.current += ((airborne ? 1 : 0) - jumpBlend.current) * Math.min(1, delta * 10)
    reloadBlend.current += ((!remote && current?.isReloading ? 1 : 0) - reloadBlend.current) * Math.min(1, delta * 10)

    applyAim(bones, aimBlend.current)
    applyJump(bones, jumpBlend.current)
    applyReload(bones, reloadT, reloadBlend.current)
    applyRecoil(bones, recoil.current)

    const hand = bones.rightHand
    if (hand && gunRoot.current) {
      hand.updateWorldMatrix(true, false)
      hand.getWorldPosition(TMP_POS)
      hand.getWorldQuaternion(TMP_QUAT)
      TMP_OFFSET.copy(GUN_HOLD_POS).applyQuaternion(TMP_QUAT)
      TMP_POS.add(TMP_OFFSET)
      root.current.updateWorldMatrix(true, false)
      root.current.worldToLocal(TMP_POS)
      gunRoot.current.position.copy(TMP_POS)
      root.current.getWorldQuaternion(ROOT_QUAT).invert()
      gunRoot.current.quaternion.copy(ROOT_QUAT).multiply(TMP_QUAT).multiply(GUN_HOLD_ROT)
    }
  })

  return (
    <group ref={root} visible={visible}>
      <group ref={scaled} scale={scale}>
        <primitive object={model} />
      </group>
      <group ref={gunRoot}>
        {weapon && <TpsGun key={weapon.id} weaponId={weapon.id} />}
      </group>
      {remote && shieldOn && (
        <mesh position={[0, 0.95, 0]}>
          <sphereGeometry args={[1.05, 20, 16]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function addRot(bone: Object3D | null, x: number, y: number, z: number) {
  if (!bone) return
  bone.rotation.x += x
  bone.rotation.y += y
  bone.rotation.z += z
}

function applyAim(bones: Bones, amount: number) {
  if (amount < 0.01) return
  const a = amount
  addRot(bones.spine, -0.12 * a, 0, 0)
  addRot(bones.spine1, -0.16 * a, 0.08 * a, 0)
  addRot(bones.spine2, -0.1 * a, 0.06 * a, 0)
  addRot(bones.rightArm, -0.42 * a, 0.12 * a, 0.18 * a)
  addRot(bones.rightFore, -0.18 * a, 0, 0)
  addRot(bones.leftArm, -0.38 * a, -0.16 * a, -0.2 * a)
  addRot(bones.leftFore, -0.12 * a, 0, 0)
  addRot(bones.neck, 0.08 * a, 0, 0)
}

function applyJump(bones: Bones, amount: number) {
  if (amount < 0.01) return
  const a = amount
  addRot(bones.spine, -0.22 * a, 0, 0)
  addRot(bones.rightUpLeg, 0.55 * a, 0, 0.08 * a)
  addRot(bones.leftUpLeg, 0.42 * a, 0, -0.08 * a)
  addRot(bones.rightLeg, -0.85 * a, 0, 0)
  addRot(bones.leftLeg, -0.7 * a, 0, 0)
}

function applyReload(bones: Bones, t: number, amount: number) {
  if (amount < 0.01) return
  const a = amount
  const stage = Math.min(1, Math.max(0, t))
  const yank = stage < 0.22 ? stage / 0.22 : stage < 0.58 ? 1 : stage < 0.78 ? 1 - (stage - 0.58) / 0.2 : 0
  const seat = stage < 0.58 ? 0 : stage < 0.78 ? (stage - 0.58) / 0.2 : 1
  const charge = stage < 0.78 ? 0 : (stage - 0.78) / 0.22
  addRot(bones.rightArm, 0.35 * yank * a, -0.25 * yank * a, 0.55 * yank * a)
  addRot(bones.rightFore, 0.7 * yank * a, 0, 0.35 * yank * a)
  addRot(bones.leftArm, 0.45 * yank * a + 0.2 * seat * a, 0.35 * yank * a, -0.4 * yank * a)
  addRot(bones.leftFore, 0.55 * yank * a, 0, -0.2 * yank * a)
  addRot(bones.rightFore, -0.45 * charge * a, 0, 0.25 * charge * a)
  addRot(bones.spine1, 0.12 * yank * a, -0.1 * yank * a, 0)
}

function applyRecoil(bones: Bones, amount: number) {
  if (amount < 0.02) return
  addRot(bones.spine2, -0.22 * amount, 0.04 * amount, 0)
  addRot(bones.rightArm, -0.18 * amount, 0, 0.1 * amount)
  addRot(bones.rightFore, 0.12 * amount, 0, 0)
  addRot(bones.neck, -0.08 * amount, 0, 0)
}

function CapsuleDummy({
  body,
  visible,
}: {
  body: RefObject<RapierRigidBody | null>
  visible: boolean
}) {
  const group = useRef<Group>(null)
  const look = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    if (!group.current || !body.current) return
    const pos = body.current.translation()
    group.current.position.set(pos.x, pos.y - 0.85, pos.z)
    state.camera.getWorldDirection(look)
    look.y = 0
    if (look.lengthSq() > 0.0001) {
      look.normalize()
      group.current.rotation.y = Math.atan2(look.x, look.z)
    }
  })

  return (
    <group ref={group} visible={visible}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.7, 6, 12]} />
        <meshStandardMaterial color="#2f4a6d" roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.38, 0]} castShadow>
        <sphereGeometry args={[0.24, 14, 14]} />
        <meshStandardMaterial color="#d8b48a" />
      </mesh>
    </group>
  )
}

export function PlayerAvatar({
  body,
  visible,
}: {
  body: RefObject<RapierRigidBody | null>
  visible: boolean
}) {
  return (
    <Suspense fallback={<CapsuleDummy body={body} visible={visible} />}>
      <FbxCharacter body={body} visible={visible} />
    </Suspense>
  )
}

const EMPTY_BODY: RefObject<RapierRigidBody | null> = { current: null }

export function RemoteAvatar() {
  return (
    <Suspense fallback={null}>
      <FbxCharacter body={EMPTY_BODY} visible remote />
    </Suspense>
  )
}
