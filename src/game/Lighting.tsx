export function Lighting() {
  return (
    <>
      <color attach="background" args={['#4f9ad4']} />
      <fog attach="fog" args={['#7eb6d4', 55, 120]} />
      <hemisphereLight args={['#cfe6ff', '#3f4a32', 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[28, 36, 16]}
        intensity={1.55}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
    </>
  )
}
