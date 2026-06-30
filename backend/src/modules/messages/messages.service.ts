import { AppDataSource } from '../../config/database';
import { Message } from '../../entities/Message';
import { v4 as uuidv4 } from 'uuid';

const messageRepository = AppDataSource.getRepository(Message);

interface CreateMessageParams {
  senderId: number;
  senderType: 'customer' | 'vendor' | 'installer';
  recipientId: number;
  recipientType: 'customer' | 'vendor' | 'installer';
  subject: string;
  message: string;
  projectType?: string;
  senderName?: string;
  senderEmail?: string;
}

export async function createMessage(params: CreateMessageParams) {
  try {
    // Get sender info from database
    let senderName = params.senderName || 'User';
    let senderEmail = params.senderEmail || '';

    // If sender info not provided, fetch from appropriate table
    if (!params.senderName || !params.senderEmail) {
      const senderQuery = AppDataSource.createQueryBuilder()
        .select()
        .from(
          params.senderType === 'installer' ? 'installers' : 'users',
          'sender'
        )
        .where('sender.id = :id', { id: params.senderId });

      const sender = await senderQuery.getRawOne();
      if (sender) {
        senderName = sender.firstName 
          ? `${sender.firstName} ${sender.lastName || ''}`.trim()
          : sender.name;
        senderEmail = sender.email;
      }
    }

    const newMessage = messageRepository.create({
      senderId: params.senderId,
      senderType: params.senderType,
      senderName,
      senderEmail,
      recipientId: params.recipientId,
      recipientType: params.recipientType,
      subject: params.subject,
      message: params.message,
      projectType: params.projectType,
      status: 'unread',
      replies: []
    });

    const saved = await messageRepository.save(newMessage);
    return saved;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

export async function getUserInbox(userId: number) {
  try {
    const messages = await messageRepository.find({
      where: {
        recipientId: userId,
        isDeleted: false
      },
      order: {
        createdAt: 'DESC'
      }
    });

    return messages.map((msg: Message) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderEmail: msg.senderEmail,
      senderType: msg.senderType,
      subject: msg.subject,
      message: msg.message,
      projectType: msg.projectType,
      status: msg.status,
      createdAt: msg.createdAt,
      replies: msg.replies || []
    }));
  } catch (error) {
    console.error('Error fetching user inbox:', error);
    throw error;
  }
}

export async function getUserSentMessages(userId: number) {
  try {
    const messages = await messageRepository.find({
      where: {
        senderId: userId,
        isDeleted: false
      },
      order: {
        createdAt: 'DESC'
      }
    });

    return messages.map((msg: Message) => ({
      id: msg.id,
      recipientId: msg.recipientId,
      recipientType: msg.recipientType,
      subject: msg.subject,
      message: msg.message,
      projectType: msg.projectType,
      status: msg.status,
      createdAt: msg.createdAt,
      replies: msg.replies || []
    }));
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    throw error;
  }
}

export async function getMessageWithReplies(messageId: string, userId: number) {
  try {
    const message = await messageRepository.findOne({
      where: {
        id: messageId,
        isDeleted: false
      }
    });

    if (!message) return null;

    // Check authorization - user must be sender or recipient
    if (message.senderId !== userId && message.recipientId !== userId) {
      return null;
    }

    return {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      senderEmail: message.senderEmail,
      senderType: message.senderType,
      recipientId: message.recipientId,
      recipientType: message.recipientType,
      subject: message.subject,
      message: message.message,
      projectType: message.projectType,
      status: message.status,
      createdAt: message.createdAt,
      replies: message.replies || []
    };
  } catch (error) {
    console.error('Error fetching message with replies:', error);
    throw error;
  }
}

export async function markAsRead(messageId: string, userId: number) {
  try {
    const message = await messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) return null;

    // Only recipient can mark as read
    if (message.recipientId !== userId) {
      return null;
    }

    message.status = 'read';
    const saved = await messageRepository.save(message);

    return {
      id: saved.id,
      senderId: saved.senderId,
      senderName: saved.senderName,
      senderEmail: saved.senderEmail,
      senderType: saved.senderType,
      subject: saved.subject,
      message: saved.message,
      projectType: saved.projectType,
      status: saved.status,
      createdAt: saved.createdAt,
      replies: saved.replies || []
    };
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

export async function addReply(messageId: string, userId: number, replyText: string) {
  try {
    const message = await messageRepository.findOne({
      where: { id: messageId }
    });

    if (!message) return null;

    // Only sender or recipient can reply
    if (message.senderId !== userId && message.recipientId !== userId) {
      return null;
    }

    // Get replier info
    let replierName = 'User';
    let replierType = message.senderId === userId ? message.senderType : message.recipientType;

    const replierQuery = AppDataSource.createQueryBuilder()
      .select()
      .from(
        replierType === 'installer' ? 'installers' : 'users',
        'replier'
      )
      .where('replier.id = :id', { id: userId });

    const replier = await replierQuery.getRawOne();
    if (replier) {
      replierName = replier.firstName 
        ? `${replier.firstName} ${replier.lastName || ''}`.trim()
        : replier.name;
    }

    // Add reply
    if (!message.replies) {
      message.replies = [];
    }

    message.replies.push({
      id: uuidv4(),
      senderId: userId,
      senderType: replierType,
      senderName: replierName,
      message: replyText,
      createdAt: new Date().toISOString()
    });

    message.status = 'replied';
    const saved = await messageRepository.save(message);

    return {
      id: saved.id,
      senderId: saved.senderId,
      senderName: saved.senderName,
      senderEmail: saved.senderEmail,
      senderType: saved.senderType,
      subject: saved.subject,
      message: saved.message,
      projectType: saved.projectType,
      status: saved.status,
      createdAt: saved.createdAt,
      replies: saved.replies || []
    };
  } catch (error) {
    console.error('Error adding reply:', error);
    throw error;
  }
}

export async function getUnreadCount(userId: number) {
  try {
    const count = await messageRepository.count({
      where: {
        recipientId: userId,
        status: 'unread',
        isDeleted: false
      }
    });
    return count;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
}
