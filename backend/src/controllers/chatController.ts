import { Request, Response } from 'express'
import chatService from '../services/chatService'
import { AppDataSource } from '../config/database'
import { ChatMessage } from '../models/ChatMessage'

interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: string
  }
}

class ChatController {
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const { message } = req.body

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'Message is required' })
      }

      const response = await chatService.sendMessage(req.user.userId, message.trim())

      return res.json({
        success: true,
        userMessage: message,
        assistantMessage: response.response,
        category: response.category,
        status: response.status
      })
    } catch (error: any) {
      console.error('Chat error:', error)
      
      // Check if it's an OpenAI API error
      if (error.status === 401) {
        return res.status(500).json({ message: 'API key not configured. Please contact support.' })
      }
      
      return res.status(500).json({ 
        message: error.message || 'Failed to process chat message',
        error: error.message 
      })
    }
  }

  async sendGuestMessage(req: Request, res: Response) {
    try {
      const { message, sessionId } = req.body

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: 'Message is required' })
      }

      if (!sessionId) {
        return res.status(400).json({ message: 'Session ID is required' })
      }

      // Use sessionId as userId for guest conversations
      const response = await chatService.sendMessage(sessionId, message.trim(), { isGuest: true } as any)

      return res.json({
        success: true,
        userMessage: message,
        assistantMessage: response.response,
        category: response.category,
        status: response.status
      })
    } catch (error: any) {
      console.error('Guest chat error:', error)
      
      if (error.status === 401) {
        return res.status(500).json({ message: 'API key not configured. Please contact support.' })
      }
      
      return res.status(500).json({ 
        message: error.message || 'Failed to process chat message',
        error: error.message 
      })
    }
  }

  async getHistory(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

      const messages = await chatService.getConversationHistory(req.user.userId, limit)
      const status = await chatService.getConversationStatus(req.user.userId)

      return res.json({
        success: true,
        status,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          message: msg.message,
          category: msg.category,
          createdAt: msg.createdAt
        }))
      })
    } catch (error: any) {
      console.error('Get history error:', error)
      return res.status(500).json({ message: 'Failed to fetch chat history' })
    }
  }

  async getGuestHistory(req: Request, res: Response) {
    try {
      const sessionId = (req.query.sessionId as string) || ''
      if (!sessionId) {
        return res.status(400).json({ message: 'Session ID is required' })
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

      const messages = await chatService.getGuestConversationHistory(sessionId, limit)
      const status = await chatService.getGuestConversationStatus(sessionId)

      return res.json({
        success: true,
        status,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          message: msg.message,
          category: msg.category,
          createdAt: msg.createdAt
        }))
      })
    } catch (error: any) {
      console.error('Get guest history error:', error)
      return res.status(500).json({ message: 'Failed to fetch guest chat history' })
    }
  }

  async clearHistory(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      await chatService.clearHistory(req.user.userId)

      return res.json({
        success: true,
        message: 'Chat history cleared'
      })
    } catch (error: any) {
      console.error('Clear history error:', error)
      return res.status(500).json({ message: 'Failed to clear chat history' })
    }
  }

  async getStats(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const stats = await chatService.getStats(req.user.userId)

      return res.json({
        success: true,
        stats
      })
    } catch (error: any) {
      console.error('Get stats error:', error)
      return res.status(500).json({ message: 'Failed to fetch chat stats' })
    }
  }
}

export default new ChatController()
