import { useSettingsStore } from '../store/settingsStore.ts'

export function Lighting() {
  const quality = useSettingsStore((state) => state.quality)
  const shadows = quality !== 'low'
  const mapSize = quality === 'high' ? 2048 : 1024

  return (
    <>
      <color attach="background" args={['#0d1a2b']} />
      <fog attach="fog" args={['#142438', 40, 180]} />
      <hemisphereLight args={['#7fb4ff', '#1b2433', 0.45]} />
      <ambientLight intensity={quality === 'low' ? 0.42 : 0.28} />
      <directionalLight
        castShadow={shadows}
        position={[40, 50, 20]}
        intensity={1.45}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
    </>
  )
}
