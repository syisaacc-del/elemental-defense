import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

export function LobbyCamera() {
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.12
    state.camera.position.set(Math.sin(t) * 20, 11, Math.cos(t) * 20)
    state.camera.lookAt(0, 1, 0)
  })

  return <PerspectiveCamera makeDefault fov={55} />
}
