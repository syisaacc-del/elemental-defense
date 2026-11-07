import { useEffect, useState } from 'react'

export function FullscreenButton() {
  const [active, setActive] = useState(false)
  const [supported] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenEnabled),
  )

  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (!supported) return null

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
    } else {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-16 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/60 text-white shadow-lg hover:border-cyan-300 hover:bg-black/75 md:right-20 md:top-6"
      aria-label={active ? '离开全屏幕' : '全屏幕'}
      title={active ? '离开全屏幕' : '全屏幕'}
    >
      {active ? <CompressIcon /> : <ExpandIcon />}
    </button>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}

function CompressIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  )
}
