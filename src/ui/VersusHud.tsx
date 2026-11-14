import { useEffect, useState } from 'react'
import { ELEMENT_COLORS } from '../data/elements.ts'
import { getWeapon } from '../data/weapons.ts'
import { leaveVersus, useVersusStore, VERSUS_HP, VERSUS_WINS_NEEDED } from '../game/net/peer.ts'
import { useIsTouch } from '../game/useIsTouch.ts'
import { formatKey, useSettingsStore } from '../store/settingsStore.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { ElementId } from '../types/game.ts'
import { Crosshair, ReloadHint } from './Hud.tsx'

const AURA_LABEL: Record<ElementId, string> = {
  water: '水',
  thunder: '雷',
  ice: '冰',
  fire: '火',
  grass: '草',
  wind: '风',
}

function HpBar({ label, hp, color }: { label: string; hp: number; color: string }) {
  const pct = Math.max(0, Math.min(1, hp / VERSUS_HP))
  return (
    <div className="w-40 md:w-56">
      <div className="mb-1 flex justify-between text-[11px] font-semibold text-white/70">
        <span>{label}</span>
        <span>{hp}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  )
}

function Stars({ wins }: { wins: number }) {
  return (
    <span className="tracking-widest text-amber-300">
      {Array.from({ length: VERSUS_WINS_NEEDED }, (_, i) => (i < wins ? '★' : '☆')).join('')}
    </span>
  )
}

export function VersusHud() {
  const phase = useGameStore((state) => state.phase)
  const mode = useGameStore((state) => state.mode)
  const isPointerLocked = useGameStore((state) => state.isPointerLocked)
  const versusPhase = useVersusStore((state) => state.phase)
  const myHp = useVersusStore((state) => state.myHp)
  const remoteHp = useVersusStore((state) => state.remoteHp)
  const myWins = useVersusStore((state) => state.myWins)
  const remoteWins = useVersusStore((state) => state.remoteWins)
  const round = useVersusStore((state) => state.round)
  const result = useVersusStore((state) => state.result)
  const invincibleUntil = useVersusStore((state) => state.invincibleUntil)
  const myAura = useVersusStore((state) => state.myAura)
  const loadout = useGameStore((state) => state.loadout)
  const currentSlot = useGameStore((state) => state.currentSlot)
  const isTouch = useIsTouch()
  const keys = useSettingsStore((state) => state.keys)
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(performance.now()), 100)
    return () => window.clearInterval(timer)
  }, [])

  if (mode !== 'versus' || phase !== 'playing') return null

  const shieldLeft = Math.max(0, (invincibleUntil - now) / 1000)
  const ended = versusPhase === 'ended'

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {!isTouch && !isPointerLocked && !ended && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="rounded-2xl border border-white/15 bg-black/60 px-8 py-5 text-center">
            <p className="text-xl font-bold text-white">点击画面开始操控</p>
            <p className="mt-2 text-sm text-white/65">
              按住左键开枪 · 右键瞄准 · {formatKey(keys.reload)} 换弹 · {formatKey(keys.camera)} 切换人称
            </p>
          </div>
        </div>
      )}

      {(isTouch || isPointerLocked) && !ended && <Crosshair />}
      {!ended && <ReloadHint />}

      <div className="absolute left-1/2 top-2 flex -translate-x-1/2 flex-col items-center gap-2 md:top-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-4 py-2">
          <div className="text-center">
            <div className="text-[10px] text-cyan-200/80">你</div>
            <div className="text-lg font-black leading-none text-white">{myWins}</div>
            <Stars wins={myWins} />
          </div>
          <div className="px-2 text-center">
            <div className="text-[10px] text-white/50">第</div>
            <div className="text-base font-black text-white/85">{round}</div>
            <div className="text-[10px] text-white/50">回合</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-rose-200/80">对手</div>
            <div className="text-lg font-black leading-none text-white">{remoteWins}</div>
            <Stars wins={remoteWins} />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <HpBar label="你" hp={myHp} color="#22d3ee" />
          <HpBar label="对手" hp={remoteHp} color="#fb7185" />
        </div>
        {shieldLeft > 0 && (
          <div className="rounded-full border border-cyan-300/50 bg-cyan-400/15 px-4 py-1 text-sm font-bold text-cyan-100">
            无敌 {shieldLeft.toFixed(1)}s
          </div>
        )}
        {myAura && (
          <div
            className="rounded-full border px-4 py-1 text-sm font-bold"
            style={{
              borderColor: `${ELEMENT_COLORS[myAura]}88`,
              background: `${ELEMENT_COLORS[myAura]}22`,
              color: ELEMENT_COLORS[myAura],
            }}
          >
            身上元素：{AURA_LABEL[myAura]}
          </div>
        )}
      </div>

      {loadout && !ended && (
        <div className="absolute bottom-36 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-8">
          {loadout.map((item, index) => {
            const itemWeapon = getWeapon(item.id)
            const active = index === currentSlot
            return (
              <div
                key={`${item.id}-${index}`}
                className={`min-w-32 rounded-2xl border px-3 py-2 ${
                  active ? 'border-cyan-300 bg-cyan-400/15' : 'border-white/10 bg-black/45'
                }`}
              >
                <div className="text-[10px] text-white/50">
                  {formatKey(index === 0 ? keys.weapon1 : keys.weapon2)} · {itemWeapon.elementLabel}
                </div>
                <div className="text-sm font-bold text-white">{itemWeapon.name}</div>
                <div className="text-xs text-white/65">
                  {itemWeapon.kind === 'melee'
                    ? '近战'
                    : `弹匣 ${item.ammoInMag}/${itemWeapon.magazineSize}`}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {ended && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="rounded-3xl border border-white/15 bg-slate-900/90 px-10 py-8 text-center">
            <p className="text-4xl font-black text-white">
              {result === 'win' ? '你赢了！' : result === 'lose' ? '你输了' : '对手离开了'}
            </p>
            <p className="mt-3 text-lg text-white/70">
              最终比分 {myWins} : {remoteWins}
            </p>
            <button
              type="button"
              onClick={() => leaveVersus()}
              className="mt-6 rounded-full bg-cyan-400 px-8 py-3 text-base font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              返回大厅
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
