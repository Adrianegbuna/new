import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { ChatConversation } from '../models/ChatConversation'
import { ChatMessage } from '../models/ChatMessage'
import { messagingService } from '../services/messagingService'
import { User } from '../models/User'
import { getIO } from '../socket'
import { In, IsNull } from 'typeorm'

export const adminChatController = {
  async listConversations(req: Request, res: Response) {
    try {
      const rows = await AppDataSource.query(`
        SELECT 
          c.id,
          c."userId",
          c."sessionId",
          c.phone,
          c.status,
          c.channel,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', u."firstName", u."lastName")), ''),
            NULLIF(u.email, ''),
            NULLIF(c.phone, ''),
            'Guest User'
          ) as "displayName",
          COALESCE(NULLIF(BTRIM(m.message), ''), 'New message') as "lastMessage",
          COALESCE(m.role, 'user') as "lastMessageRole",
          COALESCE(m."createdAt", c."updatedAt") as "timestamp"
        FROM "chat_conversations" c
        LEFT JOIN "users" u ON u.id = c."userId"
        LEFT JOIN LATERAL (
          SELECT "message", "role", "createdAt"
          FROM "chat_messages"
          WHERE "conversationId" = c.id
             OR (
               "conversationId" IS NULL
               AND (
                 (c."userId" IS NOT NULL AND "userId" = c."userId")
                 OR (c."sessionId" IS NOT NULL AND "sessionId" = c."sessionId")
               )
             )
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) m ON true
        WHERE EXISTS (
          SELECT 1 FROM "chat_messages" cm
          WHERE cm."conversationId" = c.id
             OR (
               cm."conversationId" IS NULL
               AND (
                 (c."userId" IS NOT NULL AND cm."userId" = c."userId")
                 OR (c."sessionId" IS NOT NULL AND cm."sessionId" = c."sessionId")
               )
             )
        )
        ORDER BY COALESCE(m."createdAt", c."updatedAt") DESC
      `)

      return res.json({
        success: true,
        conversations: rows
      })
    } catch (error) {
      console.error('[ADMIN CHAT] listConversations error:', error)
      return res.status(500).json({ message: 'Failed to fetch conversations' })
    }
  },

  async getConversationMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params
      const conversationRepo = AppDataSource.getRepository(ChatConversation)
      const messageRepo = AppDataSource.getRepository(ChatMessage)

      const conversation = await conversationRepo.findOne({ where: { id: conversationId } })
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' })
      }

      // Build full history scope for this chat owner across all linked conversations.
      // This ensures clicking a notification always shows complete timeline for that name/user.
      const relatedConversationQuery = conversationRepo.createQueryBuilder('c').select('c.id', 'id')
      relatedConversationQuery.where('c.id = :conversationId', { conversationId })

      if (conversation.userId) {
        relatedConversationQuery.orWhere('c.userId = :userId', { userId: conversation.userId })
      }

      if (conversation.sessionId) {
        relatedConversationQuery.orWhere('c.sessionId = :sessionId', { sessionId: conversation.sessionId })
      }

      if (conversation.phone) {
        relatedConversationQuery.orWhere('c.phone = :phone', { phone: conversation.phone })
      }

      const relatedRows = await relatedConversationQuery.getRawMany()
      const relatedConversationIds = Array.from(
        new Set(
          relatedRows
            .map((row: any) => String(row?.id || row?.c_id || row?.cId || '').trim())
            .filter(Boolean)
        )
      )

      if (!relatedConversationIds.includes(conversationId)) {
        relatedConversationIds.push(conversationId)
      }

      const scopedConversationIds = Array.from(new Set(relatedConversationIds))
      const scopedMessages = await messageRepo.find({
        where: {
          conversationId: In(scopedConversationIds),
        },
        order: { createdAt: 'ASC' },
      })

      const legacyMessagesByUser = conversation.userId
        ? await messageRepo.find({
            where: {
              userId: conversation.userId,
              conversationId: IsNull(),
            },
            order: { createdAt: 'ASC' },
          })
        : []

      const legacyMessagesBySession = conversation.sessionId
        ? await messageRepo.find({
            where: {
              sessionId: conversation.sessionId,
              conversationId: IsNull(),
            },
            order: { createdAt: 'ASC' },
          })
        : []

      const merged = [...scopedMessages, ...legacyMessagesByUser, ...legacyMessagesBySession]
      const deduped = Array.from(new Map(merged.map((msg) => [String(msg.id), msg])).values())
      const messages = deduped.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return aTime - bTime
      })

      return res.json({
        success: true,
        conversationId,
        messages
      })
    } catch (error) {
      console.error('[ADMIN CHAT] getConversationMessages error:', error)
      return res.status(500).json({ message: 'Failed to fetch conversation messages' })
    }
  },

  async replyToConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params
      const { message } = req.body

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' })
      }

      const conversationRepo = AppDataSource.getRepository(ChatConversation)
      const messageRepo = AppDataSource.getRepository(ChatMessage)
      const userRepo = AppDataSource.getRepository(User)

      const conversation = await conversationRepo.findOne({ where: { id: conversationId } })
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' })
      }

      const replyingAdminId = String((req as any)?.user?.userId || '').trim() || null
      let replyingAdminName = 'Admin'
      if (replyingAdminId) {
        const adminUser = await userRepo.findOne({ where: { id: replyingAdminId } })
        if (adminUser) {
          const fullName = `${String(adminUser.firstName || '').trim()} ${String(adminUser.lastName || '').trim()}`.trim()
          replyingAdminName = fullName || String(adminUser.email || 'Admin')
        }
      }

      let customerDisplayName = 'Web User'
      if (conversation.userId) {
        const customer = await userRepo.findOne({ where: { id: conversation.userId } })
        if (customer) {
          const fullName = `${String(customer.firstName || '').trim()} ${String(customer.lastName || '').trim()}`.trim()
          customerDisplayName = fullName || String(customer.email || '').trim() || 'Web User'
        }
      } else if (conversation.phone) {
        customerDisplayName = `User ${conversation.phone}`
      }

      const adminMsg = new ChatMessage()
      adminMsg.conversationId = conversation.id
      adminMsg.role = 'human'
      adminMsg.message = message.trim()
      adminMsg.channel = conversation.channel || 'web'
      adminMsg.userId = conversation.userId || null
      adminMsg.sessionId = conversation.sessionId || null
      adminMsg.context = {
        ...(adminMsg.context || {}),
        repliedBy: {
          id: replyingAdminId,
          name: replyingAdminName,
        },
      }

      await messageRepo.save(adminMsg)

      conversation.status = 'human'
      await conversationRepo.save(conversation)

      if (conversation.channel === 'whatsapp') {
        if (!conversation.phone) {
          return res.status(400).json({ message: 'Conversation phone is missing for WhatsApp delivery' })
        }
        await messagingService.sendWhatsAppMessage(conversation.phone, adminMsg.message)
      } else {
        await messagingService.sendWebChatMessage(conversation, adminMsg.message)
      }

      try {
        getIO().to('admins').emit('new_message', {
          id: adminMsg.id,
          conversationId: conversation.id,
          userId: conversation.userId || null,
          sessionId: conversation.sessionId || null,
          displayName: customerDisplayName,
          role: 'human',
          message: adminMsg.message,
          createdAt: adminMsg.createdAt || new Date().toISOString(),
          adminId: replyingAdminId,
          adminName: replyingAdminName,
        })
      } catch (socketErr) {
        console.warn('[ADMIN CHAT] Failed to emit admin reply event:', socketErr)
      }

      return res.json({
        success: true,
        message: adminMsg
      })
    } catch (error) {
      console.error('[ADMIN CHAT] replyToConversation error:', error)
      return res.status(500).json({ message: 'Failed to send admin reply' })
    }
  }
}
