import { create } from 'zustand'
import { KILL_SCORE, LEAK_SCORE, WEAPON_SWITCH_MS } from '../game/constants.ts'
import {
  MATCH_SECONDS,
  START_BASE_HP,
  START_PLAYER_HP,
  START_SCORE,
  getWeapon,
} from '../data/weapons.ts'
import type { EndReason, FireResult, GamePhase, LoadoutWeapon, WeaponId } from '../types/game.ts'

type GameStore = {
  phase: GamePhase
  score: number
  timeLeft: number
  playerHp: number
  baseHp: number
  kills: number
  leaks: number
  endReason: EndReason | null
  selectedWeaponIds: WeaponId[]
  currentSlot: 0 | 1
  loadout: [LoadoutWeapon, LoadoutWeapon] | null
  isPointerLocked: boolean
  isAiming: boolean
  weaponReadyAt: number
  toggleWeapon: (id: WeaponId) => void
  startGame: () => boolean
  switchSlot: (slot: 0 | 1) => void
  cycleWeapon: () => void
  setPointerLocked: (locked: boolean) => void
  setAiming: (aiming: boolean) => void
  tryFire: (now: number) => FireResult | null
  beginReload: (now: number) => boolean
  completeReloadIfDue: (now: number) => void
  tick: () => void
  addScore: (amount: number) => void
  recordKill: () => void
  recordLeak: () => void
  resetToLobby: () => void
}

function createLoadoutWeapon(id: WeaponId): LoadoutWeapon {
  const def = getWeapon(id)
  return {
    id,
    ammoInMag: def.magazineSize,
    reserveAmmo: def.magazineSize * 4,
    isReloading: false,
    lastShotAt: 0,
    reloadEndsAt: 0,
  }
}

