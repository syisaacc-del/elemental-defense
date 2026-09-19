import { PointerLockControls, useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Group, Vector3 } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import { CombatSystem } from './CombatSystem.tsx'
import {
  PLAYER_EYE_OFFSET,
  PLAYER_JUMP,
  PLAYER_SPEED,
  TPS_DISTANCE,
  TPS_HEIGHT,
} from './constants.ts'
import { PLAYER_START } from './map/layout.ts'
import { ViewWeapon } from './ViewWeapon.tsx'

function PlayerAvatar({
  body,
  visible,
}: {
  body: RefObject<RapierRigidBody | null>
  visible: boolean
}) {
  const group = useRef<Group>(null)
  const look = useMemo(() => new Vector3(), [])
  const { camera } = useThree()

  useFrame(() => {
    if (!group.current || !body.current) return
    const pos = body.current.translation()
    group.current.position.set(pos.x, pos.y - 0.85, pos.z)
    camera.getWorldDirection(look)
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

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const jumpHeld = useRef(false)
  const { camera } = useThree()
  const { rapier, world } = useRapier()
  const [, getKeys] = useKeyboardControls()
  const setPointerLocked = useGameStore((state) => state.setPointerLocked)
  const cameraMode = useGameStore((state) => state.cameraMode)

  const worldForward = useMemo(() => new Vector3(), [])
  const worldRight = useMemo(() => new Vector3(), [])
  const worldUp = useMemo(() => new Vector3(0, 1, 0), [])
  const wish = useMemo(() => new Vector3(), [])
  const desiredCam = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    if (!body.current) return

    const { forward, backward, left, right, jump } = getKeys()
    const velocity = body.current.linvel()
    const position = body.current.translation()

    camera.getWorldDirection(worldForward)
    worldForward.y = 0
    if (worldForward.lengthSq() < 0.0001) {
      worldForward.set(0, 0, -1).applyQuaternion(camera.quaternion)
      worldForward.y = 0
    }
    worldForward.normalize()
    worldRight.crossVectors(worldForward, worldUp).normalize()

    wish.set(0, 0, 0)
    if (forward) wish.add(worldForward)
    if (backward) wish.sub(worldForward)
    if (right) wish.add(worldRight)
    if (left) wish.sub(worldRight)
    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(PLAYER_SPEED)
    }

    body.current.setLinvel({ x: wish.x, y: velocity.y, z: wish.z }, true)

    const origin = { x: position.x, y: position.y, z: position.z }
    const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, 1.15, false, undefined, undefined, undefined, body.current)
    const grounded = hit !== null && hit.timeOfImpact < 1.05

    if (jump && grounded && !jumpHeld.current) {
      body.current.setLinvel({ x: wish.x, y: PLAYER_JUMP, z: wish.z }, true)
    }
    jumpHeld.current = jump

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
      <PointerLockControls
        onLock={() => setPointerLocked(true)}
        onUnlock={() => setPointerLocked(false)}
      />
      {cameraMode === 'fps' && <ViewWeapon />}
      <CombatSystem playerBody={body} />
    </>
  )
}
