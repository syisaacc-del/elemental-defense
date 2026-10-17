import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { useSettingsStore } from '../store/settingsStore.ts'

export function useGameLoop() {
  const phase = useGameStore((state) => state.phase)

  useEffect(() => {
    if (phase !== 'playing') return

    const timer = window.setInterval(() => {
      if (useSettingsStore.getState().settingsOpen) return
      useGameStore.getState().tick()
    }, 1000)

    return () => window.clearInterval(timer)
  }, [phase])
}
