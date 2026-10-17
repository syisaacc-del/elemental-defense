import { resumeCombatAudio } from './combatAudio.ts'

const THEME_SRC = `${import.meta.env.BASE_URL}audio/theme.mp3`

let theme: HTMLAudioElement | null = null

function getTheme() {
  if (!theme) {
    theme = new Audio(THEME_SRC)
    theme.loop = true
    theme.preload = 'auto'
    theme.volume = 0.55
  }
  return theme
}

export function setThemeVolume(volume: number) {
  getTheme().volume = Math.max(0, Math.min(1, volume))
}

export function playTheme() {
  resumeCombatAudio()
  const audio = getTheme()
  audio.currentTime = 0
  void audio.play().catch(() => {})
}

export function stopTheme() {
  if (!theme) return
  theme.pause()
  theme.currentTime = 0
}
