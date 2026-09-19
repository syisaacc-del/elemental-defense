export function Lighting() {
  return (
    <>
      <color attach="background" args={['#0d1a2b']} />
      <fog attach="fog" args={['#142438', 40, 180]} />
      <hemisphereLight args={['#7fb4ff', '#1b2433', 0.45]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        castShadow
        position={[40, 50, 20]}
        intensity={1.45}
        shadow-mapSize={[2048, 2048]}
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
