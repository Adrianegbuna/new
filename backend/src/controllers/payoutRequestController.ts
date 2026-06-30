import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { payoutRequestService } from '../services/payoutRequestService';
import { PayoutStatus, UserType } from '../models/PayoutRequest';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    adminLevel?: number;
  };
}

export class PayoutRequestController {
  async createPayoutRequest(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { bankName, accountNumber, accountHolderName, requestedAmount, bankCode } =
        req.body;

      const payoutRequest = await payoutRequestService.createPayoutRequest(
        userId,
        bankName,
        accountNumber,
        accountHolderName,
        requestedAmount,
        bankCode
      );

      return res.status(201).json({
        message: 'Payout request created successfully',
        data: payoutRequest,
      });
    } catch (error: any) {
      console.error('Create payout request error:', error);
      return res.status(400).json({ message: error.message || 'Failed to create payout request' });
    }
  }

  async getAllPayoutRequests(req: AuthRequest, res: Response) {
    try {
      // Admin only
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { userType, status, page = 1, limit = 20 } = req.query;

      const payoutRequests = await payoutRequestService.getAllPayoutRequests(
        userType as UserType | undefined,
        status as PayoutStatus | undefined,
        parseInt(page as string) || 1,
        parseInt(limit as string) || 20
      );

      return res.json({
        message: 'Payout requests retrieved successfully',
        data: payoutRequests,
      });
    } catch (error: any) {
      console.error('Get all payout requests error:', error);
      return res.status(500).json({ message: 'Failed to retrieve payout requests' });
    }
  }

  async getPayoutRequestById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payoutRequest = await payoutRequestService.getPayoutRequestById(id);

      // Users can only view their own requests, admins can view all
      if (req.user?.role !== 'admin' && payoutRequest.userId !== req.user?.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      return res.json({
        message: 'Payout request retrieved successfully',
        data: payoutRequest,
      });
    } catch (error: any) {
      console.error('Get payout request error:', error);
      return res.status(404).json({ message: 'Payout request not found' });
    }
  }

  async getUserPayoutRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const payoutRequests = await payoutRequestService.getUserPayoutRequests(userId);

      return res.json({
        message: 'User payout requests retrieved successfully',
        data: payoutRequests,
      });
    } catch (error: any) {
      console.error('Get user payout requests error:', error);
      return res.status(500).json({ message: 'Failed to retrieve payout requests' });
    }
  }

  async approvePayoutRequest(req: AuthRequest, res: Response) {
    try {
      // Admin only
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { id } = req.params;
      const { adminNotes } = req.body;

      const payoutRequest = await payoutRequestService.approvePayoutRequest(
        id,
        adminNotes
      );

      return res.json({
        message: 'Payout request approved successfully',
        data: payoutRequest,
      });
    } catch (error: any) {
      console.error('Approve payout request error:', error);
      return res.status(400).json({ message: error.message || 'Failed to approve request' });
    }
  }

  async rejectPayoutRequest(req: AuthRequest, res: Response) {
    try {
      // Admin only
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      const payoutRequest = await payoutRequestService.rejectPayoutRequest(
        id,
        rejectionReason
      );

      return res.json({
        message: 'Payout request rejected successfully',
        data: payoutRequest,
      });
    } catch (error: any) {
      console.error('Reject payout request error:', error);
      return res.status(400).json({ message: error.message || 'Failed to reject request' });
    }
  }

  async markAsProcessing(req: AuthRequest, res: Response) {
    try {
      // Admin only
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { id } = req.params;
      const payoutRequest = await payoutRequestService.markAsProcessing(id);

      return res.json({
        message: 'Payout request marked as processing',
        data: payoutRequest,
      });
    } catch (error: any) {
      console.error('Mark as processing error:', error);
      return res.status(400).json({ message: error.message || 'Failed to process request' });
    }
  }

  async markAsCompleted(req: AuthRequest, res: Response) {
    try {
      // Admin only
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { id } = req.params;
      const { transactionReference } = req.body;

      if (!transactionReference) {
        return res.status(400).json({ message: 'Transaction reference is required' });
      }

      const payoutRequest = await payoutRequestService.markAsCompleted(
        id,
        transactionReference
      );

      return res.json({
        message: 'Payout request marked as completed',
        data: payoutRequest,
      });
    } catch (error: any) {
      console.error('Mark as completed error:', error);
      return res.status(400).json({ message: error.message || 'Failed to complete request' });
    }
  }

  async cancelPayoutRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payoutRequest = await payoutRequestService.getPayoutRequestById(id);

      // Users can cancel their own pending requests, admins can cancel any
      if (
        req.user?.role !== 'admin' &&
        (payoutRequest.userId !== req.user?.userId || payoutRequest.status !== PayoutStatus.PENDING)
      ) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const updated = await payoutRequestService.cancelPayoutRequest(id);

      return res.json({
        message: 'Payout request cancelled successfully',
        data: updated,
      });
    } catch (error: any) {
      console.error('Cancel payout request error:', error);
      return res.status(400).json({ message: error.message || 'Failed to cancel request' });
    }
  }

  async getPayoutStats(req: AuthRequest, res: Response) {
    try {
      // Admin only
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const stats = await payoutRequestService.getPayoutStats();

      return res.json({
        message: 'Payout statistics retrieved successfully',
        data: stats,
      });
    } catch (error: any) {
      console.error('Get payout stats error:', error);
      return res.status(500).json({ message: 'Failed to retrieve statistics' });
    }
  }
}

export const payoutRequestController = new PayoutRequestController();