function patchSlot(
  loadout: [LoadoutWeapon, LoadoutWeapon],
  slot: 0 | 1,
  patch: Partial<LoadoutWeapon>,
): [LoadoutWeapon, LoadoutWeapon] {
  const next: [LoadoutWeapon, LoadoutWeapon] = [{ ...loadout[0] }, { ...loadout[1] }]
  next[slot] = { ...next[slot], ...patch }
  return next
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'lobby',
  score: START_SCORE,
  timeLeft: MATCH_SECONDS,
  playerHp: START_PLAYER_HP,
  baseHp: START_BASE_HP,
  kills: 0,
  leaks: 0,
  endReason: null,
  selectedWeaponIds: [],
  currentSlot: 0,
  loadout: null,
  isPointerLocked: false,
  isAiming: false,
  weaponReadyAt: 0,

  toggleWeapon: (id) => {
    const { phase, selectedWeaponIds } = get()
    if (phase !== 'lobby') return

    if (selectedWeaponIds.includes(id)) {
      set({ selectedWeaponIds: selectedWeaponIds.filter((item) => item !== id) })
      return
    }

    if (selectedWeaponIds.length >= 2) return
    set({ selectedWeaponIds: [...selectedWeaponIds, id] })
  },

  startGame: () => {
    const { selectedWeaponIds, phase } = get()
    if (phase !== 'lobby' || selectedWeaponIds.length !== 2) return false

    const first = selectedWeaponIds[0]
    const second = selectedWeaponIds[1]
    if (!first || !second) return false

    set({
      phase: 'playing',
      score: START_SCORE,
      timeLeft: MATCH_SECONDS,
      playerHp: START_PLAYER_HP,
      baseHp: START_BASE_HP,
      currentSlot: 0,
      loadout: [createLoadoutWeapon(first), createLoadoutWeapon(second)],
      isAiming: false,
      weaponReadyAt: 0,
      kills: 0,
      leaks: 0,
      endReason: null,
    })
    return true
  },

  switchSlot: (slot) => {
    const { phase, currentSlot } = get()
    if (phase !== 'playing' || currentSlot === slot) return
    set({
      currentSlot: slot,
      isAiming: false,
      weaponReadyAt: performance.now() + WEAPON_SWITCH_MS,
    })
  },

  cycleWeapon: () => {
    const { currentSlot, switchSlot } = get()
    switchSlot(currentSlot === 0 ? 1 : 0)
  },

  setPointerLocked: (locked) => {
    set({ isPointerLocked: locked, ...(locked ? {} : { isAiming: false }) })
  },

  setAiming: (aiming) => {
    const { phase, loadout, currentSlot } = get()
    if (phase !== 'playing' || !loadout) {
      set({ isAiming: false })
      return
    }
    const weapon = getWeapon(loadout[currentSlot].id)
    set({ isAiming: aiming && weapon.kind === 'sniper' })
  },

  tryFire: (now) => {
    const { phase, loadout, currentSlot, isPointerLocked, weaponReadyAt, beginReload } = get()
    if (phase !== 'playing' || !loadout || !isPointerLocked || now < weaponReadyAt) return null

    const current = loadout[currentSlot]
    if (current.isReloading) return null

    if (current.ammoInMag <= 0) {
      beginReload(now)
      return null
    }

    const def = getWeapon(current.id)
    const interval = 1000 / def.fireRate
    if (now - current.lastShotAt < interval) return null

    const ammoInMag = current.ammoInMag - 1
    set({
      loadout: patchSlot(loadout, currentSlot, {
        ammoInMag,
        lastShotAt: now,
      }),
    })

    if (ammoInMag <= 0) beginReload(now)

    return {
      kind: def.kind,
      damage: def.damage,
      aoeRadius: def.aoeRadius,
      accent: def.accent,
      element: def.element,
    }
  },

  beginReload: (now) => {
    const { phase, loadout, currentSlot } = get()
    if (phase !== 'playing' || !loadout) return false

    const current = loadout[currentSlot]
    const def = getWeapon(current.id)
    if (current.isReloading || current.reserveAmmo <= 0 || current.ammoInMag >= def.magazineSize) {
      return false
    }

    set({
      loadout: patchSlot(loadout, currentSlot, {
        isReloading: true,
        reloadEndsAt: now + def.reloadTime * 1000,
      }),
      isAiming: false,
    })
    return true
  },

  completeReloadIfDue: (now) => {
    const { loadout } = get()
    if (!loadout) return

    let changed = false
    const next: [LoadoutWeapon, LoadoutWeapon] = [{ ...loadout[0] }, { ...loadout[1] }]
    for (const slot of [0, 1] as const) {
      const item = next[slot]
      if (!item.isReloading || now < item.reloadEndsAt) continue
      const def = getWeapon(item.id)
      const taken = Math.min(def.magazineSize - item.ammoInMag, item.reserveAmmo)
      next[slot] = {
        ...item,
        ammoInMag: item.ammoInMag + taken,
        reserveAmmo: item.reserveAmmo - taken,
        isReloading: false,
        reloadEndsAt: 0,
      }
      changed = true
    }
    if (changed) set({ loadout: next })
  },

  tick: () => {
    const { phase, timeLeft } = get()
    if (phase !== 'playing') return
    const next = timeLeft - 1
    if (next <= 0) {
      set({
        timeLeft: 0,
        phase: 'ended',
        endReason: 'time',
        isPointerLocked: false,
        isAiming: false,
      })
      document.exitPointerLock()
      return
    }
    set({ timeLeft: next })
  },

  addScore: (amount) => {
    const next = get().score + amount
    if (next < 0 && get().phase === 'playing') {
      set({
        score: next,
        phase: 'ended',
        endReason: 'score',
        isPointerLocked: false,
        isAiming: false,
      })
      document.exitPointerLock()
      return
    }
    set({ score: next })
  },

  recordKill: () => {
    if (get().phase !== 'playing') return
    set({ kills: get().kills + 1 })
    get().addScore(KILL_SCORE)
  },

  recordLeak: () => {
    if (get().phase !== 'playing') return
    const baseHp = Math.max(0, get().baseHp - 10)
    set({ leaks: get().leaks + 1, baseHp })
    get().addScore(LEAK_SCORE)
  },

  resetToLobby: () => {
    set({
      phase: 'lobby',
      score: START_SCORE,
      timeLeft: MATCH_SECONDS,
      playerHp: START_PLAYER_HP,
      baseHp: START_BASE_HP,
      selectedWeaponIds: [],
      currentSlot: 0,
      loadout: null,
      isPointerLocked: false,
      isAiming: false,
      weaponReadyAt: 0,
      kills: 0,
      leaks: 0,
      endReason: null,
    })
  },
}))
