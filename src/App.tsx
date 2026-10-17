import { KeyboardControls } from '@react-three/drei'
import { GameCanvas } from './game/GameCanvas.tsx'
import { useCombatSfx } from './game/useCombatSfx.ts'
import { useGameLoop } from './game/useGameLoop.ts'
import { useSettingsSync } from './game/useSettingsSync.ts'
import { useThemeMusic } from './game/useThemeMusic.ts'
import { useWeaponHotkeys } from './game/useWeaponHotkeys.ts'
import { useSettingsStore } from './store/settingsStore.ts'
import { GameOver } from './ui/GameOver.tsx'
import { Hud } from './ui/Hud.tsx'
import { Lobby } from './ui/Lobby.tsx'
import { MobileControls } from './ui/MobileControls.tsx'
import { SettingsMenu } from './ui/SettingsMenu.tsx'

export default function App() {
  const keys = useSettingsStore((state) => state.keys)
  useGameLoop()
  useWeaponHotkeys()
  useThemeMusic()
  useCombatSfx()
  useSettingsSync()

  const keyMap = [
    { name: 'forward', keys: [keys.forward] },
    { name: 'backward', keys: [keys.backward] },
    { name: 'left', keys: [keys.left] },
    { name: 'right', keys: [keys.right] },
    { name: 'jump', keys: [keys.jump] },
    { name: 'walk', keys: [keys.walk] },
  ]

  return (
    <KeyboardControls key={Object.values(keys).join('-')} map={keyMap}>
      <div className="relative h-full w-full">
        <GameCanvas />
        <Lobby />
        <Hud />
        <MobileControls />
        <GameOver />
        <SettingsMenu />
      </div>
    </KeyboardControls>
  )
}
