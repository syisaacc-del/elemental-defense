import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/index.ts'

const INTRO_SRC = `${import.meta.env.BASE_URL}video/intro.mp4`

type IntroVideoProps = {
  onDone: () => void
}

/** 遊戲開頭全螢幕影片；播完或撳跳過就入主選單 */
export function IntroVideo({ onDone }: IntroVideoProps) {
  const t = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [needsTap, setNeedsTap] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const tryPlay = async () => {
      try {
        video.muted = false
        await video.play()
        setNeedsTap(false)
      } catch {
        // 瀏覽器擋咗自動播聲音 → 靜音再試；再唔得就等玩家撳一下
        try {
          video.muted = true
          await video.play()
          setNeedsTap(false)
        } catch {
          setNeedsTap(true)
        }
      }
    }

    void tryPlay()
  }, [])

  const startFromTap = async () => {
    const video = videoRef.current
    if (!video) return
    try {
      video.muted = false
      await video.play()
      setNeedsTap(false)
    } catch {
      try {
        video.muted = true
        await video.play()
        setNeedsTap(false)
      } catch {
        onDone()
      }
    }
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        src={INTRO_SRC}
        playsInline
        preload="auto"
        onEnded={onDone}
        onError={onDone}
      />

      {needsTap && (
        <button
          type="button"
          onClick={() => void startFromTap()}
          className="absolute inset-0 flex items-center justify-center bg-black/55"
        >
          <span className="rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-xl font-black text-white backdrop-blur-sm">
            {t('intro.tap')}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={onDone}
        className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/50 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-sm hover:bg-black/70"
      >
        {t('intro.skip')}
      </button>
    </div>
  )
}
