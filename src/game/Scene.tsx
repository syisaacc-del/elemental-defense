import { Sky } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { useGameStore } from '../store/gameStore.ts'
import { FloatingCombatLayer } from './combat/FloatingCombat.tsx'
import { Lighting } from './Lighting.tsx'
import { LobbyCamera } from './LobbyCamera.tsx'
import { Player } from './Player.tsx'
import { RemoteAvatar } from './PlayerCharacter.tsx'
import { VersusManager } from './VersusManager.tsx'
import { EnemySpawner } from './enemies/EnemySpawner.tsx'
import { GuardTowers } from './map/GuardTowers.tsx'
import { LaneSpawns } from './map/LaneSpawns.tsx'
import { MainTower } from './map/MainTower.tsx'
import { TMap } from './map/TMap.tsx'
import { VersusMap } from './map/VersusMap.tsx'

export function Scene() {
  const phase = useGameStore((state) => state.phase)
  const mode = useGameStore((state) => state.mode)
  const solo = mode === 'solo'
  const versusPlaying = phase === 'playing' && mode === 'versus'

  return (
    <>
      <Lighting />
      <Sky
        sunPosition={[40, 28, 10]}
        turbidity={2.4}
        rayleigh={0.45}
        mieCoefficient={0.004}
        mieDirectionalG={0.7}
      />
      <Physics gravity={[0, -22, 0]}>
        {mode === 'versus' ? (
          <VersusMap />
        ) : (
          <>
            <TMap />
            <LaneSpawns />
            <MainTower />
            <GuardTowers />
          </>
        )}
        {phase === 'playing' && solo && <EnemySpawner />}
        {phase === 'playing' || phase === 'ended' ? <Player /> : <LobbyCamera />}
        {versusPlaying && (
          <>
            <VersusManager />
            <RemoteAvatar />
          </>
        )}
      </Physics>
      {phase === 'playing' && solo && <FloatingCombatLayer />}
    </>
  )
}
