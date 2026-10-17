import type { WeaponKind } from '../types/game.ts'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let sfxVolume = 1
let reloadTimers: number[] = []

function audio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function sfxBus() {
  const ac = audio()
  if (!master || master.context !== ac) {
    master = ac.createGain()
    master.gain.value = sfxVolume
    master.connect(ac.destination)
  }
  return master
}

export function setSfxVolume(volume: number) {
  sfxVolume = Math.max(0, Math.min(1, volume))
  if (master) master.gain.value = sfxVolume
}

export function resumeCombatAudio() {
  void audio().resume()
}

function noiseBuffer(ac: AudioContext, seconds: number) {
  const count = Math.max(1, Math.floor(ac.sampleRate * seconds))
  const buffer = ac.createBuffer(1, count, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < count; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function playNoise(
  seconds: number,
  volume: number,
  frequency: number,
  type: BiquadFilterType,
  decay: number,
) {
  const ac = audio()
  const now = ac.currentTime
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac, seconds)
  const filter = ac.createBiquadFilter()
  filter.type = type
  filter.frequency.value = frequency
  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(sfxBus())
  src.start(now)
  src.stop(now + seconds)
}

function playThump(startHz: number, endHz: number, volume: number, decay: number) {
  const ac = audio()
  const now = ac.currentTime
  const osc = ac.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(startHz, now)
  osc.frequency.exponentialRampToValueAtTime(endHz, now + decay)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay)
  osc.connect(gain)
  gain.connect(sfxBus())
  osc.start(now)
  osc.stop(now + decay)
}

function playClick(hz: number, volume: number) {
  const ac = audio()
  const now = ac.currentTime
  const osc = ac.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(hz, now)
  osc.frequency.exponentialRampToValueAtTime(hz * 0.55, now + 0.05)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  osc.connect(gain)
  gain.connect(sfxBus())
  osc.start(now)
  osc.stop(now + 0.07)
  playNoise(0.04, volume * 0.7, 1800, 'highpass', 0.05)
}

export function playShotSound(kind: WeaponKind) {
  if (kind === 'sniper') {
    playNoise(0.18, 0.42, 500, 'bandpass', 0.16)
    playThump(90, 36, 0.38, 0.16)
    playNoise(0.08, 0.2, 2400, 'highpass', 0.08)
    return
  }
  if (kind === 'launcher') {
    playThump(70, 28, 0.4, 0.2)
    playNoise(0.14, 0.28, 280, 'lowpass', 0.16)
    return
  }
  playNoise(0.08, 0.28, 1400, 'highpass', 0.07)
  playThump(170, 60, 0.18, 0.07)
}

function playMagOut() {
  playClick(210, 0.16)
  playNoise(0.06, 0.12, 700, 'bandpass', 0.07)
}

function playMagIn() {
  playClick(140, 0.2)
  playThump(120, 80, 0.1, 0.06)
}

function playCharge(kind: WeaponKind) {
  playNoise(0.07, 0.18, 1600, 'highpass', 0.08)
  playClick(kind === 'sniper' ? 90 : 260, 0.18)
  if (kind === 'sniper') playThump(80, 50, 0.12, 0.08)
}

export function stopReloadSfx() {
  for (const timer of reloadTimers) window.clearTimeout(timer)
  reloadTimers = []
}

export function startReloadSfx(kind: WeaponKind) {
  stopReloadSfx()
  playMagOut()
  reloadTimers.push(window.setTimeout(() => playMagIn(), 720))
  reloadTimers.push(window.setTimeout(() => playCharge(kind), 1500))
}
