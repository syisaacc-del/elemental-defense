import type { HitPopup } from '../../data/elements.ts'

type Listener = (popup: HitPopup) => void

const listeners = new Set<Listener>()

export function emitHitPopup(popup: HitPopup) {
  for (const listener of listeners) listener(popup)
}

export function subscribeHitPopups(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
