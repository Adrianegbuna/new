import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { StorePayoutRequest } from '../models/StorePayoutRequest';
import { Store } from '../models/Store';
import { User } from '../models/User';

const payoutRequestRepository = AppDataSource.getRepository(StorePayoutRequest);
const storeRepository = AppDataSource.getRepository(Store);
const userRepository = AppDataSource.getRepository(User);

// Get all payout requests (Admin)
export const getAllPayoutRequests = async (req: any, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = payoutRequestRepository.createQueryBuilder('payout')
      .leftJoinAndSelect('payout.store', 'store')
      .leftJoinAndSelect('payout.user', 'user')
      .orderBy('payout.createdAt', 'DESC');

    if (status) {
      query = query.where('payout.status = :status', { status });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await query
      .skip(skip)
      .take(parseInt(limit))
      .getManyAndCount();

    // Get statistics
    const stats = await payoutRequestRepository.createQueryBuilder('payout')
      .select('COUNT(*)', 'count')
      .addSelect('payout.status', 'status')
      .addSelect('SUM(payout.amount)', 'total_amount')
      .groupBy('payout.status')
      .getRawMany();

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: {
          pending: stats.find(s => s.status === 'pending') || { count: 0, total_amount: 0 },
          approved: stats.find(s => s.status === 'approved') || { count: 0, total_amount: 0 },
          completed: stats.find(s => s.status === 'completed') || { count: 0, total_amount: 0 },
          rejected: stats.find(s => s.status === 'rejected') || { count: 0, total_amount: 0 }
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching payout requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create payout request (Vendor/Store)
export const createPayoutRequest = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { storeId, amount, bankDetails } = req.body;

    // Validate user owns store
    const store = await storeRepository.findOne({ where: { id: storeId, ownerId: userId } });
    if (!store) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Store not found' });
    }

    // Check minimum payout amount
    if (amount < 1000) {
      return res.status(400).json({ success: false, message: 'Minimum payout amount is \u20A61,000' });
    }

    const payoutRequest = payoutRequestRepository.create({
      storeId,
      userId,
      amount,
      bankDetails: JSON.stringify(bankDetails),
      status: 'pending',
      paymentMethod: 'bank_transfer'
    });

    const saved = await payoutRequestRepository.save(payoutRequest);

    res.status(201).json({
      success: true,
      message: 'Payout request created successfully',
      data: saved
    });
  } catch (error: any) {
    console.error('Error creating payout request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's payout requests  
export const getUserPayoutRequests = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { storeId, page = 1, limit = 10 } = req.query;

    let query = payoutRequestRepository.createQueryBuilder('payout')
      .where('payout.userId = :userId', { userId })
      .leftJoinAndSelect('payout.store', 'store')
      .orderBy('payout.createdAt', 'DESC');

    if (storeId) {
      query = query.andWhere('payout.storeId = :storeId', { storeId });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await query
      .skip(skip)
      .take(parseInt(limit))
      .getManyAndCount();

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching user payout requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve payout request (Admin)
export const approvePayoutRequest = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, transactionReference } = req.body;

    const payoutRequest = await payoutRequestRepository.findOne({ where: { id } });
    if (!payoutRequest) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    payoutRequest.status = 'approved';
    payoutRequest.approvedAt = new Date();
    payoutRequest.notes = notes || payoutRequest.notes;
    if (transactionReference) {
      payoutRequest.transactionReference = transactionReference;
      payoutRequest.status = 'completed';
      payoutRequest.paidAt = new Date();
    }

    const updated = await payoutRequestRepository.save(payoutRequest);

    res.json({
      success: true,
      message: 'Payout request approved',
      data: updated
    });
  } catch (error: any) {
    console.error('Error approving payout request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject payout request (Admin)
export const rejectPayoutRequest = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const payoutRequest = await payoutRequestRepository.findOne({ where: { id } });
    if (!payoutRequest) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    payoutRequest.status = 'rejected';
    payoutRequest.rejectionReason = rejectionReason;

    const updated = await payoutRequestRepository.save(payoutRequest);

    res.json({
      success: true,
      message: 'Payout request rejected',
      data: updated
    });
  } catch (error: any) {
    console.error('Error rejecting payout request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single payout request details
export const getPayoutRequestDetails = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const payoutRequest = await payoutRequestRepository.createQueryBuilder('payout')
      .where('payout.id = :id', { id })
      .leftJoinAndSelect('payout.store', 'store')
      .leftJoinAndSelect('payout.user', 'user')
      .getOne();

    if (!payoutRequest) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    // Parse bank details if it's a string
    if (payoutRequest.bankDetails && typeof payoutRequest.bankDetails === 'string') {
      (payoutRequest as any).bankDetails = JSON.parse(payoutRequest.bankDetails);
    }

    res.json({ success: true, data: payoutRequest });
  } catch (error: any) {
    console.error('Error fetching payout request details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel payout request (Vendor - only if pending)
export const cancelPayoutRequest = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const payoutRequest = await payoutRequestRepository.findOne({ where: { id } });
    if (!payoutRequest) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    if (payoutRequest.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (payoutRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending requests' });
    }

    payoutRequest.status = 'cancelled';
    const updated = await payoutRequestRepository.save(payoutRequest);

    res.json({
      success: true,
      message: 'Payout request cancelled',
      data: updated
    });
  } catch (error: any) {
    console.error('Error cancelling payout request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};




