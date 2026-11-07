import { useState } from 'react'
import { getWeapon } from '../data/weapons.ts'
import { hostVersus, joinVersus, leaveVersus, useVersusStore } from '../game/net/peer.ts'
import type { WeaponId } from '../types/game.ts'

const RIFLE_CHOICES: WeaponId[] = ['water-rifle', 'thunder-rifle']

export function MultiplayerMenu({ onClose }: { onClose: () => void }) {
  const phase = useVersusStore((state) => state.phase)
  const code = useVersusStore((state) => state.code)
  const error = useVersusStore((state) => state.error)
  const [rifle, setRifle] = useState<WeaponId>('water-rifle')
  const [joinCode, setJoinCode] = useState('')

  const busy = phase === 'hosting' || phase === 'joining'

  const close = () => {
    if (busy) leaveVersus()
    onClose()
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 md:p-8">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-2xl font-black text-white">多人对战 1v1</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-full px-3 py-1 text-lg text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="mb-5 text-sm text-white/60">
          只用突击步枪 · 每人 400 血 · 三盘两胜 · 擊殺對手贏一盤
        </p>

        <div className="mb-5">
          <div className="mb-2 text-xs text-white/50">选择你的步枪</div>
          <div className="grid grid-cols-2 gap-2">
            {RIFLE_CHOICES.map((id) => {
              const weapon = getWeapon(id)
              const active = rifle === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRifle(id)}
                  disabled={busy}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-cyan-300 bg-cyan-400/15'
                      : 'border-white/10 bg-black/30 hover:border-white/30'
                  }`}
                >
                  <div className="text-sm font-bold" style={{ color: weapon.accent }}>
                    {weapon.elementLabel}元素
                  </div>
                  <div className="mt-0.5 text-base font-bold text-white">{weapon.name}</div>
                </button>
              )
            })}
          </div>
        </div>

        {phase === 'hosting' ? (
          <div className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 p-4 text-center">
            <div className="text-xs text-white/55">把房间码发给朋友，等佢加入</div>
            <div className="my-2 text-3xl font-black tracking-[0.3em] text-cyan-200">
              {(code || '······').toUpperCase()}
            </div>
            <div className="mb-3 text-sm text-white/70">等待对手加入…</div>
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
              onClick={() => hostVersus(rifle)}
              disabled={busy}
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
                onClick={() => joinVersus(joinCode, rifle)}
                disabled={busy || joinCode.trim().length !== 6}
                className="rounded-full bg-fuchsia-400 px-5 py-3 text-base font-bold text-slate-950 transition hover:bg-fuchsia-300 disabled:opacity-50"
              >
                {phase === 'joining' ? '连接中…' : '加入'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm font-semibold text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
