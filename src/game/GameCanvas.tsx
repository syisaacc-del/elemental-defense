import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { Scene } from './Scene.tsx'

export function GameCanvas() {
  const session = useGameStore((state) => (state.phase === 'lobby' ? 'lobby' : 'run'))

  return (
    <Canvas
      key={session}
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      camera={{ fov: 75, position: [0, 10, 18], near: 0.1, far: 200 }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
