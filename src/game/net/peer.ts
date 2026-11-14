import { create } from 'zustand'
import { useGameStore } from '../../store/gameStore.ts'
import type { ElementId, WeaponId } from '../../types/game.ts'
import { VERSUS_HOST_SPAWN, VERSUS_JOIN_SPAWN } from '../map/versusLayout.ts'
import { playerMotion } from '../playerMotion.ts'

export const VERSUS_HP = 400
export const VERSUS_WINS_NEEDED = 2
export const SPAWN_SHIELD_MS = 2000

// 互聯網對戰：經 Cloudflare 中繼站轉訊息（唔使兩部機直接穿透路由器）。
// PeerJS 喺同一部機兩個分頁會通，但跨裝置經常卡喺「建立緊連線」。
const CLOUD_RELAY_URL = 'wss://elemental-defense-relay.chansheungyin102030.workers.dev/versus-ws'

export type VersusPhase = 'off' | 'hosting' | 'joining' | 'playing' | 'ended'
export type VersusResult = 'win' | 'lose' | 'left'

type HelloMsg = { t: 'hello'; rifle: WeaponId }
type StateMsg = {
  t: 's'
  p: [number, number, number]
  yaw: number
  sp: number
  air: boolean
  hp: number
  inv: boolean
}
type ShotMsg = { t: 'shot'; o: [number, number, number]; d: [number, number, number]; el: ElementId }
type HitMsg = { t: 'hit'; d: number }
type DiedMsg = { t: 'died'; round: number }
type ByeMsg = { t: 'bye' }
type VersusMessage = HelloMsg | StateMsg | ShotMsg | HitMsg | DiedMsg | ByeMsg

export type RemoteShot = { o: [number, number, number]; d: [number, number, number]; el: ElementId }

// Live remote-player state, updated at network rate. Read per-frame by the
// remote avatar + hit detection. Kept outside zustand to avoid re-render churn.
export const remotePlayer = {
  active: false,
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  airborne: false,
  invincible: false,
  lastAt: 0,
}

// Set to 1 when the remote player fires; the remote avatar decays it for recoil.
export const remoteRecoil = { pulse: 0 }

// Remote shots waiting to be turned into tracers/sounds by VersusManager.
export const pendingRemoteShots: RemoteShot[] = []

type VersusStore = {
  phase: VersusPhase
  code: string
  error: string
  step: string
  myRifle: WeaponId
  remoteRifle: WeaponId
  myHp: number
  remoteHp: number
  myWins: number
  remoteWins: number
  round: number
  result: VersusResult | null
  invincibleUntil: number
  remoteInvincible: boolean
  patch: (part: Partial<VersusStore>) => void
}

export const useVersusStore = create<VersusStore>((set) => ({
  phase: 'off',
  code: '',
  error: '',
  step: '',
  myRifle: 'water-rifle',
  remoteRifle: 'water-rifle',
  myHp: VERSUS_HP,
  remoteHp: VERSUS_HP,
  myWins: 0,
  remoteWins: 0,
  round: 1,
  result: null,
  invincibleUntil: 0,
  remoteInvincible: false,
  patch: set,
}))

// Minimal shape of a game channel: LanChannel (Cloudflare + LAN relay) satisfies it.
export interface ConnLike {
  open: boolean
  send: (data: unknown) => void
  close: () => void
  on: (event: string, cb: (...args: any[]) => void) => void
}

let conn: ConnLike | null = null
let started = false
let joinTimer: ReturnType<typeof setTimeout> | null = null
let lanWs: WebSocket | null = null
let lanTimer: ReturnType<typeof setTimeout> | null = null

export function isVersus() {
  return useGameStore.getState().mode === 'versus'
}

function makeCode() {
  const letters = 'abcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 6; i += 1) out += letters[Math.floor(Math.random() * letters.length)]
  return out
}

function send(msg: VersusMessage) {
  if (conn && conn.open) conn.send(msg)
}

let isHostRole = false

function mySpawn(): [number, number, number] {
  return isHostRole ? VERSUS_HOST_SPAWN : VERSUS_JOIN_SPAWN
}

