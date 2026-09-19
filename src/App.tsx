import { KeyboardControls } from '@react-three/drei'
import { GameCanvas } from './game/GameCanvas.tsx'
import { useGameLoop } from './game/useGameLoop.ts'
import { useThemeMusic } from './game/useThemeMusic.ts'
import { useWeaponHotkeys } from './game/useWeaponHotkeys.ts'
import { GameOver } from './ui/GameOver.tsx'
import { Hud } from './ui/Hud.tsx'
import { Lobby } from './ui/Lobby.tsx'

const keyMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'jump', keys: ['Space'] },
]

export default function App() {
  useGameLoop()
  useWeaponHotkeys()
  useThemeMusic()

  return (
    <KeyboardControls map={keyMap}>
      <div className="relative h-full w-full">
        <GameCanvas />
        <Lobby />
        <Hud />
        <GameOver />
      </div>
    </KeyboardControls>
  )
}
