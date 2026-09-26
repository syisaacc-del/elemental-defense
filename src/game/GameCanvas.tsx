import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { Scene } from './Scene.tsx'
import { useIsTouch } from './useIsTouch.ts'

export function GameCanvas() {
  const session = useGameStore((state) => (state.phase === 'lobby' ? 'lobby' : 'run'))
  const isTouch = useIsTouch()

  return (
    <Canvas
      key={session}
      shadows={!isTouch}
      dpr={isTouch ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: true }}
      camera={{ fov: 75, position: [0, 48, 20], near: 0.1, far: 320 }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
