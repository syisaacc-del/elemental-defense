export const touchInput = {
  moveX: 0,
  moveY: 0,
  jump: false,
  firing: false,
  lookX: 0,
  lookY: 0,
}

export function resetTouchInput() {
  touchInput.moveX = 0
  touchInput.moveY = 0
  touchInput.jump = false
  touchInput.firing = false
  touchInput.lookX = 0
  touchInput.lookY = 0
}

export function addLook(dx: number, dy: number) {
  touchInput.lookX += dx
  touchInput.lookY += dy
}

export function consumeLook() {
  const x = touchInput.lookX
  const y = touchInput.lookY
  touchInput.lookX = 0
  touchInput.lookY = 0
  return { x, y }
}

export function detectTouch() {
  if (typeof window === 'undefined') return false
  const flag = new URLSearchParams(window.location.search).get('mobile')
  if (flag === '1') return true
  if (flag === '0') return false
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1
}
