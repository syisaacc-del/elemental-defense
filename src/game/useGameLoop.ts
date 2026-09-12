import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore.ts'

export function useGameLoop() {
  const phase = useGameStore((state) => state.phase)

  useEffect(() => {
    if (phase !== 'playing') return

    const timer = window.setInterval(() => {
      useGameStore.getState().tick()
    }, 1000)

    return () => window.clearInterval(timer)
  }, [phase])
}
