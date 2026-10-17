import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { useSettingsStore } from '../store/settingsStore.ts'
import { Scene } from './Scene.tsx'
import { useIsTouch } from './useIsTouch.ts'

export function GameCanvas() {
  const session = useGameStore((state) => (state.phase === 'lobby' ? 'lobby' : 'run'))
  const quality = useSettingsStore((state) => state.quality)
  const isTouch = useIsTouch()
  const shadows = !isTouch && quality !== 'low'
  const dpr = quality === 'low' ? 1 : quality === 'medium' ? (isTouch ? 1.1 : 1.35) : isTouch ? 1.25 : 2

  return (
    <Canvas
      key={session}
      shadows={shadows}
      dpr={dpr}
      gl={{ antialias: quality !== 'low', powerPreference: quality === 'high' ? 'high-performance' : 'default' }}
      camera={{ fov: 75, position: [0, 48, 20], near: 0.1, far: 320 }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
