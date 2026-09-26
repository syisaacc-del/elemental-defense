import { useEffect, useState } from 'react'
import { RELOAD_SECONDS, getWeapon } from '../data/weapons.ts'
import { SNIPER_ZOOM } from '../game/constants.ts'
import { formatTime } from '../game/formatTime.ts'
import { useIsTouch } from '../game/useIsTouch.ts'
import { useGameStore } from '../store/gameStore.ts'

export function Hud() {
  const phase = useGameStore((state) => state.phase)
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

  if (phase !== 'playing' || !loadout) return null

  const current = loadout[currentSlot]
  const weapon = getWeapon(current.id)
  const showScope = isAiming && weapon.kind === 'sniper'

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {!isTouch && !isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="rounded-2xl border border-white/15 bg-black/60 px-8 py-5 text-center">
            <p className="text-xl font-bold text-white">点击画面开始操控</p>
            <p className="mt-2 text-sm text-white/65">
              按住左键开枪 · 换枪打出反应 · 右键瞄准 · P 切换人称 · R 换弹
            </p>
          </div>
        </div>
      )}

      {showScope && <ScopeOverlay />}
      {(isTouch || isPointerLocked) && !showScope && <Crosshair />}

      <div className="absolute left-2 top-2 flex max-w-[78%] flex-wrap gap-1.5 md:left-6 md:top-6 md:gap-3">
        <HudChip label="分数" value={String(score)} />
        <HudChip label="剩余时间" value={formatTime(timeLeft)} />
        <HudChip label="玩家" value={`${playerHp}`} />
        <HudChip label="基地" value={`${baseHp}`} />
        <HudChip label="击杀" value={String(kills)} />
        <HudChip label="漏防" value={String(leaks)} />
        <HudChip label="视角" value={cameraMode === 'fps' ? '第一人称' : '第三人称'} />
      </div>

      <ReloadHint />

      <div className="absolute bottom-36 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-8 md:gap-3">
        {loadout.map((item, index) => {
          const itemWeapon = getWeapon(item.id)
          const active = index === currentSlot
          return (
            <div
              key={item.id}
              className={`min-w-36 rounded-2xl border px-3 py-2 md:min-w-52 md:px-4 md:py-3 ${
                active ? 'border-cyan-300 bg-cyan-400/15' : 'border-white/10 bg-black/45'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-white/55">
                <span>按键 {index + 1}</span>
                <span>{itemWeapon.elementLabel}元素</span>
              </div>
              <div className="mt-1 text-sm font-bold text-white md:text-base">{itemWeapon.name}</div>
              <div className="mt-1 text-sm text-white/70">
                弹匣 {item.ammoInMag} / {itemWeapon.magazineSize}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Crosshair() {
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

function ReloadHint() {
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
        <div className="mb-2 text-sm font-semibold text-amber-200">换弹中 {remain.toFixed(1)}s</div>
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
