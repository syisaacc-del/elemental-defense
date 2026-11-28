import { useState } from 'react'
import { KeyboardControls } from '@react-three/drei'
import { GameCanvas } from './game/GameCanvas.tsx'
import { useCombatSfx } from './game/useCombatSfx.ts'
import { useGameLoop } from './game/useGameLoop.ts'
import { useSettingsSync } from './game/useSettingsSync.ts'
import { useThemeMusic } from './game/useThemeMusic.ts'
import { useWeaponHotkeys } from './game/useWeaponHotkeys.ts'
import { useSettingsStore } from './store/settingsStore.ts'
import { FullscreenButton } from './ui/FullscreenButton.tsx'
import { GameOver } from './ui/GameOver.tsx'
import { Hud } from './ui/Hud.tsx'
import { IntroVideo } from './ui/IntroVideo.tsx'
import { Lobby } from './ui/Lobby.tsx'
import { MobileControls } from './ui/MobileControls.tsx'
import { SettingsMenu } from './ui/SettingsMenu.tsx'
import { VersusHud } from './ui/VersusHud.tsx'

export default function App() {
  const keys = useSettingsStore((state) => state.keys)
  const [showIntro, setShowIntro] = useState(true)
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
        {!showIntro && <Lobby />}
        <Hud />
        <VersusHud />
        <MobileControls />
        <GameOver />
        <SettingsMenu />
        <FullscreenButton />
        {showIntro && <IntroVideo onDone={() => setShowIntro(false)} />}
      </div>
    </KeyboardControls>
  )
}
