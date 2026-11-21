import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppLanguage } from '../i18n/types.ts'

export type GraphicsQuality = 'low' | 'medium' | 'high'
export type { AppLanguage }

export type KeyAction =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'jump'
  | 'walk'
  | 'reload'
  | 'camera'
  | 'weapon1'
  | 'weapon2'
  | 'cycle'
  | 'menu'

export const DEFAULT_KEYS: Record<KeyAction, string> = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  walk: 'ControlLeft',
  reload: 'KeyR',
  camera: 'KeyP',
  weapon1: 'Digit1',
  weapon2: 'Digit2',
  cycle: 'KeyQ',
  menu: 'KeyO',
}

export const KEY_LABEL_KEYS: Record<KeyAction, string> = {
  forward: 'key.forward',
  backward: 'key.backward',
  left: 'key.left',
  right: 'key.right',
  jump: 'key.jump',
  walk: 'key.walk',
  reload: 'key.reload',
  camera: 'key.camera',
  weapon1: 'key.weapon1',
  weapon2: 'key.weapon2',
  cycle: 'key.cycle',
  menu: 'key.menu',
}

/** @deprecated 用 KEY_LABEL_KEYS + i18n；保留俾舊引用唔即死 */
export const KEY_LABELS: Record<KeyAction, string> = {
  forward: '前進',
  backward: '後退',
  left: '左移',
  right: '右移',
  jump: '跳躍',
  walk: '慢走',
  reload: '換彈',
  camera: '切換人稱',
  weapon1: '武器 1',
  weapon2: '武器 2',
  cycle: '切換武器',
  menu: '打開設定',
}

const BLOCKED_REBIND = new Set(['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'F5', 'F11', 'F12'])

type SettingsState = {
  language: AppLanguage
  musicVolume: number
  sfxVolume: number
  quality: GraphicsQuality
  mouseSensitivity: number
  fov: number
  keys: Record<KeyAction, string>
  settingsOpen: boolean
  setLanguage: (value: AppLanguage) => void
  setMusicVolume: (value: number) => void
  setSfxVolume: (value: number) => void
  setQuality: (value: GraphicsQuality) => void
  setMouseSensitivity: (value: number) => void
  setFov: (value: number) => void
  setKey: (action: KeyAction, code: string) => boolean
  resetSettings: () => void
  setSettingsOpen: (open: boolean) => void
  toggleSettings: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function formatKey(code: string) {
  if (code === 'Space') return '空格'
  if (code === 'ShiftLeft') return '左 Shift'
  if (code === 'ShiftRight') return '右 Shift'
  if (code === 'ControlLeft') return '左 Ctrl'
  if (code === 'ControlRight') return '右 Ctrl'
  if (code === 'AltLeft') return '左 Alt'
  if (code === 'AltRight') return '右 Alt'
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code === 'ArrowUp') return '↑'
  if (code === 'ArrowDown') return '↓'
  if (code === 'ArrowLeft') return '←'
  if (code === 'ArrowRight') return '→'
  if (code.startsWith('Numpad')) return `小键盘 ${code.slice(6)}`
  return code
}

export function canRebindKey(code: string) {
  return !BLOCKED_REBIND.has(code)
}

type PersistedSettings = Pick<
  SettingsState,
  'language' | 'musicVolume' | 'sfxVolume' | 'quality' | 'mouseSensitivity' | 'fov' | 'keys'
>

const LANGS = new Set<AppLanguage>(['zh-Hant', 'zh-Hans', 'en'])

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'zh-Hant',
      musicVolume: 0.55,
      sfxVolume: 1,
      quality: 'high',
      mouseSensitivity: 1,
      fov: 75,
      keys: { ...DEFAULT_KEYS },
      settingsOpen: false,

      setLanguage: (value) => set({ language: LANGS.has(value) ? value : 'zh-Hant' }),
      setMusicVolume: (value) => set({ musicVolume: clamp(value, 0, 1) }),
      setSfxVolume: (value) => set({ sfxVolume: clamp(value, 0, 1) }),
      setQuality: (value) => set({ quality: value }),
      setMouseSensitivity: (value) => set({ mouseSensitivity: clamp(value, 0.2, 2) }),
      setFov: (value) => set({ fov: clamp(value, 60, 100) }),

      setKey: (action, code) => {
        if (!canRebindKey(code)) return false
        const keys = { ...get().keys }
        const taken = (Object.keys(keys) as KeyAction[]).find((item) => item !== action && keys[item] === code)
        if (taken) keys[taken] = keys[action]
        keys[action] = code
        set({ keys })
        return true
      },

      resetSettings: () =>
        set({
          language: 'zh-Hant',
          musicVolume: 0.55,
          sfxVolume: 1,
          quality: 'high',
          mouseSensitivity: 1,
          fov: 75,
          keys: { ...DEFAULT_KEYS },
        }),

      setSettingsOpen: (open) => {
        if (open && document.pointerLockElement) document.exitPointerLock()
        set({ settingsOpen: open })
      },

      toggleSettings: () => {
        const next = !get().settingsOpen
        if (next && document.pointerLockElement) document.exitPointerLock()
        set({ settingsOpen: next })
      },
    }),
    {
      name: 'elemental-defense-settings',
      partialize: (state): PersistedSettings => ({
        language: state.language,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        quality: state.quality,
        mouseSensitivity: state.mouseSensitivity,
        fov: state.fov,
        keys: state.keys,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PersistedSettings>
        const language = saved.language && LANGS.has(saved.language) ? saved.language : 'zh-Hant'
        return {
          ...current,
          ...saved,
          language,
          keys: { ...DEFAULT_KEYS, ...saved.keys },
          settingsOpen: false,
        }
      },
    },
  ),
)
