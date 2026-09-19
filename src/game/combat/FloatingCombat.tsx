import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Group } from 'three'
import type { ReactionKind } from '../../data/elements.ts'
import { subscribeHitPopups } from './combatFx.ts'

export type Floater = {
  id: number
  position: [number, number, number]
  text: string
  color: string
  kind: ReactionKind
}

function FloaterItem({
  floater,
  onGone,
}: {
  floater: Floater
  onGone: (id: number) => void
}) {
  const group = useRef<Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const age = useRef(0)
  const gone = useRef(false)

  useFrame((_, delta) => {
    if (gone.current) return
    age.current += delta
    const life = floater.kind === 'reaction' ? 1.05 : 0.85
    const rise = floater.kind === 'reaction' ? 2.1 : 1.7

    if (group.current) {
      group.current.position.y = floater.position[1] + age.current * rise
    }
    if (label.current) {
      label.current.style.opacity = String(Math.max(0, 1 - age.current / life))
    }
    if (age.current >= life) {
      gone.current = true
      onGone(floater.id)
    }
  })

  return (
    <group ref={group} position={floater.position}>
      <Html
        center
        distanceFactor={8}
        occlude={false}
        zIndexRange={[80, 60]}
        style={{ pointerEvents: 'none', zIndex: 80 }}
      >
        <div
          ref={label}
          style={{
            color: floater.color,
            fontWeight: 900,
            fontSize: floater.kind === 'reaction' ? '22px' : '18px',
            letterSpacing: floater.kind === 'reaction' ? '0.08em' : '0',
            textShadow: '0 0 8px #000, 0 1px 2px #000, 0 0 14px currentColor',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
            transform: 'translateY(-8px)',
          }}
        >
          {floater.text}
        </div>
      </Html>
    </group>
  )
}

export function FloatingCombatLayer() {
  const [items, setItems] = useState<Floater[]>([])
  const nextId = useRef(1)

  useEffect(() => {
    return subscribeHitPopups((popup) => {
      const id = nextId.current++
      setItems((list) => [
        ...list,
        {
          id,
          position: popup.position,
          text: popup.text,
          color: popup.color,
          kind: popup.kind,
        },
      ])
    })
  }, [])

  return (
    <>
      {items.map((item) => (
        <FloaterItem
          key={item.id}
          floater={item}
          onGone={(id) => setItems((list) => list.filter((entry) => entry.id !== id))}
        />
      ))}
    </>
  )
}
