import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { stopTheme } from './themeMusic.ts'

export function useThemeMusic() {
  const phase = useGameStore((state) => state.phase)

  useEffect(() => {
    if (phase === 'lobby') stopTheme()
  }, [phase])
}
