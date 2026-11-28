import { useState } from 'react'
import { MATCH_SECONDS, WEAPON_LIST, getWeapon } from '../data/weapons.ts'
import { playTheme } from '../game/themeMusic.ts'
import { formatTime } from '../game/formatTime.ts'
import { useIsTouch } from '../game/useIsTouch.ts'
import { localizedWeapon, useT } from '../i18n/index.ts'
import { formatKey, useSettingsStore } from '../store/settingsStore.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { WeaponDef } from '../types/game.ts'
import { CodexPanel } from './CodexPanel.tsx'
import { MultiplayerMenu } from './MultiplayerMenu.tsx'

type MenuView = 'title' | 'prepare'

export function Lobby() {
  const phase = useGameStore((state) => state.phase)
  const [view, setView] = useState<MenuView>('title')
  const [showCodex, setShowCodex] = useState(false)
  const [showMultiplayer, setShowMultiplayer] = useState(false)

  if (phase !== 'lobby') return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* 主視覺：幾乎全透明，露出背後 3D 元素塔世界 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#061018]/75 via-transparent to-[#061018]/35" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05070c]/90 via-transparent to-[#05070c]/25" />
      <div className="menu-atmosphere pointer-events-none absolute inset-0" />

      {view === 'title' ? (
        <TitleScreen
          onPlay={() => setView('prepare')}
          onCodex={() => setShowCodex(true)}
          onSettings={() => useSettingsStore.getState().setSettingsOpen(true)}
        />
      ) : (
        <PrepareScreen
          onBack={() => setView('title')}
          onVersus={() => setShowMultiplayer(true)}
        />
      )}

      {showCodex && <CodexPanel onClose={() => setShowCodex(false)} />}
      {showMultiplayer && <MultiplayerMenu onClose={() => setShowMultiplayer(false)} />}
    </div>
  )
}

function TitleScreen({
  onPlay,
  onCodex,
  onSettings,
}: {
  onPlay: () => void
  onCodex: () => void
  onSettings: () => void
}) {
  const t = useT()

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between px-5 py-6 md:px-10 md:py-8">
      <header className="pointer-events-none max-w-xl">
        <p className="menu-fade-in text-xs tracking-[0.45em] text-amber-200/85 md:text-sm">{t('lobby.tag')}</p>
        <h1 className="menu-fade-in menu-delay-1 mt-3 text-5xl font-black leading-none text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)] md:text-7xl">
          {t('lobby.title')}
        </h1>
        <p className="menu-fade-in menu-delay-2 mt-4 max-w-md text-sm text-white/70 md:text-base">{t('lobby.heroBlurb')}</p>
      </header>

      <div className="pointer-events-auto flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <nav className="flex flex-wrap gap-2">
          <SecondaryBtn label={t('lobby.nav.codex')} onClick={onCodex} />
          <SecondaryBtn label={t('lobby.nav.settings')} onClick={onSettings} />
        </nav>

        <button
          type="button"
          onClick={onPlay}
          className="menu-cta group relative overflow-hidden rounded-xl bg-emerald-400 px-10 py-4 text-xl font-black tracking-wide text-slate-950 shadow-[0_12px_40px_rgba(52,211,153,0.35)] transition hover:bg-emerald-300 md:px-14 md:py-5 md:text-2xl"
        >
          <span className="relative z-10">{t('lobby.play')}</span>
          <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/35 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
        </button>
      </div>
    </div>
  )
}

