import { useMemo } from 'react'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

export function useGridTexture(repeatX = 10, repeatY = 4) {
  return useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not create map texture')
    }

    ctx.fillStyle = '#152033'
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = '#1b2b45'
    for (let y = 0; y < size; y += 64) {
      for (let x = 0; x < size; x += 64) {
        if ((x + y) % 128 === 0) ctx.fillRect(x, y, 64, 64)
      }
    }

    ctx.strokeStyle = '#3e6d9a'
    ctx.lineWidth = 2
    for (let i = 0; i <= size; i += 32) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(size, i)
      ctx.stroke()
    }

    ctx.strokeStyle = '#5cecff'
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 3
    for (let i = 0; i <= size; i += 128) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(size, i)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(repeatX, repeatY)
    texture.anisotropy = 8
    return texture
  }, [repeatX, repeatY])
}
