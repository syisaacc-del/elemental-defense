import { useEffect, useRef, useState } from 'react'
import { addLook, resetTouchInput, touchInput } from '../game/touchInput.ts'
import { useIsTouch } from '../game/useIsTouch.ts'
import { useGameStore } from '../store/gameStore.ts'

export function MobileControls() {
  const isTouch = useIsTouch()
  const phase = useGameStore((state) => state.phase)
  const currentSlot = useGameStore((state) => state.currentSlot)
  const isAiming = useGameStore((state) => state.isAiming)
  const cameraMode = useGameStore((state) => state.cameraMode)

  useEffect(() => {
    if (phase !== 'playing') resetTouchInput()
  }, [phase])

  if (!isTouch || phase !== 'playing') return null

  return (
    <div className="absolute inset-0 z-20">
      <LookPad />
      <Joystick />
      <div
        className="absolute right-3 flex flex-col items-end gap-2"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mb-1 flex gap-2">
          <ActionButton
            label={cameraMode === 'fps' ? '第三人称' : '第一人称'}
            onPress={() => useGameStore.getState().toggleCameraMode()}
          />
          <ActionButton
            label="换弹"
            onPress={() => useGameStore.getState().beginReload(performance.now())}
          />
        </div>
        <div className="flex gap-2">
          <ActionButton
            label="1"
            active={currentSlot === 0}
            onPress={() => useGameStore.getState().switchSlot(0)}
          />
          <ActionButton
            label="2"
            active={currentSlot === 1}
            onPress={() => useGameStore.getState().switchSlot(1)}
          />
          <HoldButton
            label="跳"
            onHold={(held) => {
              touchInput.jump = held
            }}
          />
        </div>
        <div className="mt-1 flex items-end gap-3">
          <HoldButton
            label="瞄准"
            active={isAiming}
            onHold={(held) => useGameStore.getState().setAiming(held)}
          />
          <HoldButton
            label="开枪"
            large
            onHold={(held) => {
              touchInput.firing = held
            }}
          />
        </div>
      </div>
    </div>
  )
}

function LookPad() {
  const last = useRef<{ x: number; y: number } | null>(null)
  const pointer = useRef<number | null>(null)

  return (
    <div
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        if (pointer.current !== null) return
        pointer.current = event.pointerId
        last.current = { x: event.clientX, y: event.clientY }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (pointer.current !== event.pointerId || !last.current) return
        addLook(event.clientX - last.current.x, event.clientY - last.current.y)
        last.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerUp={(event) => {
        if (pointer.current !== event.pointerId) return
        pointer.current = null
        last.current = null
      }}
      onPointerCancel={() => {
        pointer.current = null
        last.current = null
      }}
    />
  )
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const stop = () => {
    pointer.current = null
    setKnob({ x: 0, y: 0 })
    touchInput.moveX = 0
    touchInput.moveY = 0
  }

  const move = (clientX: number, clientY: number) => {
    const node = base.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const max = rect.width / 2 - 10
    const length = Math.hypot(dx, dy)
    if (length > max) {
      dx = (dx / length) * max
      dy = (dy / length) * max
    }
    setKnob({ x: dx, y: dy })
    touchInput.moveX = dx / max
    touchInput.moveY = -dy / max
  }

  return (
    <div
      ref={base}
      className="absolute left-4 h-32 w-32 rounded-full border border-white/25 bg-black/25"
      style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))', touchAction: 'none' }}
      onPointerDown={(event) => {
        event.stopPropagation()
        pointer.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
        move(event.clientX, event.clientY)
      }}
      onPointerMove={(event) => {
        if (pointer.current !== event.pointerId) return
        event.stopPropagation()
        move(event.clientX, event.clientY)
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        if (pointer.current === event.pointerId) stop()
      }}
      onPointerCancel={stop}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  )
}

function ActionButton({
  label,
  active,
  onPress,
}: {
  label: string
  active?: boolean
  onPress: () => void
}) {
  return (
    <button
      type="button"
      className={`min-w-14 rounded-full border px-3 py-2 text-sm font-bold ${
        active ? 'border-cyan-300 bg-cyan-400/25 text-white' : 'border-white/25 bg-black/45 text-white'
      }`}
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        event.stopPropagation()
        onPress()
      }}
    >
      {label}
    </button>
  )
}

function HoldButton({
  label,
  large,
  active,
  onHold,
}: {
  label: string
  large?: boolean
  active?: boolean
  onHold: (held: boolean) => void
}) {
  return (
    <button
      type="button"
      className={`rounded-full border font-bold text-white ${
        large ? 'h-20 w-20 text-lg' : 'min-w-14 px-3 py-2 text-sm'
      } ${active ? 'border-cyan-300 bg-cyan-400/30' : 'border-white/30 bg-black/50'}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        event.currentTarget.setPointerCapture(event.pointerId)
        onHold(true)
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        onHold(false)
      }}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  )
}
