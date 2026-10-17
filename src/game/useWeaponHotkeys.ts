import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore.ts'
import { useSettingsStore } from '../store/settingsStore.ts'

export function useWeaponHotkeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (useSettingsStore.getState().settingsOpen) return
      const { phase, switchSlot, cycleWeapon, beginReload, toggleCameraMode } = useGameStore.getState()
      if (phase !== 'playing') return
      if (event.repeat) return

      const keys = useSettingsStore.getState().keys
      if (event.code === keys.weapon1) switchSlot(0)
      if (event.code === keys.weapon2) switchSlot(1)
      if (event.code === keys.cycle) cycleWeapon()
      if (event.code === keys.reload) beginReload(performance.now())
      if (event.code === keys.camera) toggleCameraMode()
    }

    const onWheel = () => {
      if (useSettingsStore.getState().settingsOpen) return
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
