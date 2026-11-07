import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { ELEMENT_COLORS } from '../data/elements.ts'
import { useGameStore } from '../store/gameStore.ts'
import { playShotSound } from './combatAudio.ts'
import { pendingRemoteShots, versusSendState } from './net/peer.ts'

type Tracer = {
  id: number
  start: [number, number, number]
  end: [number, number, number]
  color: string
}

let nextTracerId = 1
const TRACER_LENGTH = 60

export function VersusManager() {
  const [tracers, setTracers] = useState<Tracer[]>([])
  const sendAcc = useRef(0)

  useFrame((_, delta) => {
    if (useGameStore.getState().mode !== 'versus') return

    while (pendingRemoteShots.length > 0) {
      const shot = pendingRemoteShots.shift()
      if (!shot) break
      const id = nextTracerId++
      const end: [number, number, number] = [
        shot.o[0] + shot.d[0] * TRACER_LENGTH,
        shot.o[1] + shot.d[1] * TRACER_LENGTH,
        shot.o[2] + shot.d[2] * TRACER_LENGTH,
      ]
      setTracers((list) => [...list, { id, start: shot.o, end, color: ELEMENT_COLORS[shot.el] }])
      window.setTimeout(() => {
        setTracers((list) => list.filter((item) => item.id !== id))
      }, 70)
      playShotSound('rifle')
    }

    sendAcc.current += delta
    if (sendAcc.current >= 0.066) {
      sendAcc.current = 0
      versusSendState()
    }
  })

  return (
    <>
      {tracers.map((tracer) => (
        <Line key={tracer.id} points={[tracer.start, tracer.end]} color={tracer.color} lineWidth={2} />
      ))}
    </>
  )
}