function PrepareScreen({ onBack, onVersus }: { onBack: () => void; onVersus: () => void }) {
  const t = useT()
  const language = useSettingsStore((state) => state.language)
  const score = useGameStore((state) => state.score)
  const selectedWeaponIds = useGameStore((state) => state.selectedWeaponIds)
  const startGame = useGameStore((state) => state.startGame)
  const setPointerLocked = useGameStore((state) => state.setPointerLocked)
  const isTouch = useIsTouch()
  const keys = useSettingsStore((state) => state.keys)

  const selectedWeapons = selectedWeaponIds.map((id) => localizedWeapon(getWeapon(id), language))
  const canStart = selectedWeaponIds.length === 2

  const launchSolo = () => {
    if (!startGame()) return
    playTheme()
    if (isTouch) {
      setPointerLocked(true)
      return
    }
    document.querySelector('canvas')?.requestPointerLock()
  }

  return (
    <div className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain bg-[#05070c]/55 px-4 py-5 backdrop-blur-[3px] md:px-8">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              ← {t('lobby.backMenu')}
            </button>
            <h2 className="text-3xl font-black text-white md:text-4xl">{t('lobby.prepare')}</h2>
            <p className="mt-2 text-sm text-white/60">{t('lobby.blurb')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MiniStat label={t('lobby.score')} value={String(score)} />
            <MiniStat label={t('lobby.time')} value={formatTime(MATCH_SECONDS)} />
            <MiniStat label={t('lobby.picked')} value={`${selectedWeaponIds.length} / 2`} />
            <MiniStat
              label={t('lobby.loadout')}
              value={selectedWeapons.length ? selectedWeapons.map((item) => item.elementLabel).join(' + ') : t('lobby.none')}
            />
          </div>
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

        <div className="mt-8 flex flex-col items-center gap-3 pb-6">
          <button
            type="button"
            onClick={launchSolo}
            disabled={!canStart}
            className={`rounded-xl px-12 py-4 text-lg font-black transition ${
              canStart
                ? 'bg-emerald-400 text-slate-950 shadow-[0_10px_30px_rgba(52,211,153,0.3)] hover:bg-emerald-300'
                : 'cursor-not-allowed bg-white/15 text-white/40'
            }`}
          >
            {t('lobby.startDefense')}
          </button>
          <button
            type="button"
            onClick={onVersus}
            className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-10 py-3 text-base font-bold text-cyan-100 transition hover:bg-cyan-400/20"
          >
            {t('lobby.versus')}
          </button>
          <p className="text-sm text-white/55">
            {canStart ? (isTouch ? t('lobby.hintTouch') : t('lobby.hintPc')) : t('mp.pickTwo')}
          </p>
          {!isTouch && canStart && (
            <p className="text-xs text-white/35">
              {formatKey(keys.walk)} / {formatKey(keys.camera)} / {formatKey(keys.menu)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function WeaponCard({ weapon, selected, locked }: { weapon: WeaponDef; selected: boolean; locked: boolean }) {
  const t = useT()
  const language = useSettingsStore((state) => state.language)
  const toggleWeapon = useGameStore((state) => state.toggleWeapon)
  const local = localizedWeapon(weapon, language)

  return (
    <button
      type="button"
      onClick={() => toggleWeapon(weapon.id)}
      disabled={locked && !selected}
      className={`rounded-2xl border p-3 text-left transition md:p-4 ${
        selected
          ? 'border-emerald-300 bg-emerald-400/15 shadow-[0_0_24px_rgba(52,211,153,0.18)]'
          : locked
            ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-50'
            : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/10'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: `${weapon.accent}22`, color: weapon.accent }}
        >
          {local.elementTag}
        </span>
        <span className="text-xs text-white/60">{local.kindLabel}</span>
      </div>
      <h3 className="mb-1 text-base font-bold text-white md:text-lg">{local.name}</h3>
      <p className="mb-3 text-sm text-white/65 md:mb-4">{local.description}</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/75">
        <div className="rounded-lg bg-black/30 px-2 py-2">
          <div className="text-white/45">{t('card.mag')}</div>
          <div className="mt-1 text-sm font-semibold text-white">{weapon.magazineSize}</div>
        </div>
        <div className="rounded-lg bg-black/30 px-2 py-2">
          <div className="text-white/45">{t('card.damage')}</div>
          <div className="mt-1 text-sm font-semibold text-white">{weapon.damage}</div>
        </div>
        <div className="rounded-lg bg-black/30 px-2 py-2">
          <div className="text-white/45">{t('card.rate')}</div>
          <div className="mt-1 text-sm font-semibold text-white">{t('card.rateUnit', { n: weapon.fireRate })}</div>
        </div>
      </div>
    </button>
  )
}

function SecondaryBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-sm transition hover:border-amber-200/40 hover:bg-black/50 hover:text-amber-100"
    >
      {label}
    </button>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-sm">
      <div className="text-[10px] text-white/45">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  )
}
