import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

export function LobbyCamera() {
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.08
    state.camera.position.set(Math.sin(t) * 58, 48, Math.cos(t) * 36 - 8)
    state.camera.lookAt(0, 1, 4)
  })

  return <PerspectiveCamera makeDefault fov={50} />
}
