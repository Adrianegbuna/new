import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

let io: Server | null = null

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://renewable-zmart-3aam.vercel.app',
        'https://renewable-zmart.vercel.app',
        'https://renewable-zmart-3aam-git-main-vmakts-projects.vercel.app',
        'https://renewablezmart.com',
        'https://www.renewablezmart.com',
        'http://renewablezmart.com',
        'http://www.renewablezmart.com'
      ],
      credentials: true
    }
  })

  io.on('connection', (socket) => {
    socket.on('join_admin', () => {
      socket.join('admins')
    })

    socket.on('join_chat', (payload: { userId?: string; sessionId?: string }) => {
      if (payload?.userId) {
        socket.join(`user:${payload.userId}`)
      }
      if (payload?.sessionId) {
        socket.join(`session:${payload.sessionId}`)
      }
    })

    socket.on('send_message', (payload: { userId?: string; sessionId?: string; conversationId?: string; message?: string }) => {
      const message = String(payload?.message || '').trim()
      if (!message) return

      if (payload?.userId) {
        io?.to(`user:${payload.userId}`).emit('chat_message', {
          conversationId: payload?.conversationId || null,
          role: 'human',
          content: message
        })
      }

      if (payload?.sessionId) {
        io?.to(`session:${payload.sessionId}`).emit('chat_message', {
          conversationId: payload?.conversationId || null,
          role: 'human',
          content: message
        })
      }
    })
  })

  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized')
  }
  return io
}
