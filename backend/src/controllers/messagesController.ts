import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { SiteInquiry, InquiryStatus } from '../models/SiteInquiry';
import { AuthRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../models/Notification';
import { User, UserRole } from '../models/User';

const inquiryRepository = AppDataSource.getRepository(SiteInquiry);
const userRepository = AppDataSource.getRepository(User);

export const createInquiry = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[MESSAGES] ========== CREATE INQUIRY START ==========');
    console.log('[MESSAGES] Request body:', JSON.stringify(req.body, null, 2));
    
    const { senderName, senderEmail, senderPhone, senderType, subject, message, projectType } = req.body;

    // Validate required fields
    if (!senderName || !senderEmail || !subject || !message) {
      console.error('[MESSAGES] Validation failed - Missing fields:', {
        senderName: !!senderName,
        senderEmail: !!senderEmail,
        subject: !!subject,
        message: !!message
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('[MESSAGES] ✓ Validation passed');
    console.log('[MESSAGES] Creating new inquiry from:', senderEmail, 'subject:', subject);

    // Create new inquiry
    const inquiry = inquiryRepository.create({
      senderName,
      senderEmail,
      senderPhone: senderPhone || '',
      senderType: senderType || 'customer',
      subject,
      message,
      projectType: projectType || null,
      status: InquiryStatus.UNREAD,
    });

    console.log('[MESSAGES] Inquiry object created:', inquiry);
    
    const saved = await inquiryRepository.save(inquiry);
    console.log('[MESSAGES] ✓ Inquiry saved to database with ID:', saved.id);
    console.log('[MESSAGES] ========== CREATE INQUIRY SUCCESS ==========');

    try {
      const admins = await userRepository.find({ where: { role: UserRole.ADMIN } });
      const title = 'New customer inquiry';
      const messageText = `${senderName} (${senderType || 'customer'}) sent a new inquiry: ${subject}`;
      await Promise.all(
        admins.map((admin) =>
          NotificationService.createNotification(
            admin.id,
            NotificationType.MESSAGE,
            title,
            messageText,
            { relatedId: String(saved.id), actionUrl: '/admin/installer-inquiries' }
          )
        )
      );
    } catch (notifyError) {
      console.warn('[MESSAGES] ⚠ Failed to create admin notifications:', notifyError);
    }

    // Send confirmation email to sender
    try {
      await emailService.sendEmail({
        to: senderEmail,
        subject: 'We received your inquiry',
        html: `<p>Hi ${senderName},</p>
         <p>Thank you for contacting RenewableZmart. We have received your inquiry and will respond within 24 hours.</p>
         <p><strong>Subject:</strong> ${subject}</p>
         <p>Best regards,<br/>RenewableZmart Team</p>`
      });
      console.log('[MESSAGES] ✓ Confirmation email sent to:', senderEmail);
    } catch (emailErr) {
      console.warn('[MESSAGES] ⚠ Failed to send confirmation email:', emailErr);
    }

    // Notify admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@renewablezmart.com';
      await emailService.sendEmail({
        to: adminEmail,
        subject: `New Site Inquiry: ${subject}`,
        html: `<p>New inquiry received from ${senderName} (${senderType})</p>
         <p><strong>Email:</strong> ${senderEmail}</p>
         <p><strong>Phone:</strong> ${senderPhone || 'Not provided'}</p>
         <p><strong>Subject:</strong> ${subject}</p>
         <p><strong>Message:</strong></p>
         <p>${message}</p>
         ${projectType ? `<p><strong>Project Type:</strong> ${projectType}</p>` : ''}`
      });
      console.log('[MESSAGES] ✓ Admin notification sent to:', adminEmail);
    } catch (emailErr) {
      console.warn('[MESSAGES] ⚠ Failed to send admin notification:', emailErr);
    }

    res.status(201).json(saved);
  } catch (error) {
    console.error('[MESSAGES] ✗ Create inquiry error:', error);
    res.status(500).json({ message: 'Failed to create inquiry' });
  }
};

export const getAllInquiries = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[MESSAGES] ========== GET ALL INQUIRIES START ==========');
    console.log('[MESSAGES] User:', req.user?.email, 'Role:', req.user?.role);
    
    // Only admins can view all inquiries
    if (req.user?.role !== 'admin') {
      console.warn('[MESSAGES] ✗ Non-admin user attempted to fetch all inquiries:', req.user?.email);
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    console.log('[MESSAGES] ✓ Admin authorization passed');
    
    const inquiries = await inquiryRepository.find({
      order: { createdAt: 'DESC' },
    });

    console.log('[MESSAGES] ✓ Query executed successfully');
    console.log('[MESSAGES] Found', inquiries.length, 'inquiries');
    
    if (inquiries.length > 0) {
      console.log('[MESSAGES] Sample inquiry:', {
        id: inquiries[0].id,
        subject: inquiries[0].subject,
        senderEmail: inquiries[0].senderEmail,
        status: inquiries[0].status,
        createdAt: inquiries[0].createdAt
      });
    }
    
    console.log('[MESSAGES] ========== GET ALL INQUIRIES SUCCESS ==========');
    res.json(inquiries);
  } catch (error) {
    console.error('[MESSAGES] ✗ Get all inquiries error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries' });
  }
};

