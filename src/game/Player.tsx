import { PointerLockControls, useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import { Euler, Vector3 } from 'three'
import { useGameStore } from '../store/gameStore.ts'
import { CombatSystem } from './CombatSystem.tsx'
import { PLAYER_EYE_OFFSET, PLAYER_JUMP, PLAYER_SPEED } from './constants.ts'
import { ViewWeapon } from './ViewWeapon.tsx'

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const jumpHeld = useRef(false)
  const { camera } = useThree()
  const { rapier, world } = useRapier()
  const [, getKeys] = useKeyboardControls()
  const setPointerLocked = useGameStore((state) => state.setPointerLocked)

  const front = useMemo(() => new Vector3(), [])
  const side = useMemo(() => new Vector3(), [])
  const direction = useMemo(() => new Vector3(), [])
  const yaw = useMemo(() => new Euler(0, 0, 0, 'YXZ'), [])

  useFrame(() => {
    if (!body.current) return

    const { forward, backward, left, right, jump } = getKeys()
    const velocity = body.current.linvel()
    const position = body.current.translation()

    camera.position.set(position.x, position.y + PLAYER_EYE_OFFSET, position.z)

    front.set(0, 0, Number(backward) - Number(forward))
    side.set(Number(left) - Number(right), 0, 0)
    yaw.set(0, camera.rotation.y, 0)
    direction.subVectors(front, side)
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(PLAYER_SPEED).applyEuler(yaw)
    } else {
      direction.set(0, 0, 0)
    }

    body.current.setLinvel(
      { x: direction.x, y: velocity.y, z: direction.z },
      true,
    )

    const origin = { x: position.x, y: position.y, z: position.z }
    const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, 1.15, false, undefined, undefined, undefined, body.current)
    const grounded = hit !== null && hit.timeOfImpact < 1.05

    if (jump && grounded && !jumpHeld.current) {
      body.current.setLinvel({ x: direction.x, y: PLAYER_JUMP, z: direction.z }, true)
    }
    jumpHeld.current = jump
  })

  return (
    <>
      <RigidBody
        ref={body}
        position={[0, 2.2, 10]}
        colliders={false}
        mass={1}
        lockRotations
        friction={0}
        restitution={0}
        canSleep={false}
      >
        <CapsuleCollider args={[0.5, 0.35]} />
      </RigidBody>
      <PointerLockControls
        onLock={() => setPointerLocked(true)}
        onUnlock={() => setPointerLocked(false)}
      />
      <ViewWeapon />
      <CombatSystem playerBody={body} />
    </>
  )
}
