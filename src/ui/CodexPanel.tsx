import type { ReactNode } from 'react'
import { ELEMENT_COLORS, REACTION_LIST } from '../data/elements.ts'
import { useT } from '../i18n/index.ts'
import type { ElementId } from '../types/game.ts'

const ELEMENTS: ElementId[] = ['fire', 'water', 'ice', 'thunder', 'grass', 'wind']

const ENEMIES = [
  { key: 'slime', hp: '80', note: 'codex.enemy.slime' },
  { key: 'runner', hp: '120', note: 'codex.enemy.runner' },
  { key: 'brute', hp: '220', note: 'codex.enemy.brute' },
  { key: 'elite', hp: '450+', note: 'codex.enemy.elite' },
] as const

const TOWERS = [
  { key: 'main', rangeKey: 'codex.stat.core', rateKey: 'codex.stat.core', note: 'codex.tower.main' },
  { key: 'guard', rangeKey: 'codex.stat.block', rateKey: 'codex.stat.fixed', note: 'codex.tower.guard' },
] as const

export function CodexPanel({ onClose }: { onClose: () => void }) {
  const t = useT()

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-black/55 px-3 py-4 backdrop-blur-[2px] md:items-center"
      onClick={onClose}
    >
      <div
        className="menu-panel max-h-[88vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-3xl border border-cyan-200/20 bg-[#0b1220]/92 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)] md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.35em] text-amber-200/80">{t('codex.eyebrow')}</p>
            <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">{t('codex.title')}</h2>
            <p className="mt-2 max-w-xl text-sm text-white/60">{t('codex.blurb')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/75 hover:bg-white/10"
          >
            {t('settings.close')}
          </button>
        </div>

        <Section title={t('codex.elements')}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ELEMENTS.map((id) => (
              <div
                key={id}
                className="rounded-2xl border border-white/10 bg-black/35 px-2 py-3 text-center"
                style={{ boxShadow: `inset 0 0 18px ${ELEMENT_COLORS[id]}33` }}
              >
                <div
                  className="mx-auto mb-2 h-3 w-3 rounded-full"
                  style={{ background: ELEMENT_COLORS[id], boxShadow: `0 0 12px ${ELEMENT_COLORS[id]}` }}
                />
                <div className="text-sm font-bold text-white">{t(`el.${id}`)}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t('codex.reactions')}>
          <div className="grid gap-2 sm:grid-cols-2">
            {REACTION_LIST.map((reaction) => (
              <div
                key={`${reaction.a}-${reaction.b}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
              >
                <div className="flex items-center gap-1 text-sm font-bold">
                  <span style={{ color: ELEMENT_COLORS[reaction.a] }}>{t(`el.${reaction.a}`)}</span>
                  <span className="text-white/35">+</span>
                  <span style={{ color: ELEMENT_COLORS[reaction.b] }}>{t(`el.${reaction.b}`)}</span>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm font-black" style={{ color: reaction.color }}>
                    {t(`reaction.${reaction.a}+${reaction.b}`)}
                  </div>
                  <div className="text-[11px] text-white/45">×{reaction.multiplier}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t('codex.enemies')}>
          <div className="grid gap-2 sm:grid-cols-2">
            {ENEMIES.map((enemy) => (
              <div key={enemy.key} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">{t(`codex.enemyName.${enemy.key}`)}</div>
                  <div className="text-xs text-amber-200/80">HP {enemy.hp}</div>
                </div>
                <p className="mt-1 text-sm text-white/55">{t(enemy.note)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t('codex.towers')}>
          <div className="grid gap-2 sm:grid-cols-2">
            {TOWERS.map((tower) => (
              <div key={tower.key} className="rounded-2xl border border-cyan-200/15 bg-cyan-400/5 px-4 py-3">
                <div className="font-bold text-cyan-100">{t(`codex.towerName.${tower.key}`)}</div>
                <p className="mt-1 text-sm text-white/60">{t(tower.note)}</p>
                <div className="mt-2 flex gap-3 text-[11px] text-white/45">
                  <span>
                    {t('codex.range')}: {t(tower.rangeKey)}
                  </span>
                  <span>
                    {t('codex.rate')}: {t(tower.rateKey)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold tracking-[0.2em] text-cyan-100/75">{title}</h3>
      {children}
    </section>
  )
}
