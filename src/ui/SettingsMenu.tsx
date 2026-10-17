import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { resetTouchInput } from '../game/touchInput.ts'
import {
  KEY_LABELS,
  canRebindKey,
  formatKey,
  useSettingsStore,
  type GraphicsQuality,
  type KeyAction,
} from '../store/settingsStore.ts'

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string; hint: string }[] = [
  { id: 'low', label: '流畅', hint: '更顺，画面较糊' },
  { id: 'medium', label: '均衡', hint: '中间档' },
  { id: 'high', label: '清晰', hint: '最清楚' },
]

const KEY_ORDER = Object.keys(KEY_LABELS) as KeyAction[]

export function SettingsMenu() {
  const settingsOpen = useSettingsStore((state) => state.settingsOpen)
  const musicVolume = useSettingsStore((state) => state.musicVolume)
  const sfxVolume = useSettingsStore((state) => state.sfxVolume)
  const quality = useSettingsStore((state) => state.quality)
  const mouseSensitivity = useSettingsStore((state) => state.mouseSensitivity)
  const fov = useSettingsStore((state) => state.fov)
  const keys = useSettingsStore((state) => state.keys)
  const [waiting, setWaiting] = useState<KeyAction | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const store = useSettingsStore.getState()

      if (waiting) {
        event.preventDefault()
        event.stopPropagation()
        if (event.code === 'Escape') {
          setWaiting(null)
          return
        }
        if (canRebindKey(event.code)) store.setKey(waiting, event.code)
        setWaiting(null)
        return
      }

      if (event.repeat) return
      if (event.code === 'Escape' && store.settingsOpen) {
        event.preventDefault()
        store.setSettingsOpen(false)
        return
      }
      if (event.code === store.keys.menu || (event.code === 'Escape' && !document.pointerLockElement)) {
        event.preventDefault()
        store.toggleSettings()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [waiting])

  useEffect(() => {
    if (!settingsOpen) {
      setWaiting(null)
      return
    }
    resetTouchInput()
  }, [settingsOpen])

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <button
        type="button"
        onClick={() => useSettingsStore.getState().toggleSettings()}
        className="pointer-events-auto absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/60 text-white shadow-lg hover:border-cyan-300 hover:bg-black/75 md:right-6 md:top-6"
        aria-label="设定"
        title={`设定（${formatKey(keys.menu)}）`}
      >
        <GearIcon />
        <span className="absolute -bottom-4 text-[10px] font-semibold text-white/55">{formatKey(keys.menu)}</span>
      </button>

      {settingsOpen && (
        <div
          className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm"
          onClick={() => useSettingsStore.getState().setSettingsOpen(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-white/15 bg-slate-950/95 p-5 shadow-2xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.3em] text-cyan-200/80">SETTINGS</p>
                <h2 className="mt-1 text-2xl font-black text-white">设定</h2>
              </div>
              <button
                type="button"
                onClick={() => useSettingsStore.getState().setSettingsOpen(false)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
              >
                关闭
              </button>
            </div>

            <Section title="声音">
              <SliderRow
                label="背景音乐"
                value={musicVolume}
                onChange={(value) => useSettingsStore.getState().setMusicVolume(value)}
              />
              <SliderRow
                label="开枪 / 换弹"
                value={sfxVolume}
                onChange={(value) => useSettingsStore.getState().setSfxVolume(value)}
              />
            </Section>

            <Section title="画面">
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => useSettingsStore.getState().setQuality(option.id)}
                    className={`rounded-2xl border px-2 py-3 text-center ${
                      quality === option.id
                        ? 'border-cyan-300 bg-cyan-400/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/75 hover:border-white/25'
                    }`}
                  >
                    <div className="font-bold">{option.label}</div>
                    <div className="mt-1 text-[11px] text-white/50">{option.hint}</div>
                  </button>
                ))}
              </div>
              <SliderRow
                label="视野宽窄"
                value={(fov - 60) / 40}
                display={`${fov}`}
                onChange={(value) => useSettingsStore.getState().setFov(Math.round(60 + value * 40))}
              />
            </Section>

            <Section title="操作">
              <SliderRow
                label="鼠标灵敏度"
                value={(mouseSensitivity - 0.2) / 1.8}
                display={`${Math.round(mouseSensitivity * 100)}%`}
                onChange={(value) =>
                  useSettingsStore.getState().setMouseSensitivity(Number((0.2 + value * 1.8).toFixed(2)))
                }
              />
              <p className="text-xs text-white/45">点按键，再按下你想用的新键。Esc 取消。重复的键会自动对调。</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {KEY_ORDER.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setWaiting(action)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left ${
                      waiting === action
                        ? 'border-amber-300 bg-amber-300/15'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <span className="text-sm text-white/65">{KEY_LABELS[action]}</span>
                    <span className="text-sm font-bold text-white">
                      {waiting === action ? '按下新键…' : formatKey(keys[action])}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <button
              type="button"
              onClick={() => useSettingsStore.getState().resetSettings()}
              className="mt-2 w-full rounded-2xl border border-white/10 py-2.5 text-sm text-white/70 hover:bg-white/10"
            >
              恢复默认
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-cyan-100/80">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SliderRow({
  label,
  value,
  display,
  onChange,
}: {
  label: string
  value: number
  display?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-white/75">{label}</span>
        <span className="font-semibold text-white">{display ?? `${Math.round(value * 100)}`}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="h-2 w-full cursor-pointer accent-cyan-400"
      />
    </label>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.3 3.8h3.4l.5 2.1a6.8 6.8 0 0 1 1.7 1 2.3 2.3 0 0 0 .6-.3l2-1.1 1.7 2.9-1.6 1.4c.1.3.1.6.1.8l1.6 1.4-1.7 2.9-2-1.1c-.2-.1-.4-.2-.6-.3a6.8 6.8 0 0 1-1.7 1l-.5 2.1h-3.4l-.5-2.1a6.8 6.8 0 0 1-1.7-1c-.2.1-.4.2-.6.3l-2 1.1-1.7-2.9 1.6-1.4a6 6 0 0 1-.1-.8L3.5 9.7l1.7-2.9 2 1.1c.2.1.4.2.6.3a6.8 6.8 0 0 1 1.7-1l.8-2.4Z"
      />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  )
}
