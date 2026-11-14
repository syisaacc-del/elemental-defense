// 元素防线 1v1 轉接站
// 兩個玩家各自用 WebSocket 連上嚟，呢度將佢哋嘅遊戲訊息互相轉手。
// 同屋企 WiFi 版（vite.config.ts 入面嗰個）係同一套協議。

export interface Env {
  ROOMS: DurableObjectNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/') {
      return new Response('elemental-defense relay OK', { status: 200 })
    }
    if (url.pathname !== '/versus-ws') {
      return new Response('not found', { status: 404 })
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 })
    }
    // 全部房交俾同一個 Durable Object 協調（1v1 規模完全夠用）
    const id = env.ROOMS.idFromName('hub')
    return env.ROOMS.get(id).fetch(request)
  },
}

type Room = { host?: WebSocket; guest?: WebSocket }

export class RoomHub implements DurableObject {
  private rooms = new Map<string, Room>()
  private roomOf = new Map<WebSocket, string>()

  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.state.acceptWebSocket(server)
    server.addEventListener('message', (evt) => this.onMessage(server, evt))
    server.addEventListener('close', () => this.onClose(server))
    server.addEventListener('error', () => this.onClose(server))
    return new Response(null, { status: 101, webSocket: client })
  }

  private onMessage(ws: WebSocket, evt: MessageEvent) {
    let msg: { t?: string; code?: string }
    try {
      msg = JSON.parse(String(evt.data))
    } catch {
      return
    }
    if (msg.t === 'host') {
      const code = String(msg.code ?? '')
      const room = this.rooms.get(code) ?? {}
      if (room.host) {
        // 個碼撞咗，叫房主開多次
        ws.send(JSON.stringify({ t: 'err', msg: 'room-full' }))
        return
      }
      room.host = ws
      this.rooms.set(code, room)
      this.roomOf.set(ws, code)
      return
    }
    if (msg.t === 'join') {
      const code = String(msg.code ?? '')
      const room = this.rooms.get(code)
      if (!room?.host) {
        ws.send(JSON.stringify({ t: 'err', msg: 'no-room' }))
        return
      }
      if (room.guest) {
        ws.send(JSON.stringify({ t: 'err', msg: 'room-full' }))
        return
      }
      room.guest = ws
      this.roomOf.set(ws, code)
      try {
        room.host.send(JSON.stringify({ t: 'paired' }))
      } catch {
        // ignore
      }
      ws.send(JSON.stringify({ t: 'paired' }))
      return
    }
    if (msg.t === 'm') {
      const room = this.rooms.get(this.roomOf.get(ws) ?? '')
      const other = room?.host === ws ? room?.guest : room?.host
      try {
        other?.send(String(evt.data))
      } catch {
        // 對方可能啱啱斷線，忽略
      }
    }
  }

  private onClose(ws: WebSocket) {
    const code = this.roomOf.get(ws)
    if (!code) return
    this.roomOf.delete(ws)
    const room = this.rooms.get(code)
    if (!room) return
    const other = room.host === ws ? room.guest : room.host
    // 一方走咗成間房即棄置：碼即刻可以重用，對方收到 peer-left 會自己收線
    this.rooms.delete(code)
    if (other) {
      this.roomOf.delete(other)
      try {
        other.send(JSON.stringify({ t: 'peer-left' }))
      } catch {
        // ignore
      }
    }
  }
}
