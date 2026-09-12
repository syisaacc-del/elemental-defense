import { useEffect, useState } from 'react'
import { RELOAD_SECONDS, getWeapon } from '../data/weapons.ts'
import { SNIPER_ZOOM } from '../game/constants.ts'
import { formatTime } from '../game/formatTime.ts'
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
  const kills = useGameStore((state) => state.kills)
  const leaks = useGameStore((state) => state.leaks)

  if (phase !== 'playing' || !loadout) return null

  const current = loadout[currentSlot]
  const weapon = getWeapon(current.id)
  const showScope = isAiming && weapon.kind === 'sniper'

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {!isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="rounded-2xl border border-white/15 bg-black/60 px-8 py-5 text-center">
            <p className="text-xl font-bold text-white">点击画面开始操控</p>
            <p className="mt-2 text-sm text-white/65">
              左键开枪 · 右键开镜 · R 换弹 · 1 / 2 切枪
            </p>
          </div>
        </div>
      )}

      {showScope && <ScopeOverlay />}
      {isPointerLocked && !showScope && <Crosshair />}

      <div className="absolute left-6 top-6 flex max-w-[70%] flex-wrap gap-3">
        <HudChip label="分数" value={String(score)} />
        <HudChip label="剩余时间" value={formatTime(timeLeft)} />
        <HudChip label="玩家" value={`${playerHp}`} />
        <HudChip label="基地" value={`${baseHp}`} />
        <HudChip label="击杀" value={String(kills)} />
        <HudChip label="漏防" value={String(leaks)} />
      </div>

      <ReloadHint />

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3">
        {loadout.map((item, index) => {
          const itemWeapon = getWeapon(item.id)
          const active = index === currentSlot
          return (
            <div
              key={item.id}
              className={`min-w-52 rounded-2xl border px-4 py-3 ${
                active ? 'border-cyan-300 bg-cyan-400/15' : 'border-white/10 bg-black/45'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-white/55">
                <span>按键 {index + 1}</span>
                <span>{itemWeapon.elementLabel}元素</span>
              </div>
              <div className="mt-1 font-bold text-white">{itemWeapon.name}</div>
              <div className="mt-1 text-sm text-white/70">
                弹匣 {item.ammoInMag} / {itemWeapon.magazineSize}
                <span className="ml-3 text-white/50">备用 {item.reserveAmmo}</span>
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
      <div className="absolute bottom-36 left-1/2 w-64 -translate-x-1/2 text-center">
        <div className="mb-2 text-sm font-semibold text-amber-200">换弹中 {remain.toFixed(1)}s</div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-amber-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    )
  }

  if (current.ammoInMag <= 0 && current.reserveAmmo <= 0) {
    return (
      <div className="absolute bottom-36 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-sm text-red-200">
        弹药耗尽
      </div>
    )
  }

  return null
}

function HudChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-2">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  )
}
