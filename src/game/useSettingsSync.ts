import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore.ts'
import { setSfxVolume } from './combatAudio.ts'
import { setThemeVolume } from './themeMusic.ts'

export function useSettingsSync() {
  const musicVolume = useSettingsStore((state) => state.musicVolume)
  const sfxVolume = useSettingsStore((state) => state.sfxVolume)

  useEffect(() => {
    setThemeVolume(musicVolume)
  }, [musicVolume])

  useEffect(() => {
    setSfxVolume(sfxVolume)
  }, [sfxVolume])
}
