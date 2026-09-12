import { Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore.ts'
import { Ground } from './Ground.tsx'
import { Lighting } from './Lighting.tsx'
import { LobbyCamera } from './LobbyCamera.tsx'
import { EnemySpawner } from './enemies/EnemySpawner.tsx'
import { Player } from './Player.tsx'
import { SpawnPoint } from './SpawnPoint.tsx'

export function Scene() {
  const phase = useGameStore((state) => state.phase)

  return (
    <>
      <Lighting />
      <Sky
        sunPosition={[40, 28, 10]}
        turbidity={1.8}
        rayleigh={0.35}
        mieCoefficient={0.003}
        mieDirectionalG={0.7}
      />
      <Physics gravity={[0, -22, 0]}>
        <Ground />
        <SpawnPoint />
        {phase === 'playing' && <EnemySpawner />}
        {phase === 'playing' || phase === 'ended' ? <Player /> : <LobbyCamera />}
      </Physics>
    </>
  )
}
