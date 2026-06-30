import { Router } from 'express';
import { createInquiry, getAllInquiries, getInquiryById, replyToInquiry, markAsRead, deleteInquiry } from '../controllers/messagesController';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { SiteInquiry, InquiryStatus } from '../models/SiteInquiry';

const router = Router();
const inquiryRepository = AppDataSource.getRepository(SiteInquiry);

const mapInquiryToMessage = (inquiry: SiteInquiry) => ({
  id: String(inquiry.id),
  senderId: 0,
  recipientId: 0,
  recipientName: 'Support Team',
  recipientType: 'admin',
  subject: inquiry.subject,
  message: inquiry.message,
  projectType: inquiry.projectType || 'General Message',
  status: inquiry.status,
  createdAt: inquiry.createdAt,
  replies: inquiry.adminReply
    ? [{
        id: `admin-reply-${inquiry.id}`,
        senderName: 'Support Team',
        message: inquiry.adminReply,
        createdAt: inquiry.updatedAt
      }]
    : []
});

// Public: Create inquiry (from contact form)
router.post('/inquiries', (req, res, next) => {
  console.log('[MESSAGES ROUTE] POST /inquiries called');
  console.log('[MESSAGES ROUTE] Body:', req.body);
  next();
}, createInquiry);
router.post('/', (req, res, next) => {
  console.log('[MESSAGES ROUTE] POST / called');
  console.log('[MESSAGES ROUTE] Body:', req.body);
  next();
}, createInquiry); // Alternative path

// Admin only: Get all inquiries
router.get('/admin/all', authMiddleware, adminMiddleware, getAllInquiries);

// User inbox/sent compatibility endpoints expected by frontend messages page
router.get('/inbox', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const inquiries = await inquiryRepository.find({
      where: { senderEmail: email },
      order: { createdAt: 'DESC' }
    });

    res.json(inquiries.map(mapInquiryToMessage));
  } catch (error: any) {
    console.error('[MESSAGES ROUTE] Failed to fetch inbox:', error?.message || error);
    res.status(500).json({ message: 'Failed to fetch inbox' });
  }
});

router.get('/sent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const inquiries = await inquiryRepository.find({
      where: { senderEmail: email },
      order: { createdAt: 'DESC' }
    });

    res.json(inquiries.map(mapInquiryToMessage));
  } catch (error: any) {
    console.error('[MESSAGES ROUTE] Failed to fetch sent messages:', error?.message || error);
    res.status(500).json({ message: 'Failed to fetch sent messages' });
  }
});

// Get single inquiry (admin or sender)
router.get('/inquiries/:id', authMiddleware, getInquiryById);
router.get('/:id', authMiddleware, getInquiryById); // Alternative path

// Admin: Reply to inquiry
router.post('/inquiries/:id/reply', authMiddleware, adminMiddleware, replyToInquiry);
router.post('/:id/reply', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Keep existing admin behavior unchanged
    if (req.user?.role === 'admin') {
      return replyToInquiry(req, res);
    }

    const email = req.user?.email;
    const inquiryId = parseInt(req.params.id, 10);
    const replyText = String(req.body?.message || req.body?.reply || '').trim();

    if (!email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!inquiryId || Number.isNaN(inquiryId)) {
      return res.status(400).json({ message: 'Invalid inquiry ID' });
    }
    if (!replyText) {
      return res.status(400).json({ message: 'Reply message is required' });
    }

    const originalInquiry = await inquiryRepository.findOne({ where: { id: inquiryId } });
    if (!originalInquiry || originalInquiry.senderEmail !== email) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Non-admin replies are saved as a follow-up inquiry to avoid schema changes.
    const followUp = inquiryRepository.create({
      senderName: originalInquiry.senderName,
      senderEmail: originalInquiry.senderEmail,
      senderPhone: originalInquiry.senderPhone || '',
      senderType: originalInquiry.senderType,
      subject: `Re: ${originalInquiry.subject}`,
      message: replyText,
      projectType: originalInquiry.projectType || undefined,
      status: InquiryStatus.UNREAD
    } as Partial<SiteInquiry>);

    const saved = await inquiryRepository.save(followUp as SiteInquiry);
    res.json(mapInquiryToMessage(saved));
  } catch (error: any) {
    console.error('[MESSAGES ROUTE] Failed to send reply:', error?.message || error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
}); // Alternative path

// Admin: Mark as read
router.patch('/inquiries/:id/read', authMiddleware, adminMiddleware, markAsRead);
router.patch('/:id/read', authMiddleware, adminMiddleware, markAsRead); // Alternative path

// Admin: Delete inquiry
router.delete('/inquiries/:id', authMiddleware, adminMiddleware, deleteInquiry);
router.delete('/:id', authMiddleware, adminMiddleware, deleteInquiry); // Alternative path

export default router;