function startMatch(role: 'host' | 'join') {
  if (started) return
  started = true
  isHostRole = role === 'host'
  remotePlayer.active = true
  pendingRemoteShots.length = 0
  useGameStore.getState().startVersus(useVersusStore.getState().myRifle)
  useVersusStore.getState().patch({
    phase: 'playing',
    step: '',
    myHp: VERSUS_HP,
    remoteHp: VERSUS_HP,
    myWins: 0,
    remoteWins: 0,
    round: 1,
    result: null,
    invincibleUntil: performance.now() + SPAWN_SHIELD_MS,
    remoteInvincible: false,
  })
  playerMotion.pendingSpawn = mySpawn()
}

function endMatch(result: VersusResult) {
  const v = useVersusStore.getState()
  if (v.phase !== 'playing') return
  v.patch({ phase: 'ended', result })
  if (document.pointerLockElement) document.exitPointerLock()
}

function onPeerGone() {
  const v = useVersusStore.getState()
  if (v.phase === 'playing') {
    endMatch('left')
  } else if (v.phase === 'hosting' || v.phase === 'joining') {
    v.patch({ phase: 'off', error: '對方斷線咗' })
  }
}

function applyHit(damage: number) {
  const v = useVersusStore.getState()
  if (v.phase !== 'playing') return
  if (performance.now() < v.invincibleUntil) return
  const hp = Math.max(0, v.myHp - damage)
  if (hp > 0) {
    v.patch({ myHp: hp })
    return
  }
  // I died: the remote player wins this round.
  v.patch({ myHp: 0 })
  send({ t: 'died', round: v.round })
  const remoteWins = v.remoteWins + 1
  if (remoteWins >= VERSUS_WINS_NEEDED) {
    v.patch({ remoteWins })
    endMatch('lose')
    return
  }
  v.patch({
    remoteWins,
    round: v.round + 1,
    myHp: VERSUS_HP,
    invincibleUntil: performance.now() + SPAWN_SHIELD_MS,
  })
  playerMotion.pendingSpawn = mySpawn()
}

let lastRemoteDiedRound = 0

function onRemoteDied(round: number) {
  const v = useVersusStore.getState()
  if (v.phase !== 'playing') return
  if (round === lastRemoteDiedRound) return
  lastRemoteDiedRound = round
  const myWins = v.myWins + 1
  if (myWins >= VERSUS_WINS_NEEDED) {
    v.patch({ myWins, remoteHp: 0 })
    endMatch('win')
    return
  }
  // I won the round: heal to full, stay where I am. Remote respawns on their side.
  v.patch({ myWins, round: v.round + 1, myHp: VERSUS_HP, remoteHp: VERSUS_HP })
}

function onMessage(msg: VersusMessage, role: 'host' | 'join') {
  const v = useVersusStore.getState()
  switch (msg.t) {
    case 'hello':
      v.patch({ remoteRifle: msg.rifle })
      startMatch(role)
      break
    case 's': {
      remotePlayer.x = msg.p[0]
      remotePlayer.y = msg.p[1]
      remotePlayer.z = msg.p[2]
      remotePlayer.yaw = msg.yaw
      remotePlayer.speed = msg.sp
      remotePlayer.airborne = msg.air
      remotePlayer.invincible = msg.inv
      remotePlayer.lastAt = performance.now()
      const part: Partial<VersusStore> = {}
      if (msg.hp !== v.remoteHp) part.remoteHp = msg.hp
      if (msg.inv !== v.remoteInvincible) part.remoteInvincible = msg.inv
      if (Object.keys(part).length > 0) v.patch(part)
      break
    }
    case 'shot':
      pendingRemoteShots.push({ o: msg.o, d: msg.d, el: msg.el })
      remoteRecoil.pulse = 1
      break
    case 'hit':
      applyHit(msg.d)
      break
    case 'died':
      onRemoteDied(msg.round)
      break
    case 'bye':
      onPeerGone()
      break
  }
}

function wireConnection(c: ConnLike, role: 'host' | 'join') {
  conn = c
  c.on('open', () => {
    if (joinTimer) {
      clearTimeout(joinTimer)
      joinTimer = null
    }
    send({ t: 'hello', rifle: useVersusStore.getState().myRifle })
  })
  c.on('data', (data) => onMessage(data as VersusMessage, role))
  c.on('close', () => {
    if (conn === c) conn = null
    onPeerGone()
  })
  c.on('error', () => {
    if (conn === c) conn = null
    onPeerGone()
  })
}

