import type { WeaponId } from '../types/game.ts'

/** 未有 3D 模型嘅武器用簡單形狀顯示 */
export function ProceduralWeapon({ weaponId, scale = 1 }: { weaponId: WeaponId; scale?: number }) {
  if (weaponId === 'ice-knife') {
    return (
      <group scale={scale} rotation={[0.15, 0, -0.35]}>
        <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.045, 0.55, 6]} />
          <meshStandardMaterial
            color="#87CEEB"
            metalness={0.55}
            roughness={0.22}
            emissive="#87CEEB"
            emissiveIntensity={0.35}
          />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[0.05, 0.09, 0.16]} />
          <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.032, 0.14, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>
    )
  }

  if (weaponId === 'fire-sticky') {
    return (
      <group scale={scale}>
        <mesh>
          <sphereGeometry args={[0.1, 14, 14]} />
          <meshStandardMaterial color="#FF0000" emissive="#FF4500" emissiveIntensity={1.1} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.02, 0.028, 0.08, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      </group>
    )
  }

  return null
}
