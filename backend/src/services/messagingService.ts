import axios from 'axios'
import { ChatConversation } from '../models/ChatConversation'
import { getIO } from '../socket'

export const messagingService = {
  async sendWebChatMessage(conversation: ChatConversation, message: string) {
    const io = getIO()
    const room = conversation.userId
      ? `user:${conversation.userId}`
      : conversation.sessionId
        ? `session:${conversation.sessionId}`
        : null

    if (!room) {
      console.warn('[MESSAGING] No room target for conversation:', conversation.id)
      return
    }

    io.to(room).emit('chat_message', {
      conversationId: conversation.id,
      role: 'human',
      content: message
    })
  },

  async sendWhatsAppMessage(phone: string, message: string) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials are not configured')
    }

    await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )
  }
}
