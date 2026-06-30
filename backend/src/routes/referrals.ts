import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Referral, ReferralClick, ReferralOrder, ReferralPayout, ReferralStatus } from '../models/Referral';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ============================================
// USER ENDPOINTS (GET/CREATE REFERRAL CODE)
// ============================================

/**
 * Generate referral code for authenticated user
 * POST /api/referrals/generate
 */
router.post('/generate', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const userRepo = AppDataSource.getRepository(User);
    const referralRepo = AppDataSource.getRepository(Referral);

    // Check if user already has a referral code
    const existingReferral = await referralRepo.findOne({
      where: { referrerId: userId }
    });

    if (existingReferral) {
      return res.status(400).json({
        message: 'You already have a referral code',
        data: {
          referralCode: existingReferral.referralCode,
          referralLink: existingReferral.referralLink,
          status: existingReferral.status
        }
      });
    }

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate unique referral code
    const referralCode = `RZ-${user.firstName.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`;

    const referral = referralRepo.create({
      referrerId: userId,
      referralCode,
      referralLink,
      status: ReferralStatus.ACTIVE,
      totalReferred: 0,
      totalCommission: 0,
      successfulPurchases: 0
    });

    const savedReferral = await referralRepo.save(referral);

    res.status(201).json({
      message: 'Referral code generated successfully',
      data: {
        referralCode: savedReferral.referralCode,
        referralLink: savedReferral.referralLink,
        status: savedReferral.status
      }
    });
  } catch (error) {
    console.error('Generate referral code error:', error);
    res.status(500).json({ message: 'Failed to generate referral code' });
  }
});

/**
 * Get user's referral dashboard
 * GET /api/referrals/dashboard
 */
router.get('/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const referralRepo = AppDataSource.getRepository(Referral);
    const referralOrderRepo = AppDataSource.getRepository(ReferralOrder);
    const referralClickRepo = AppDataSource.getRepository(ReferralClick);

    const referral = await referralRepo.findOne({
      where: { referrerId: userId }
    });

    if (!referral) {
      return res.status(404).json({ message: 'No referral code found' });
    }

    // Get clicks
    const clicks = await referralClickRepo.find({
      where: { referralId: referral.id }
    });

    // Get referral orders
    const orders = await referralOrderRepo.find({
      where: { referralId: referral.id },
      relations: ['order']
    });

    const approvedOrders = orders.filter(o => o.status === 'approved');
    const totalEarned = approvedOrders.reduce((sum, o) => sum + parseFloat(o.commissionEarned.toString()), 0);

    res.json({
      referralCode: referral.referralCode,
      referralLink: referral.referralLink,
      status: referral.status,
      stats: {
        totalClicks: clicks.length,
        totalReferred: referral.totalReferred,
        successfulPurchases: referral.successfulPurchases,
        totalEarned: totalEarned,
        totalCommission: parseFloat(referral.totalCommission.toString()),
        pendingCommission: parseFloat(
          orders
            .filter(o => o.status === 'pending')
            .reduce((sum, o) => sum + parseFloat(o.commissionEarned.toString()), 0)
            .toString()
        )
      },
      recentOrders: orders.slice(0, 5).map(o => ({
        id: o.id,
        orderId: o.orderId,
        orderAmount: parseFloat(o.orderAmount.toString()),
        commissionEarned: parseFloat(o.commissionEarned.toString()),
        status: o.status,
        createdAt: o.createdAt
      }))
    });
  } catch (error) {
    console.error('Get referral dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch referral dashboard' });
  }
});

/**
 * Get referral order history (paginated)
 * GET /api/referrals/orders?page=1&limit=10
 */
