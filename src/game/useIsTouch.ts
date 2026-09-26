import { useEffect, useState } from 'react'
import { detectTouch } from './touchInput.ts'

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(() => detectTouch())

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)')
    const sync = () => setIsTouch(detectTouch())
    sync()
    media.addEventListener('change', sync)
    window.addEventListener('resize', sync)
    return () => {
      media.removeEventListener('change', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  return isTouch
}
