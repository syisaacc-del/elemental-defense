import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

/** 主選單鏡頭：緩慢環繞元素大塔，營造世界觀氣氛 */
export function LobbyCamera() {
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.065
    const radius = 52 + Math.sin(t * 0.7) * 4
    const height = 36 + Math.sin(t * 0.45) * 3
    state.camera.position.set(Math.sin(t) * radius, height, Math.cos(t) * radius * 0.72 - 2)
    state.camera.lookAt(0, 3.2, 4)
  })

  return <PerspectiveCamera makeDefault fov={48} near={0.1} far={400} />
}