router.get('/orders', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = (req.query.status as string) || 'all';

    const referralRepo = AppDataSource.getRepository(Referral);
    const referralOrderRepo = AppDataSource.getRepository(ReferralOrder);

    const referral = await referralRepo.findOne({
      where: { referrerId: userId }
    });

    if (!referral) {
      return res.status(404).json({ message: 'No referral code found' });
    }

    const whereClause: any = { referralId: referral.id };
    if (status !== 'all') {
      whereClause.status = status;
    }

    const [orders, total] = await referralOrderRepo.findAndCount({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['order']
    });

    res.json({
      data: orders.map(o => ({
        id: o.id,
        orderId: o.orderId,
        orderAmount: parseFloat(o.orderAmount.toString()),
        commissionRate: parseFloat(o.commissionRate.toString()),
        commissionEarned: parseFloat(o.commissionEarned.toString()),
        status: o.status,
        createdAt: o.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get referral orders error:', error);
    res.status(500).json({ message: 'Failed to fetch referral orders' });
  }
});

/**
 * Get user's statistics (for dashboard)
 * GET /api/referrals/my-stats
 */
router.get('/my-stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const userRepo = AppDataSource.getRepository(User);
    const referralRepo = AppDataSource.getRepository(Referral);
    const referralClickRepo = AppDataSource.getRepository(ReferralClick);
    const referralOrderRepo = AppDataSource.getRepository(ReferralOrder);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || !user.referralCode) {
      return res.status(404).json({ message: 'Referral code not found' });
    }

    const referral = await referralRepo.findOne({
      where: { referrerId: userId }
    });

    if (!referral) {
      return res.status(404).json({ message: 'Referral not found' });
    }

    const totalClicks = await referralClickRepo.count({ where: { referralId: referral.id } });
    const successfulPurchases = await referralOrderRepo.count({ 
      where: { referralId: referral.id, status: 'approved' } 
    });

    const approvedOrders = await referralOrderRepo.find({
      where: { referralId: referral.id, status: 'approved' }
    });

    const totalCommission = approvedOrders.reduce((sum, order) => {
      return sum + parseFloat(order.commissionEarned.toString());
    }, 0);

    const pendingOrders = await referralOrderRepo.find({
      where: { referralId: referral.id, status: 'pending' }
    });

    const pendingCommission = pendingOrders.reduce((sum, order) => {
      return sum + parseFloat(order.commissionEarned.toString());
    }, 0);

    const conversionRate = totalClicks > 0 ? (successfulPurchases / totalClicks) * 100 : 0;

    res.json({
      totalClicks,
      successfulPurchases,
      totalCommission,
      pendingCommission,
      conversionRate,
      referralCode: user.referralCode,
      referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`
    });
  } catch (error) {
    console.error('Get my stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

/**
 * Get user's payout history
 * GET /api/referrals/my-payouts
 */
router.get('/my-payouts', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const payoutRepo = AppDataSource.getRepository(ReferralPayout);

    const payouts = await payoutRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    res.json(payouts.map(p => ({
      id: p.id,
      amount: parseFloat(p.amount.toString()),
      status: p.status,
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      notes: p.notes
    })));
  } catch (error) {
    console.error('Get my payouts error:', error);
    res.status(500).json({ message: 'Failed to fetch payout history' });
  }
});

/**
 * Request a payout
 * POST /api/referrals/request-payout
 */
router.post('/request-payout', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const {
      bankAccountName,
      bankAccountNumber,
      bankName,
      bankCode,
      bankCountry,
      requestedAmount
    } = req.body;

    // Validation
    if (!bankAccountName || !bankAccountNumber || !bankName) {
      return res.status(400).json({ message: 'Bank details are required' });
    }

    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payout amount' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const referralRepo = AppDataSource.getRepository(Referral);
    const referralOrderRepo = AppDataSource.getRepository(ReferralOrder);
    const payoutRepo = AppDataSource.getRepository(ReferralPayout);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's referral
    let referral = await referralRepo.findOne({ where: { referrerId: userId } });
    
    // If no referral exists, create one (backward compatibility)
    if (!referral) {
      if (!user.referralCode) {
        return res.status(404).json({ message: 'No referral code found. Please contact support.' });
      }
      
      referral = referralRepo.create({
        referrerId: userId,
        referralCode: user.referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`,
        status: 'active' as any,
        totalReferred: 0,
        totalCommission: 0,
        successfulPurchases: 0
      });
      referral.referrer = user;
      referral = await referralRepo.save(referral);
    }

    // Calculate total commission available
    const approvedOrders = await referralOrderRepo.find({
      where: { referralId: referral.id, status: 'approved' }
    });

    const totalCommission = approvedOrders.reduce((sum, order) => {
      return sum + parseFloat(order.commissionEarned.toString());
    }, 0);

    if (totalCommission === 0) {
      return res.status(400).json({ 
        message: 'No earned commission available. Commission is available after referred orders are approved.',
        availableAmount: 0
      });
    }

    if (requestedAmount > totalCommission) {
      return res.status(400).json({ 
        message: 'Requested amount exceeds available commission',
        availableAmount: totalCommission
      });
    }

    // Update user's bank details
    user.bankAccountName = bankAccountName;
    user.bankAccountNumber = bankAccountNumber;
    user.bankName = bankName;
    user.bankCode = bankCode || user.bankCode;
    user.bankCountry = bankCountry || user.bankCountry;
    await userRepo.save(user);

    // Create payout request
    const payout = payoutRepo.create({
      referral,
      user,
      amount: requestedAmount,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      bankDetails: JSON.stringify({
        accountName: bankAccountName,
        accountNumber: bankAccountNumber,
        bankName,
        bankCode,
        bankCountry
      })
    });

    const savedPayout = await payoutRepo.save(payout);

    res.status(201).json({
      message: 'Payout request submitted successfully',
      data: {
        id: savedPayout.id,
        amount: parseFloat(savedPayout.amount.toString()),
        status: savedPayout.status,
        createdAt: savedPayout.createdAt
      }
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ message: 'Failed to create payout request' });
  }
});

