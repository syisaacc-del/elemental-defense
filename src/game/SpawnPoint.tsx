export function SpawnPoint() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial
          color="#12343c"
          emissive="#0c6b78"
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[2.4, 2.95, 48]} />
        <meshStandardMaterial
          color="#5cecff"
          emissive="#5cecff"
          emissiveIntensity={2.2}
        />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.42, 2.4, 8]} />
        <meshStandardMaterial
          color="#9be9ff"
          emissive="#2ad4ff"
          emissiveIntensity={1.4}
          roughness={0.25}
        />
      </mesh>
    </group>
  )
}
