// 元素防线 1v1 轉接站
// 兩個玩家各自用 WebSocket 連上嚟，呢度將佢哋嘅遊戲訊息互相轉手。
// 用 Durable Object hibernation：房間資料掛喺每條 WebSocket 上面，瞓醒都唔會唔記得。

export interface Env {
  ROOMS: DurableObjectNamespace
}

type Attach = { code: string; role: 'host' | 'guest' }

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
    const id = env.ROOMS.idFromName('hub')
    return env.ROOMS.get(id).fetch(request)
  },
}

export class RoomHub implements DurableObject {
  constructor(private state: DurableObjectState) {}

  async fetch(_request: Request): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.state.acceptWebSocket(server)
    return new Response(null, { status: 101, webSocket: client })
  }

  private find(code: string, role: 'host' | 'guest'): WebSocket | undefined {
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment() as Attach | null
      if (a && a.code === code && a.role === role) return ws
    }
    return undefined
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
    let msg: { t?: string; code?: string }
    try {
      msg = JSON.parse(text)
    } catch {
      return
    }

    if (msg.t === 'host') {
      const code = String(msg.code ?? '')
      if (!code) return
      if (this.find(code, 'host')) {
        ws.send(JSON.stringify({ t: 'err', msg: 'room-full' }))
        return
      }
      ws.serializeAttachment({ code, role: 'host' } satisfies Attach)
      return
    }

    if (msg.t === 'join') {
      const code = String(msg.code ?? '')
      if (!code) return
      const host = this.find(code, 'host')
      if (!host) {
        ws.send(JSON.stringify({ t: 'err', msg: 'no-room' }))
        return
      }
      if (this.find(code, 'guest')) {
        ws.send(JSON.stringify({ t: 'err', msg: 'room-full' }))
        return
      }
      ws.serializeAttachment({ code, role: 'guest' } satisfies Attach)
      try {
        host.send(JSON.stringify({ t: 'paired' }))
      } catch {
        // ignore
      }
      ws.send(JSON.stringify({ t: 'paired' }))
      return
    }

    if (msg.t === 'm') {
      const a = ws.deserializeAttachment() as Attach | null
      if (!a) return
      const other = this.find(a.code, a.role === 'host' ? 'guest' : 'host')
      try {
        other?.send(text)
      } catch {
        // 對方可能啱啱斷線
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.notifyPeerLeft(ws)
  }

  async webSocketError(ws: WebSocket) {
    this.notifyPeerLeft(ws)
  }

  private notifyPeerLeft(ws: WebSocket) {
    const a = ws.deserializeAttachment() as Attach | null
    if (!a) return
    const other = this.find(a.code, a.role === 'host' ? 'guest' : 'host')
    if (!other) return
    try {
      other.send(JSON.stringify({ t: 'peer-left' }))
    } catch {
      // ignore
    }
  }
}
