import { useEffect, useState } from 'react'
import { RELOAD_SECONDS, getWeapon } from '../data/weapons.ts'
import { SNIPER_ZOOM } from '../game/constants.ts'
import { formatTime } from '../game/formatTime.ts'
import { useIsTouch } from '../game/useIsTouch.ts'
import { localizedWeapon, useT } from '../i18n/index.ts'
import { formatKey, useSettingsStore } from '../store/settingsStore.ts'
import { useGameStore } from '../store/gameStore.ts'

export function Hud() {
  const t = useT()
  const language = useSettingsStore((state) => state.language)
  const phase = useGameStore((state) => state.phase)
  const mode = useGameStore((state) => state.mode)
  const score = useGameStore((state) => state.score)
  const timeLeft = useGameStore((state) => state.timeLeft)
  const playerHp = useGameStore((state) => state.playerHp)
  const baseHp = useGameStore((state) => state.baseHp)
  const loadout = useGameStore((state) => state.loadout)
  const currentSlot = useGameStore((state) => state.currentSlot)
  const isPointerLocked = useGameStore((state) => state.isPointerLocked)
  const isAiming = useGameStore((state) => state.isAiming)
  const cameraMode = useGameStore((state) => state.cameraMode)
  const kills = useGameStore((state) => state.kills)
  const leaks = useGameStore((state) => state.leaks)
  const isTouch = useIsTouch()
  const keys = useSettingsStore((state) => state.keys)

  if (phase !== 'playing' || !loadout) return null
  if (mode === 'versus') return null

  const current = loadout[currentSlot]
  const weapon = getWeapon(current.id)
  const showScope = isAiming && weapon.kind === 'sniper'

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {!isTouch && !isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="rounded-2xl border border-white/15 bg-black/60 px-8 py-5 text-center">
            <p className="text-xl font-bold text-white">{t('hud.clickToPlay')}</p>
            <p className="mt-2 text-sm text-white/65">
              {t('hud.controls', {
                walk: formatKey(keys.walk),
                camera: formatKey(keys.camera),
                reload: formatKey(keys.reload),
                menu: formatKey(keys.menu),
              })}
            </p>
          </div>
        </div>
      )}

      {showScope && <ScopeOverlay />}
      {(isTouch || isPointerLocked) && !showScope && <Crosshair />}

      <div className="absolute left-2 top-2 flex max-w-[78%] flex-wrap gap-1.5 md:left-6 md:top-6 md:gap-3">
        <HudChip label={t('hud.score')} value={String(score)} />
        <HudChip label={t('hud.time')} value={formatTime(timeLeft)} />
        <HudChip label={t('hud.player')} value={`${playerHp}`} />
        <HudChip label={t('hud.base')} value={`${baseHp}`} />
        <HudChip label={t('hud.kills')} value={String(kills)} />
        <HudChip label={t('hud.leaks')} value={String(leaks)} />
        <HudChip label={t('hud.view')} value={cameraMode === 'fps' ? t('hud.fps') : t('hud.tps')} />
      </div>

      <ReloadHint />

      <div className="absolute bottom-36 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-8 md:gap-3">
        {loadout.map((item, index) => {
          const itemWeapon = localizedWeapon(getWeapon(item.id), language)
          const active = index === currentSlot
          return (
            <div
              key={item.id}
              className={`min-w-36 rounded-2xl border px-3 py-2 md:min-w-52 md:px-4 md:py-3 ${
                active ? 'border-cyan-300 bg-cyan-400/15' : 'border-white/10 bg-black/45'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-white/55">
                <span>{formatKey(index === 0 ? keys.weapon1 : keys.weapon2)}</span>
                <span>{itemWeapon.elementTag}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-white md:text-base">{itemWeapon.name}</div>
              <div className="mt-1 text-sm text-white/70">
                {t('hud.mag')} {item.ammoInMag} / {itemWeapon.magazineSize}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Crosshair() {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="relative h-5 w-5">
        <div className="absolute left-1/2 top-0 h-2 w-[2px] -translate-x-1/2 bg-white/80" />
        <div className="absolute bottom-0 left-1/2 h-2 w-[2px] -translate-x-1/2 bg-white/80" />
        <div className="absolute left-0 top-1/2 h-[2px] w-2 -translate-y-1/2 bg-white/80" />
        <div className="absolute right-0 top-1/2 h-[2px] w-2 -translate-y-1/2 bg-white/80" />
      </div>
    </div>
  )
}

function ScopeOverlay() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle 16vh at center, transparent 0 58%, rgba(0,0,0,0.88) 62%, #000 100%)',
        }}
      />
      <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 -translate-y-1/2 bg-white/40" />
      <div className="absolute left-1/2 top-1/2 h-40 w-px -translate-x-1/2 -translate-y-1/2 bg-white/40" />
      <div className="absolute left-1/2 top-[calc(50%+18vh)] -translate-x-1/2 text-sm text-white/70">
        {SNIPER_ZOOM}x
      </div>
    </div>
  )
}

export function ReloadHint() {
  const t = useT()
  const loadout = useGameStore((state) => state.loadout)
  const currentSlot = useGameStore((state) => state.currentSlot)
  const current = loadout?.[currentSlot]
  const [, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (!current?.isReloading) return
    const timer = window.setInterval(() => setNow(performance.now()), 50)
    return () => window.clearInterval(timer)
  }, [current?.isReloading])

  if (!current) return null

  if (current.isReloading) {
    const remain = Math.max(0, (current.reloadEndsAt - performance.now()) / 1000)
    const progress = Math.min(1, 1 - remain / RELOAD_SECONDS)
    return (
      <div className="absolute bottom-52 left-1/2 w-56 -translate-x-1/2 text-center md:bottom-36 md:w-64">
        <div className="mb-2 text-sm font-semibold text-amber-200">
          {t('hud.reloading', { sec: remain.toFixed(1) })}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-amber-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    )
  }

  return null
}

function HudChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 md:px-4 md:py-2">
      <div className="text-[10px] text-white/50 md:text-[11px]">{label}</div>
      <div className="text-sm font-bold text-white md:text-lg">{value}</div>
    </div>
  )
}
