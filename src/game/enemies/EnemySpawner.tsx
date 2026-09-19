import { useEffect, useState } from 'react'
import { MATCH_SECONDS } from '../../data/weapons.ts'
import { useGameStore } from '../../store/gameStore.ts'
import { MAX_ENEMIES } from '../constants.ts'
import { Enemy } from './Enemy.tsx'
import { createEnemySpawn, spawnIntervalForTime } from './spawn.ts'
import type { EnemySpawn } from './spawn.ts'

export function EnemySpawner() {
  const [enemies, setEnemies] = useState<EnemySpawn[]>([])
  const phase = useGameStore((state) => state.phase)
  const timeLeft = useGameStore((state) => state.timeLeft)
  const wave = timeLeft > 180 ? 'early' : timeLeft > 60 ? 'mid' : 'late'

  useEffect(() => {
    if (phase !== 'playing') return

    const spawnOne = () => {
      const remaining = useGameStore.getState().timeLeft
      setEnemies((list) => {
        if (list.length >= MAX_ENEMIES) return list
        const next = [...list, createEnemySpawn()]
        if (remaining < 180 && list.length < MAX_ENEMIES - 1 && Math.random() > 0.65) {
          next.push(createEnemySpawn())
        }
        return next.slice(0, MAX_ENEMIES)
      })
    }

    spawnOne()
    const timer = window.setInterval(spawnOne, spawnIntervalForTime(timeLeft, MATCH_SECONDS))
    return () => window.clearInterval(timer)
  }, [phase, wave])

  useEffect(() => {
    if (phase === 'playing') return
    setEnemies([])
  }, [phase])

  const remove = (id: number) => {
    setEnemies((list) => list.filter((item) => item.id !== id))
  }

  return (
    <>
      {enemies.map((enemy) => (
        <Enemy
          key={enemy.id}
          id={enemy.id}
          kind={enemy.kind}
          elite={enemy.elite}
          hp={enemy.hp}
          position={enemy.position}
          waypoints={enemy.waypoints}
          onRemove={remove}
        />
      ))}
    </>
  )
}