export const getInquiryById = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[MESSAGES] Get inquiry by ID:', req.params.id);
    const { id } = req.params;

    const inquiry = await inquiryRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!inquiry) {
      console.error('[MESSAGES] ✗ Inquiry not found:', id);
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Only admins or the sender can view
    if (req.user?.role !== 'admin' && inquiry.senderEmail !== req.user?.email) {
      console.warn('[MESSAGES] ✗ Unauthorized access:', req.user?.email);
      return res.status(403).json({ message: 'Forbidden' });
    }

    console.log('[MESSAGES] ✓ Inquiry retrieved:', inquiry.id);
    res.json(inquiry);
  } catch (error) {
    console.error('[MESSAGES] ✗ Get inquiry error:', error);
    res.status(500).json({ message: 'Failed to fetch inquiry' });
  }
};

export const replyToInquiry = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[MESSAGES] ========== REPLY TO INQUIRY START ==========');
    const { id } = req.params;
    // Accept both 'reply' and 'message' field names for flexibility
    const { reply, message } = req.body;
    const replyText = reply || message;

    console.log('[MESSAGES] Inquiry ID:', id);
    console.log('[MESSAGES] User:', req.user?.email, 'Role:', req.user?.role);
    console.log('[MESSAGES] Reply text length:', replyText?.length || 0);

    // Only admins can reply
    if (req.user?.role !== 'admin') {
      console.warn('[MESSAGES] ✗ Non-admin attempted to reply:', req.user?.email);
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    if (!replyText || !replyText.trim()) {
      console.error('[MESSAGES] ✗ No reply text provided');
      return res.status(400).json({ message: 'Reply message is required' });
    }

    console.log('[MESSAGES] ✓ Admin authorization and validation passed');

    const inquiry = await inquiryRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!inquiry) {
      console.error('[MESSAGES] ✗ Inquiry not found with ID:', id);
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    console.log('[MESSAGES] ✓ Inquiry found:', inquiry.id, inquiry.subject);

    inquiry.adminReply = replyText;
    inquiry.status = InquiryStatus.REPLIED;
    inquiry.repliedBy = req.user?.userId || '';

    const updated = await inquiryRepository.save(inquiry);
    console.log('[MESSAGES] ✓ Inquiry updated in database');

    try {
      const senderUser = await userRepository.findOne({ where: { email: inquiry.senderEmail } });
      if (senderUser) {
        await NotificationService.createNotification(
          senderUser.id,
          NotificationType.MESSAGE,
          'Admin replied to your message',
          `We replied to your inquiry: ${inquiry.subject}`,
          { relatedId: String(inquiry.id), actionUrl: '/messages?tab=inbox' }
        );
      }
    } catch (notifyError) {
      console.warn('[MESSAGES] ⚠ Failed to create sender notification:', notifyError);
    }

    // Send reply email to sender
    try {
      await emailService.sendEmail({
        to: inquiry.senderEmail,
        subject: `Re: ${inquiry.subject}`,
        html: `<p>Hi ${inquiry.senderName},</p>
         <p>Thank you for your inquiry. Here is our response:</p>
         <p>${replyText}</p>
         <p>Best regards,<br/>RenewableZmart Team</p>`
      });
      console.log('[MESSAGES] ✓ Reply email sent to:', inquiry.senderEmail);
    } catch (emailErr) {
      console.warn('[MESSAGES] ⚠ Failed to send reply email:', emailErr);
    }

    console.log('[MESSAGES] ========== REPLY TO INQUIRY SUCCESS ==========');
    res.json(updated);
  } catch (error) {
    console.error('[MESSAGES] ✗ Reply to inquiry error:', error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    console.log('[MESSAGES] Marking inquiry as read:', req.params.id);
    const { id } = req.params;

    // Only admins can mark as read
    if (req.user?.role !== 'admin') {
      console.warn('[MESSAGES] ✗ Non-admin attempted to mark as read:', req.user?.email);
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    const inquiry = await inquiryRepository.findOne({
      where: { id: parseInt(id) },
    });

    if (!inquiry) {
      console.error('[MESSAGES] ✗ Inquiry not found:', id);
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    inquiry.status = InquiryStatus.READ;
    const updated = await inquiryRepository.save(inquiry);

    console.log('[MESSAGES] ✓ Inquiry marked as read:', id);
    res.json(updated);
  } catch (error) {
    console.error('[MESSAGES] ✗ Mark as read error:', error);
    res.status(500).json({ message: 'Failed to update inquiry' });
  }
};

export const deleteInquiry = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Only admins can delete
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const result = await inquiryRepository.delete(parseInt(id));

    if (result.affected === 0) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({ message: 'Failed to delete inquiry' });
  }
};
