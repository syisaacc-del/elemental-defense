import { useEffect, useState } from 'react'
import { WEAPON_LIST } from '../data/weapons.ts'
import {
  hostVersus,
  hostVersusLan,
  joinVersus,
  joinVersusLan,
  leaveVersus,
  useVersusStore,
  type VersusLoadout,
} from '../game/net/peer.ts'
import type { WeaponId } from '../types/game.ts'

const APP_VERSION = '2026-11-14 a'

export function MultiplayerMenu({ onClose }: { onClose: () => void }) {
  const phase = useVersusStore((state) => state.phase)
  const code = useVersusStore((state) => state.code)
  const error = useVersusStore((state) => state.error)
  const step = useVersusStore((state) => state.step)
  const [selected, setSelected] = useState<WeaponId[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [lanAddr, setLanAddr] = useState('')

  useEffect(() => {
    if (!import.meta.env.DEV) return
    fetch('/lan-info')
      .then((res) => res.json())
      .then((data: { ip?: string }) => {
        if (data?.ip) setLanAddr(`http://${data.ip}:${location.port}`)
      })
      .catch(() => {})
  }, [])

  const busy = phase === 'hosting' || phase === 'joining'
  const canFight = selected.length === 2
  const loadout = (canFight ? [selected[0], selected[1]] : null) as VersusLoadout | null

  const toggle = (id: WeaponId) => {
    if (busy) return
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  const close = () => {
    if (busy) leaveVersus()
    onClose()
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-3 py-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95">
        <div className="shrink-0 border-b border-white/10 px-5 py-4 md:px-7">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-black text-white">多人对战 1v1</h2>
            <button
              type="button"
              onClick={close}
              className="rounded-full px-3 py-1 text-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm text-white/60">
            每人 800 血 · 选 2 把武器 · 三盘两胜 · 可打元素反应
          </p>
          <p className="mt-1 text-xs text-white/45">已选 {selected.length} / 2</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-7">
          <div className="grid gap-2 sm:grid-cols-2">
            {WEAPON_LIST.map((weapon) => {
              const active = selected.includes(weapon.id)
              const locked = selected.length >= 2 && !active
              return (
                <button
                  key={weapon.id}
                  type="button"
                  onClick={() => toggle(weapon.id)}
                  disabled={busy || locked}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-cyan-300 bg-cyan-400/15'
                      : locked
                        ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-45'
                        : 'border-white/10 bg-black/30 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold" style={{ color: weapon.accent }}>
                      {weapon.elementLabel}元素
                    </span>
                    <span className="text-[11px] text-white/45">{weapon.kindLabel}</span>
                  </div>
                  <div className="mt-0.5 text-base font-bold text-white">{weapon.name}</div>
                  <div className="mt-1 text-xs text-white/55">
                    伤害 {weapon.damage} · {weapon.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-5 py-4 md:px-7">
          {phase === 'hosting' ? (
            <div className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 p-4 text-center">
              <div className="text-xs text-white/55">把房间码发给朋友，等佢加入</div>
              <div className="my-2 text-3xl font-black tracking-[0.3em] text-cyan-200">
                {(code || '······').toUpperCase()}
              </div>
              <div className="mb-3 text-sm text-white/70">{step || '等待对手加入…'}</div>
              <button
                type="button"
                onClick={() => leaveVersus()}
                className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                取消
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => loadout && hostVersus(loadout)}
                disabled={busy || !canFight}
                className="w-full rounded-full bg-cyan-400 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
              >
                开启房间（你做房主）
              </button>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="输入 6 位房间码"
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-4 py-3 text-center text-base font-bold tracking-[0.25em] text-white placeholder:font-normal placeholder:tracking-normal placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={() => loadout && joinVersus(joinCode, loadout)}
                  disabled={busy || !canFight || joinCode.trim().length !== 6}
                  className="rounded-full bg-fuchsia-400 px-5 py-3 text-base font-bold text-slate-950 transition hover:bg-fuchsia-300 disabled:opacity-50"
                >
                  {phase === 'joining' ? '连接中…' : '加入'}
                </button>
              </div>
              {phase === 'joining' && step && (
                <p className="text-center text-xs text-white/60">{step}</p>
              )}

              {import.meta.env.DEV && (
                <>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-white/35">
                    <div className="h-px flex-1 bg-white/10" />
                    屋企同一個 WiFi 用（區網模式）
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <p className="text-xs leading-relaxed text-white/50">
                    朋友喺同一個 WiFi 下，用瀏覽器開呢個網址：
                    <span className="font-bold text-emerald-300">{lanAddr || '讀取中…'}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadout && hostVersusLan(loadout)}
                      disabled={busy || !canFight}
                      className="flex-1 rounded-full bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                    >
                      區網開房
                    </button>
                    <button
                      type="button"
                      onClick={() => loadout && joinVersusLan(joinCode, loadout)}
                      disabled={busy || !canFight || joinCode.trim().length !== 6}
                      className="flex-1 rounded-full border border-emerald-300/50 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-50"
                    >
                      區網加入（用上面個碼）
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-center text-sm font-semibold text-rose-300">{error}</p>}
          {!canFight && phase === 'off' && (
            <p className="mt-3 text-center text-xs text-amber-200/80">请先选出 2 把武器</p>
          )}
          <div className="mt-3 text-right text-[10px] text-white/25">版本 {APP_VERSION}</div>
        </div>
      </div>
    </div>
  )
}
