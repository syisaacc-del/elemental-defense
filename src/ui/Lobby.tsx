import { MATCH_SECONDS, WEAPON_LIST, getWeapon } from '../data/weapons.ts'
import { formatTime } from '../game/formatTime.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { WeaponDef } from '../types/game.ts'

function WeaponCard({ weapon, selected, locked }: { weapon: WeaponDef; selected: boolean; locked: boolean }) {
  const toggleWeapon = useGameStore((state) => state.toggleWeapon)

  return (
    <button
      type="button"
      onClick={() => toggleWeapon(weapon.id)}
      disabled={locked && !selected}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? 'border-cyan-300 bg-cyan-400/15 shadow-[0_0_24px_rgba(94,234,255,0.18)]'
          : locked
            ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-50'
            : 'border-white/10 bg-black/35 hover:border-white/30 hover:bg-white/10'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: `${weapon.accent}22`, color: weapon.accent }}
        >
          {weapon.elementLabel}元素
        </span>
        <span className="text-xs text-white/60">{weapon.kindLabel}</span>
      </div>
      <h3 className="mb-1 text-lg font-bold text-white">{weapon.name}</h3>
      <p className="mb-4 text-sm text-white/65">{weapon.description}</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/75">
        <div className="rounded-lg bg-black/30 px-2 py-2">
          <div className="text-white/45">弹匣</div>
          <div className="mt-1 text-sm font-semibold text-white">{weapon.magazineSize}</div>
        </div>
        <div className="rounded-lg bg-black/30 px-2 py-2">
          <div className="text-white/45">伤害</div>
          <div className="mt-1 text-sm font-semibold text-white">{weapon.damage}</div>
        </div>
        <div className="rounded-lg bg-black/30 px-2 py-2">
          <div className="text-white/45">射速</div>
          <div className="mt-1 text-sm font-semibold text-white">{weapon.fireRate}/秒</div>
        </div>
      </div>
    </button>
  )
}

export function Lobby() {
  const phase = useGameStore((state) => state.phase)
  const score = useGameStore((state) => state.score)
  const selectedWeaponIds = useGameStore((state) => state.selectedWeaponIds)
  const startGame = useGameStore((state) => state.startGame)

  if (phase !== 'lobby') return null

  const selectedWeapons = selectedWeaponIds.map((id) => getWeapon(id))
  const canStart = selectedWeaponIds.length === 2

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-slate-950/72 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center">
        <div className="mb-6 text-center">
          <p className="mb-2 text-sm tracking-[0.4em] text-cyan-200/80">ELEMENTAL DEFENSE</p>
          <h1 className="text-5xl font-black text-white">元素防线</h1>
          <p className="mt-3 text-white/70">选出 2 把武器，守住中间的基地。击杀 +10 分，漏进基地 -10 分。</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="当前分数" value={String(score)} />
          <Stat label="剩余时间" value={formatTime(MATCH_SECONDS)} />
          <Stat label="已选武器" value={`${selectedWeaponIds.length} / 2`} />
          <Stat
            label="出战组合"
            value={selectedWeapons.length ? selectedWeapons.map((item) => item.elementLabel).join(' + ') : '未选择'}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WEAPON_LIST.map((weapon) => (
            <WeaponCard
              key={weapon.id}
              weapon={weapon}
              selected={selectedWeaponIds.includes(weapon.id)}
              locked={selectedWeaponIds.length >= 2}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!startGame()) return
              document.querySelector('canvas')?.requestPointerLock()
            }}
            disabled={!canStart}
            className={`rounded-full px-10 py-3 text-lg font-bold transition ${
              canStart
                ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                : 'cursor-not-allowed bg-white/15 text-white/40'
            }`}
          >
            开始游戏
          </button>
          <p className="text-sm text-white/55">
            {canStart
              ? '点击后进入战场。左键开枪，右键开镜，R 换弹，1 / 2 切枪。'
              : '请先点选 2 张不同的武器卡片。'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
    </div>
  )
}