function cleanupPeer() {
  if (joinTimer) {
    clearTimeout(joinTimer)
    joinTimer = null
  }
  if (lanTimer) {
    clearTimeout(lanTimer)
    lanTimer = null
  }
  if (lanWs) {
    try {
      lanWs.close()
    } catch {
      // ignore
    }
    lanWs = null
  }
  if (conn) {
    try {
      conn.close()
    } catch {
      // ignore
    }
    conn = null
  }
  started = false
  isHostRole = false
  remotePlayer.active = false
  pendingRemoteShots.length = 0
  remoteRecoil.pulse = 0
}

// ---------- Shared relay helpers (Cloudflare internet + LAN wifi) ----------
function hostViaRelay(rifle: WeaponId, url: string, relayName: string) {
  cleanupPeer()
  const code = makeCode()
  useVersusStore.getState().patch({
    phase: 'hosting',
    code: '',
    error: '',
    step: `聯絡${relayName}…`,
    myRifle: rifle,
    result: null,
  })
  const ws = new WebSocket(url)
  lanWs = ws
  wireLan(ws, 'host', relayName)
  ws.onopen = () => {
    ws.send(JSON.stringify({ t: 'host', code }))
    useVersusStore.getState().patch({ code, step: '' })
  }
  ws.onerror = () => {
    useVersusStore.getState().patch({ phase: 'off', step: '', error: `連唔到${relayName}，請再試一次` })
  }
}

function joinViaRelay(code: string, rifle: WeaponId, url: string, relayName: string) {
  cleanupPeer()
  const clean = code.trim().toLowerCase()
  if (clean.length !== 6) {
    useVersusStore.getState().patch({ error: '房碼係 6 個字元' })
    return
  }
  useVersusStore.getState().patch({
    phase: 'joining',
    code: clean,
    error: '',
    step: `聯絡${relayName}…`,
    myRifle: rifle,
    result: null,
  })
  const ws = new WebSocket(url)
  lanWs = ws
  wireLan(ws, 'join', relayName)
  ws.onopen = () => {
    useVersusStore.getState().patch({ step: '建立緊連線…' })
    ws.send(JSON.stringify({ t: 'join', code: clean }))
    joinTimer = setTimeout(() => {
      if (!started) {
        cleanupPeer()
        useVersusStore.getState().patch({ phase: 'off', step: '', error: '連接超時，請再試一次' })
      }
    }, 12000)
  }
  ws.onerror = () => {
    useVersusStore.getState().patch({ phase: 'off', step: '', error: `連唔到${relayName}，請再試一次` })
  }
}

// ---------- Internet mode: Cloudflare relay (works across devices) ----------
export function hostVersus(rifle: WeaponId) {
  hostViaRelay(rifle, CLOUD_RELAY_URL, '雲端中繼站')
}

export function joinVersus(code: string, rifle: WeaponId) {
  joinViaRelay(code, rifle, CLOUD_RELAY_URL, '雲端中繼站')
}

// ---------- Relay channel: wraps a WebSocket so it quacks like a data ----------

type LanEnvelope =
  | { t: 'paired' }
  | { t: 'err'; msg?: string }
  | { t: 'peer-left' }
  | { t: 'm'; d: VersusMessage }

// Wraps the relay WebSocket so it quacks like a PeerJS DataConnection.
class LanChannel implements ConnLike {
  open = true
  private ws: WebSocket
  private handlers = new Map<string, Array<(...args: any[]) => void>>()
  constructor(ws: WebSocket) {
    this.ws = ws
  }
  on(event: string, cb: (...args: any[]) => void) {
    const list = this.handlers.get(event) ?? []
    list.push(cb)
    this.handlers.set(event, list)
  }
  emitLocal(event: string, arg?: unknown) {
    for (const cb of this.handlers.get(event) ?? []) cb(arg)
  }
  send(data: unknown) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: 'm', d: data }))
  }
  close() {
    try {
      this.ws.close()
    } catch {
      // ignore
    }
  }
}

function lanWsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/versus-ws`
}

function wireLan(ws: WebSocket, role: 'host' | 'join', relayName: string) {
  let chan: LanChannel | null = null
  ws.onmessage = (ev) => {
    let msg: LanEnvelope
    try {
      msg = JSON.parse(String(ev.data)) as LanEnvelope
    } catch {
      return
    }
    if (msg.t === 'm') {
      if (chan) chan.emitLocal('data', msg.d)
      return
    }
    if (msg.t === 'paired') {
      chan = new LanChannel(ws)
      wireConnection(chan, role)
      setTimeout(() => chan?.emitLocal('open'), 0)
      return
    }
    if (msg.t === 'peer-left') {
      if (chan) chan.emitLocal('close')
      return
    }
    if (msg.t === 'err') {
      if (started) return
      const text = msg.msg === 'no-room'
        ? '搵唔到呢個房：檢查個碼啱唔啱，或者房主未開房'
        : '間房滿咗／個碼撞咗，開多次房攞個新碼'
      cleanupPeer()
      useVersusStore.getState().patch({ phase: 'off', step: '', error: text })
    }
  }
  ws.onclose = () => {
    if (lanWs === ws) lanWs = null
    if (chan) {
      chan.emitLocal('close')
      return
    }
    const v = useVersusStore.getState()
    if (!started && (v.phase === 'hosting' || v.phase === 'joining')) {
      v.patch({ phase: 'off', step: '', error: `${relayName}斷咗線，請再試一次` })
    }
  }
}

// ---------- LAN mode (same wifi): through the dev server's built-in relay ----------
export function hostVersusLan(rifle: WeaponId) {
  hostViaRelay(rifle, lanWsUrl(), '區網中繼')
}

export function joinVersusLan(code: string, rifle: WeaponId) {
  joinViaRelay(code, rifle, lanWsUrl(), '區網中繼')
}

export function leaveVersus() {
  if (conn && conn.open) send({ t: 'bye' })
  cleanupPeer()
  useVersusStore.getState().patch({
    phase: 'off',
    code: '',
    error: '',
    step: '',
    result: null,
    invincibleUntil: 0,
    remoteInvincible: false,
  })
  if (useGameStore.getState().mode === 'versus') {
    useGameStore.getState().resetToLobby()
  }
}

export function versusSendState() {
  const v = useVersusStore.getState()
  if (v.phase !== 'playing') return
  send({
    t: 's',
    p: [playerMotion.x, playerMotion.y, playerMotion.z],
    yaw: playerMotion.yaw,
    sp: playerMotion.moveSpeed,
    air: playerMotion.airborne,
    hp: v.myHp,
    inv: performance.now() < v.invincibleUntil,
  })
}

export function versusSendShot(origin: [number, number, number], dir: [number, number, number], el: ElementId) {
  if (useVersusStore.getState().phase !== 'playing') return
  send({ t: 'shot', o: origin, d: dir, el })
}

export function versusSendHit(damage: number) {
  if (useVersusStore.getState().phase !== 'playing') return
  send({ t: 'hit', d: damage })
}

// Ray-sphere test against the remote player (chest + head). Returns distance
// along the ray or null. Used by CombatSystem to know when we shot them.
export function remoteRayHit(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): number | null {
  if (!remotePlayer.active || remotePlayer.invincible) return null
  const feet = remotePlayer.y - 0.85
  const chest = sphere(ox, oy, oz, dx, dy, dz, remotePlayer.x, feet + 0.95, remotePlayer.z, 0.55)
  const head = sphere(ox, oy, oz, dx, dy, dz, remotePlayer.x, feet + 1.55, remotePlayer.z, 0.32)
  let best: number | null = null
  if (chest !== null && chest < maxDist) best = chest
  if (head !== null && head < maxDist && (best === null || head < best)) best = head
  return best
}

function sphere(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cy: number,
  cz: number,
  r: number,
): number | null {
  const lx = ox - cx
  const ly = oy - cy
  const lz = oz - cz
  const b = lx * dx + ly * dy + lz * dz
  const c = lx * lx + ly * ly + lz * lz - r * r
  const disc = b * b - c
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  return t > 0 ? t : null
}

// Dev-only debug handle for automated tests. Stripped from production builds.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__versus = {
    remotePlayer,
    playerMotion,
    useVersusStore,
    useGameStore,
    remoteRayHit,
    versusSendHit,
  }
}
