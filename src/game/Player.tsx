import { PointerLockControls, useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import { useSettingsStore } from '../store/settingsStore.ts'
import { CombatSystem } from './CombatSystem.tsx'
import { consumeLook, detectTouch, touchInput } from './touchInput.ts'
import {
  PLAYER_EYE_OFFSET,
  PLAYER_JUMP,
  PLAYER_SPEED,
  PLAYER_WALK_SPEED,
  TPS_DISTANCE,
  TPS_HEIGHT,
} from './constants.ts'
import { PLAYER_START } from './map/layout.ts'
import { PlayerAvatar } from './PlayerCharacter.tsx'
import { playerMotion } from './playerMotion.ts'
import { ViewWeapon } from './ViewWeapon.tsx'

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const jumpHeld = useRef(false)
  const { camera } = useThree()
  const { rapier, world } = useRapier()
  const [, getKeys] = useKeyboardControls()
  const setPointerLocked = useGameStore((state) => state.setPointerLocked)
  const cameraMode = useGameStore((state) => state.cameraMode)
  const settingsOpen = useSettingsStore((state) => state.settingsOpen)
  const mouseSensitivity = useSettingsStore((state) => state.mouseSensitivity)
  const isTouch = detectTouch()
  const yaw = useRef(0)
  const pitch = useRef(0)

  const worldForward = useMemo(() => new Vector3(), [])
  const worldRight = useMemo(() => new Vector3(), [])
  const worldUp = useMemo(() => new Vector3(0, 1, 0), [])
  const wish = useMemo(() => new Vector3(), [])
  const desiredCam = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    if (!body.current) return

    if (isTouch && !settingsOpen) {
      const look = consumeLook()
      yaw.current -= look.x * 0.0038 * mouseSensitivity
      pitch.current -= look.y * 0.0032 * mouseSensitivity
      pitch.current = Math.max(-1.15, Math.min(1.15, pitch.current))
      camera.rotation.order = 'YXZ'
      camera.rotation.y = yaw.current
      camera.rotation.x = pitch.current
    }

    const { forward, backward, left, right, jump, walk } = getKeys()
    const velocity = body.current.linvel()
    const position = body.current.translation()
    const paused = settingsOpen

    camera.getWorldDirection(worldForward)
    worldForward.y = 0
    if (worldForward.lengthSq() < 0.0001) {
      worldForward.set(0, 0, -1).applyQuaternion(camera.quaternion)
      worldForward.y = 0
    }
    worldForward.normalize()
    worldRight.crossVectors(worldForward, worldUp).normalize()

    wish.set(0, 0, 0)
    const stick = Math.hypot(touchInput.moveX, touchInput.moveY)
    if (!paused) {
      if (forward) wish.add(worldForward)
      if (backward) wish.sub(worldForward)
      if (right) wish.add(worldRight)
      if (left) wish.sub(worldRight)
      if (stick > 0.18) {
        wish.addScaledVector(worldForward, touchInput.moveY)
        wish.addScaledVector(worldRight, touchInput.moveX)
      }
    }
    const walking = Boolean(walk) || (stick > 0.18 && stick < 0.62)
    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(walking ? PLAYER_WALK_SPEED : PLAYER_SPEED)
    }

    body.current.setLinvel({ x: wish.x, y: paused ? 0 : velocity.y, z: wish.z }, true)

    const origin = { x: position.x, y: position.y, z: position.z }
    const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, 1.15, false, undefined, undefined, undefined, body.current)
    const grounded = hit !== null && hit.timeOfImpact < 1.05
    playerMotion.moveSpeed = Math.hypot(wish.x, wish.z)
    playerMotion.walking = walking && playerMotion.moveSpeed > 0.2
    playerMotion.grounded = grounded
    playerMotion.airborne = !grounded && !paused

    const jumping = !paused && (jump || touchInput.jump)
    if (jumping && grounded && !jumpHeld.current) {
      body.current.setLinvel({ x: wish.x, y: PLAYER_JUMP, z: wish.z }, true)
    }
    jumpHeld.current = jumping

    if (cameraMode === 'fps') {
      camera.position.set(position.x, position.y + PLAYER_EYE_OFFSET, position.z)
    } else {
      camera.getWorldDirection(worldForward)
      desiredCam.set(position.x, position.y + TPS_HEIGHT, position.z)
      desiredCam.addScaledVector(worldForward, -TPS_DISTANCE)
      desiredCam.y = position.y + TPS_HEIGHT
      const follow = 1 - Math.exp(-delta * 9)
      camera.position.lerp(desiredCam, follow)
    }
  })

  return (
    <>
      <RigidBody
        ref={body}
        position={PLAYER_START}
        colliders={false}
        mass={1}
        lockRotations
        friction={0}
        restitution={0}
        canSleep={false}
      >
        <CapsuleCollider args={[0.5, 0.35]} />
      </RigidBody>
      <PlayerAvatar body={body} visible={cameraMode === 'tps'} />
      {!isTouch && (
        <PointerLockControls
          pointerSpeed={mouseSensitivity}
          onLock={() => setPointerLocked(true)}
          onUnlock={() => setPointerLocked(false)}
        />
      )}
      {cameraMode === 'fps' && <ViewWeapon />}
      <CombatSystem playerBody={body} />
    </>
  )
}
