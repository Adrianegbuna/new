import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth';
import * as messagesService from './messages.service';

const router = Router();

// Send a new message
router.post('/send', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { recipientId, recipientType, subject, message, projectType } = req.body;
    const senderId = (req as any).user.id;
    const senderType = (req as any).user.accountType;

    if (!recipientId || !message) {
      return res.status(400).json({ error: 'Recipient ID and message are required' });
    }

    const newMessage = await messagesService.createMessage({
      senderId,
      senderType,
      recipientId,
      recipientType,
      subject: subject || 'New Message',
      message,
      projectType
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get inbox for authenticated user
router.get('/inbox', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messages = await messagesService.getUserInbox(userId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// Get sent messages
router.get('/sent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messages = await messagesService.getUserSentMessages(userId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    res.status(500).json({ error: 'Failed to fetch sent messages' });
  }
});

// Get single message with replies
router.get('/:messageId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messageId = req.params.messageId;

    const message = await messagesService.getMessageWithReplies(messageId, userId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Mark message as read
router.patch('/:messageId/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messageId = req.params.messageId;

    const message = await messagesService.markAsRead(messageId, userId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Reply to message
router.post('/:messageId/reply', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const messageId = req.params.messageId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const updatedMessage = await messagesService.addReply(messageId, userId, message);
    if (!updatedMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Get message count (for notifications)
router.get('/count/unread', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await messagesService.getUnreadCount(userId);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

export default router;
