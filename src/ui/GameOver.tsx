import { stopTheme } from '../game/themeMusic.ts'
import { useGameStore } from '../store/gameStore.ts'

export function GameOver() {
  const phase = useGameStore((state) => state.phase)
  const score = useGameStore((state) => state.score)
  const kills = useGameStore((state) => state.kills)
  const leaks = useGameStore((state) => state.leaks)
  const endReason = useGameStore((state) => state.endReason)
  const resetToLobby = useGameStore((state) => state.resetToLobby)

  if (phase !== 'ended') return null

  const title = endReason === 'time' ? '时间到' : '分数耗尽'
  const summary = endReason === 'time' ? '5 分钟防守结束。' : '基地没守住，分数掉到 0 以下了。'

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-black/70 p-8 text-center">
        <p className="text-sm tracking-[0.3em] text-cyan-200/80">ELEMENTAL DEFENSE</p>
        <h2 className="mt-2 text-4xl font-black text-white">{title}</h2>
        <p className="mt-3 text-white/65">{summary}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="最终分数" value={String(score)} />
          <Stat label="击杀" value={String(kills)} />
          <Stat label="漏防" value={String(leaks)} />
        </div>

        <button
          type="button"
          onClick={() => {
            stopTheme()
            resetToLobby()
          }}
          className="mt-8 rounded-full bg-cyan-400 px-8 py-3 text-lg font-bold text-slate-950 hover:bg-cyan-300"
        >
          返回大厅
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  )
}
