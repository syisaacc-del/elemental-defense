import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'node:os'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { WebSocket, WebSocketServer } from 'ws'

// 區網對戰 relay：同一個 WiFi 下，手機直接連呢部電腦，
// 所有對戰訊息經呢度轉手，完全唔經互聯網（唔怕 NAT / 防火牆阻擋）。
type LanSocket = WebSocket & { roomCode?: string }

function firstLanIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(net.address)) {
        return net.address
      }
    }
  }
  return ''
}

function versusLanRelay(): Plugin {
  const rooms = new Map<string, { host?: LanSocket; guest?: LanSocket }>()

  const pairIfReady = (code: string) => {
    const room = rooms.get(code)
    if (!room?.host || !room.guest) return
    for (const ws of [room.host, room.guest]) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'paired' }))
    }
  }

  return {
    name: 'versus-lan-relay',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true })
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (!req.url?.startsWith('/versus-ws')) return
        wss.handleUpgrade(req, socket, head, (ws: LanSocket) => {
          ws.on('message', (raw) => {
            let msg: { t?: string; code?: string }
            try {
              msg = JSON.parse(String(raw))
            } catch {
              return
            }
            if (msg.t === 'host' || msg.t === 'join') {
              const code = String(msg.code ?? '')
              if (!code) return
              const room = rooms.get(code) ?? {}
              if (msg.t === 'join' && (!room.host || room.host.readyState !== WebSocket.OPEN)) {
                ws.send(JSON.stringify({ t: 'err', msg: 'no-room' }))
                return
              }
              const slot = msg.t === 'host' ? 'host' : 'guest'
              if (room[slot] && room[slot].readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ t: 'err', msg: 'room-full' }))
                return
              }
              room[slot] = ws
              ws.roomCode = code
              rooms.set(code, room)
              pairIfReady(code)
              return
            }
            if (msg.t === 'm') {
              const room = rooms.get(ws.roomCode ?? '')
              const other = room?.host === ws ? room.guest : room?.host
              if (other && other.readyState === WebSocket.OPEN) other.send(String(raw))
            }
          })
          ws.on('close', () => {
            const room = rooms.get(ws.roomCode ?? '')
            if (!room) return
            const other = room.host === ws ? room.guest : room.host
            if (other && other.readyState === WebSocket.OPEN) other.send(JSON.stringify({ t: 'peer-left' }))
            rooms.delete(ws.roomCode ?? '')
          })
        })
      })
      // 話俾個遊戲知呢部機嘅區網 IP，方便喺選單度顯示俾玩家照住開
      server.middlewares.use('/lan-info', (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ip: firstLanIp() }))
      })
    },
  }
}

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/elemental-defense/' : '/',
  plugins: [react(), tailwindcss(), versusLanRelay()],
  server: {
    host: true, // 開放俾同一個 WiFi 嘅裝置（例如手機）連入嚟玩
    watch: {
      ignored: ['**/public/models/**'],
    },
  },
})
