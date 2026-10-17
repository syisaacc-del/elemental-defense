import { useEffect, useRef } from 'react'
import { getWeapon } from '../data/weapons.ts'
import { useGameStore } from '../store/gameStore.ts'
import { startReloadSfx, stopReloadSfx } from './combatAudio.ts'

export function useCombatSfx() {
  const loadout = useGameStore((state) => state.loadout)
  const currentSlot = useGameStore((state) => state.currentSlot)
  const current = loadout?.[currentSlot]
  const wasReloading = useRef(false)

  useEffect(() => {
    const reloading = Boolean(current?.isReloading)
    if (reloading && !wasReloading.current && current) {
      startReloadSfx(getWeapon(current.id).kind)
    }
    if (!reloading) stopReloadSfx()
    wasReloading.current = reloading
  }, [current?.id, current?.isReloading])
}