// ============================================
// ADMIN ENDPOINTS (REFERRAL MANAGEMENT)
// ============================================

/**
 * Get all referrals for admin
 * GET /api/referrals/admin/all?page=1&limit=10
 */
router.get('/admin/all', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'DESC';

    const referralRepo = AppDataSource.getRepository(Referral);

    const [referrals, total] = await referralRepo.findAndCount({
      relations: ['referrer'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: sortOrder as 'ASC' | 'DESC' }
    });

    res.json({
      data: {
        data: referrals.map(r => ({
          id: r.id,
          referrerName: `${r.referrer?.firstName} ${r.referrer?.lastName}`,
          referrerEmail: r.referrer?.email,
          referralCode: r.referralCode,
          status: r.status,
          totalReferred: r.totalReferred,
          successfulPurchases: r.successfulPurchases,
          totalCommission: parseFloat(r.totalCommission.toString()),
          createdAt: r.createdAt
        })),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Failed to fetch referrals' });
  }
});

/**
 * Get referral statistics for admin
 * GET /api/referrals/admin/stats
 */
router.get('/admin/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const referralRepo = AppDataSource.getRepository(Referral);
    const referralOrderRepo = AppDataSource.getRepository(ReferralOrder);
    const referralClickRepo = AppDataSource.getRepository(ReferralClick);

    const [totalReferrals, activeReferrals, totalOrders, approvedOrders] = await Promise.all([
      referralRepo.count(),
      referralRepo.count({ where: { status: ReferralStatus.ACTIVE } }),
      referralOrderRepo.count(),
      referralOrderRepo.count({ where: { status: 'approved' } })
    ]);

    const totalClicks = await referralClickRepo.count();
    const totalCommission = await referralOrderRepo.query(
      `SELECT SUM(CAST("commissionEarned" as DECIMAL)) as total FROM referral_orders WHERE status = 'approved'`
    );

    res.json({
      data: {
        totalReferrals,
        activeReferrals,
        totalClicks,
        totalOrders,
        approvedOrders,
        totalCommission: totalCommission[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ message: 'Failed to fetch referral statistics' });
  }
});

/**
 * Get payout requests for admin
 * GET /api/referrals/admin/payouts?status=pending&page=1&limit=10
 */
router.get('/admin/payouts', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = (req.query.status as string) || 'all';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'DESC';

    const payoutRepo = AppDataSource.getRepository(ReferralPayout);

    const whereClause: any = {};
    if (status !== 'all') {
      whereClause.status = status;
    }

    const [payouts, total] = await payoutRepo.findAndCount({
      where: whereClause,
      relations: ['user', 'referral'],
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: sortOrder as 'ASC' | 'DESC' }
    });

    res.json({
      data: {
        data: payouts.map(p => ({
          id: p.id,
          user: {
            firstName: p.user?.firstName,
            lastName: p.user?.lastName,
            email: p.user?.email,
            phone: p.user?.phone,
            country: p.user?.country,
            role: p.user?.role,
            bankAccountName: p.user?.bankAccountName,
            bankAccountNumber: p.user?.bankAccountNumber,
            bankName: p.user?.bankName,
            bankCode: p.user?.bankCode,
            bankCountry: p.user?.bankCountry
          },
          amount: parseFloat(p.amount.toString()),
          status: p.status,
          paymentMethod: p.paymentMethod,
          notes: p.notes,
          createdAt: p.createdAt,
          paidAt: p.paidAt
        })),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({ message: 'Failed to fetch payouts' });
  }
});

/**
 * Get payout statistics for admin
 * GET /api/referrals/admin/payouts-stats
 */
router.get('/admin/payouts-stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const payoutRepo = AppDataSource.getRepository(ReferralPayout);

    const [pending, approved, completed, rejected] = await Promise.all([
      payoutRepo.query(
        `SELECT COUNT(*) as count, SUM(CAST(amount as DECIMAL)) as total FROM referral_payouts WHERE status = 'pending'`
      ),
      payoutRepo.query(
        `SELECT COUNT(*) as count, SUM(CAST(amount as DECIMAL)) as total FROM referral_payouts WHERE status = 'processing'`
      ),
      payoutRepo.query(
        `SELECT COUNT(*) as count, SUM(CAST(amount as DECIMAL)) as total FROM referral_payouts WHERE status = 'completed'`
      ),
      payoutRepo.query(
        `SELECT COUNT(*) as count, SUM(CAST(amount as DECIMAL)) as total FROM referral_payouts WHERE status = 'failed'`
      )
    ]);

    res.json({
      data: {
        totalPending: pending[0]?.count || 0,
        pendingAmount: pending[0]?.total || 0,
        totalApproved: approved[0]?.count || 0,
        approvedAmount: approved[0]?.total || 0,
        totalCompleted: completed[0]?.count || 0,
        completedAmount: completed[0]?.total || 0,
        totalRejected: rejected[0]?.count || 0,
        rejectedAmount: rejected[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get payout stats error:', error);
    res.status(500).json({ message: 'Failed to fetch payout statistics' });
  }
});

/**
 * Process payout request (approve/reject/complete)
 * PUT /api/referrals/admin/payouts/:id
 */
router.put('/admin/payouts/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const payoutRepo = AppDataSource.getRepository(ReferralPayout);
    const payout = await payoutRepo.findOne({ where: { id } });

    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    payout.status = status;
    if (notes) {
      payout.notes = notes;
    }
    if (status === 'completed') {
      payout.paidAt = new Date();
    }

    await payoutRepo.save(payout);

    res.json({ message: 'Payout updated successfully', data: payout });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ message: 'Failed to process payout' });
  }
});

/**
 * Track referral click
 * POST /api/referrals/track-click
 */
router.post('/track-click', async (req, res) => {
  try {
    const { referralCode, sessionId, ipAddress, userAgent } = req.body;

    const referralRepo = AppDataSource.getRepository(Referral);
    const clickRepo = AppDataSource.getRepository(ReferralClick);

    const referral = await referralRepo.findOne({
      where: { referralCode }
    });

    if (!referral) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    const click = clickRepo.create({
      referralId: referral.id,
      sessionId,
      ipAddress,
      userAgent,
      convertedToPurchase: false
    });

    await clickRepo.save(click);

    res.status(201).json({ message: 'Click tracked', data: { referralId: referral.id } });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({ message: 'Failed to track click' });
  }
});

export default router;
