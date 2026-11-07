import { useGLTF } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMemo } from 'react'
import { Box3, Raycaster, Vector3, type Mesh } from 'three'

// 雙人模式專用地圖：map-demo 嗰座建築物（L1 Collect Hub）
const MAP_URL = `${import.meta.env.BASE_URL}models/maps/versus-building.glb`

// 地圖最長邊縮放到咁多個單位（同 map-demo 一樣用 30）
const MAP_SIZE = 95

export function VersusMap() {
  const { scene } = useGLTF(MAP_URL)

  // 複製一份出嚟縮放＋置中＋貼地（唔好郁到原版 cache）
  const map = useMemo(() => {
    const cloned = scene.clone(true)
    const box = new Box3().setFromObject(cloned)
    const size = box.getSize(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    cloned.scale.setScalar(MAP_SIZE / maxDim)

    const fittedBox = new Box3().setFromObject(cloned)
    const center = fittedBox.getCenter(new Vector3())
    cloned.position.x -= center.x
    cloned.position.z -= center.z
    cloned.position.y -= fittedBox.min.y

    cloned.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
    cloned.updateMatrixWorld(true)

    // 開發模式：掛去 window 方便喺瀏覽器度量大廈嘅結構（正式版唔會有）
    if (import.meta.env.DEV) {
      const w = window as unknown as Record<string, unknown>
      w.__map = cloned
      w.__THREE = { Raycaster, Vector3 }
    }

    return cloned
  }, [scene])

  return (
    <>
      {/* 建築物本體：trimesh 碰撞，行得上、撞到、爬唔入去 */}
      <RigidBody type="fixed" colliders="trimesh">
        <primitive object={map} />
      </RigidBody>

      {/* 隱形大地板：行出建築物都唔會跌落無底洞 */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[40, 0.5, 40]} position={[0, -0.5, 0]} />
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial color="#2f4a3a" roughness={1} />
      </mesh>
    </>
  )
}

useGLTF.preload(MAP_URL)
