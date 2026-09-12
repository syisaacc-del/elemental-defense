import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore.ts'

export function useWeaponHotkeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { phase, switchSlot, cycleWeapon, beginReload } = useGameStore.getState()
      if (phase !== 'playing') return

      if (event.code === 'Digit1') switchSlot(0)
      if (event.code === 'Digit2') switchSlot(1)
      if (event.code === 'KeyQ') cycleWeapon()
      if (event.code === 'KeyR') beginReload(performance.now())
    }

    const onWheel = () => {
      const { phase, cycleWeapon } = useGameStore.getState()
      if (phase !== 'playing') return
      cycleWeapon()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])
}
