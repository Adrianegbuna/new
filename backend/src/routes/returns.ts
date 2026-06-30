import express, { Response } from 'express';
import { AppDataSource } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Return } from '../models/Return';
import { Order } from '../models/Order';
import { User, UserRole } from '../models/User';
import { emailService } from '../services/emailService';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../models/Notification';

const router = express.Router();

/**
 * @swagger
 * /api/returns/request:
 *   post:
 *     summary: Create a return request
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
router.post('/request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { orderId, reason, description, images } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ error: 'Order ID and reason required' });
    }

    const returnRepo = AppDataSource.getRepository(Return);
    const orderRepo = AppDataSource.getRepository(Order);
    const userRepo = AppDataSource.getRepository(User);

    // Verify order belongs to user
    const order = await orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get user info for email
    const user = await userRepo.findOne({ where: { id: userId } });

    // Generate RMA number
    const rmaNumber = `RMA-${Date.now()}`;

    const returnRequest = returnRepo.create({
      orderId,
      userId,
      reason,
      description,
      images,
      rmaNumber,
      status: 'requested'
    });

    await returnRepo.save(returnRequest);

    // Send confirmation email
    if (user) {
      await emailService.sendReturnRequestConfirmationEmail(
        user.email,
        user.firstName,
        {
          orderId,
          returnId: returnRequest.id,
          reason,
          rmaNumber
        }
      );

      // Create in-app notification
      if (userId) {
        try {
          await NotificationService.createNotification(
            userId,
            NotificationType.ORDER,
            '📋 Return Request Submitted',
            `Your return request (RMA: ${rmaNumber}) has been submitted. We will review it and get back to you within 3-5 business days.`,
            {
              relatedId: orderId,
              actionUrl: `/returns/${returnRequest.id}`
            }
          );
        } catch (notifError) {
          console.warn('Failed to create return request notification:', notifError);
        }
      }
    }

    // Notify admins about the new refund request
    try {
      const admins = await userRepo.find({ where: { role: UserRole.ADMIN } });
      const requesterName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : 'Customer';
      const orderRef = order?.orderNumber || orderId?.slice(0, 8);

      for (const admin of admins) {
        await NotificationService.createNotification(
          admin.id,
          NotificationType.ORDER,
          'Refund request submitted',
          `${requesterName} requested a refund for Order #${orderRef}.`,
          {
            relatedId: returnRequest.id,
            actionUrl: '/admin/payout-requests',
          }
        );
      }
    } catch (adminNotifError) {
      console.warn('Failed to notify admins of return request:', adminNotifError);
    }

    res.json({
      success: true,
      message: 'Return request submitted successfully',
      data: {
        ...returnRequest,
        rmaNumber
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create return request' });
  }
});

/**
 * @swagger
 * /api/returns:
 *   get:
 *     summary: Get user's return requests
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const returnRepo = AppDataSource.getRepository(Return);

    const returns = await returnRepo.find({
      where: { userId },
      order: { requestedAt: 'DESC' }
    });

    res.json({
      success: true,
      data: returns
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

/**
 * @swagger
 * /api/returns/{id}:
 *   get:
 *     summary: Get return request details
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const returnId = req.params.id;
    const returnRepo = AppDataSource.getRepository(Return);

    const returnRequest = await returnRepo.findOne({
      where: { id: returnId, userId }
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    res.json({
      success: true,
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch return request' });
  }
});

/**
 * @swagger
 * /api/returns/{id}/approve:
 *   patch:
 *     summary: Approve return request (Admin only)
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin (this should be verified by middleware in production)
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve returns' });
    }

    const returnId = req.params.id;
    const { refundAmount, shippingLabel, notes } = req.body;
    const returnRepo = AppDataSource.getRepository(Return);
    const userRepo = AppDataSource.getRepository(User);

    const returnRequest = await returnRepo.findOne({ where: { id: returnId } });
    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    returnRequest.status = 'approved';
    returnRequest.refundAmount = refundAmount;
    returnRequest.returnedShippingLabel = shippingLabel;
    returnRequest.adminNotes = notes;
    returnRequest.approvedBy = req.user?.userId;
    returnRequest.approvedAt = new Date();

    await returnRepo.save(returnRequest);

    // Send approval email to customer
    const customer = await userRepo.findOne({ where: { id: returnRequest.userId } });
    if (customer) {
      await emailService.sendReturnRequestConfirmationEmail(
        customer.email,
        customer.firstName,
        {
          orderId: returnRequest.orderId,
          returnId: returnRequest.id,
          reason: returnRequest.reason,
          rmaNumber: returnRequest.rmaNumber
        }
      );

      // Create in-app notification for approval
      try {
        await NotificationService.createNotification(
          returnRequest.userId,
          NotificationType.ORDER,
          '✅ Return Approved',
          `Your return request (RMA: ${returnRequest.rmaNumber}) has been approved. Please ship the item back using the provided shipping label. A refund will be processed upon receipt.`,
          {
            relatedId: returnRequest.orderId,
            actionUrl: `/returns/${returnRequest.id}`
          }
        );
      } catch (notifError) {
        console.warn('Failed to create return approval notification:', notifError);
      }
    }

    res.json({
      success: true,
      message: 'Return approved successfully',
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve return' });
  }
});

/**
 * @swagger
 * /api/returns/{id}/reject:
 *   patch:
 *     summary: Reject return request (Admin only)
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reject returns' });
    }

    const returnId = req.params.id;
    const { reason } = req.body;
    const returnRepo = AppDataSource.getRepository(Return);
    const userRepo = AppDataSource.getRepository(User);

    const returnRequest = await returnRepo.findOne({ where: { id: returnId } });
    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    returnRequest.status = 'rejected';
    returnRequest.adminNotes = reason;
    returnRequest.approvedBy = req.user?.userId;
    returnRequest.approvedAt = new Date();

    await returnRepo.save(returnRequest);

    // Send rejection email to customer
    const customer = await userRepo.findOne({ where: { id: returnRequest.userId } });
    if (customer) {
      // Create in-app notification for rejection
      try {
        await NotificationService.createNotification(
          returnRequest.userId,
          NotificationType.ORDER,
          '⏳ Return Request Status',
          `Your return request (RMA: ${returnRequest.rmaNumber}) requires additional information or has been declined.${reason ? ' Reason: ' + reason : ''}`,
          {
            relatedId: returnRequest.orderId,
            actionUrl: `/returns/${returnRequest.id}`
          }
        );
      } catch (notifError) {
        console.warn('Failed to create return rejection notification:', notifError);
      }
    }

    res.json({
      success: true,
      message: 'Return rejected',
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject return' });
  }
});

/**
 * @swagger
 * /api/returns/{id}/process-refund:
 *   patch:
 *     summary: Process refund (Admin only)
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/process-refund', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can process refunds' });
    }

    const returnId = req.params.id;
    const returnRepo = AppDataSource.getRepository(Return);
    const userRepo = AppDataSource.getRepository(User);

    const returnRequest = await returnRepo.findOne({ where: { id: returnId } });
    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    returnRequest.status = 'refunded';
    returnRequest.refundProcessed = true;

    await returnRepo.save(returnRequest);

    // Send refund processed email
    const customer = await userRepo.findOne({ where: { id: returnRequest.userId } });
    if (customer) {
      await emailService.sendRefundProcessedEmail(
        customer.email,
        customer.firstName,
        {
          orderId: returnRequest.orderId,
          amount: returnRequest.refundAmount,
          processedDate: new Date()
        }
      );

      // Create in-app notification for refund
      try {
        await NotificationService.createNotification(
          returnRequest.userId,
          NotificationType.PAYMENT,
          '💰 Refund Processed',
          `Your refund of ₦${returnRequest.refundAmount?.toLocaleString('en-NG') || 'N/A'} has been processed and will appear in your account within 3-5 business days.`,
          {
            relatedId: returnRequest.orderId,
            actionUrl: `/returns/${returnRequest.id}`
          }
        );
      } catch (notifError) {
        console.warn('Failed to create refund notification:', notifError);
      }
    }

    // TODO: Integrate with payment gateway to process actual refund
    // For now, just marking as processed

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

/**
 * @swagger
 * /api/returns/track/{rmaNumber}:
 *   get:
 *     summary: Track return by RMA number
 *     tags: [Returns]
 */
router.get('/track/:rmaNumber', async (req, res) => {
  try {
    const returnRepo = AppDataSource.getRepository(Return);

    const returnRequest = await returnRepo.findOne({
      where: { rmaNumber: req.params.rmaNumber }
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'RMA number not found' });
    }

    res.json({
      success: true,
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track return' });
  }
});

export default router;
