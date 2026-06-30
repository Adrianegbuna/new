import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Dispute, DisputePriority, DisputeStatus } from '../models/Dispute';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { adminMiddleware } from '../middleware/auth';

const router = Router();
const disputeRepo = AppDataSource.getRepository(Dispute);
const orderRepo = AppDataSource.getRepository(Order);
const userRepo = AppDataSource.getRepository(User);

const normalizePriority = (value?: string): DisputePriority => {
  const v = String(value || '').toLowerCase();
  if (v === DisputePriority.LOW) return DisputePriority.LOW;
  if (v === DisputePriority.HIGH) return DisputePriority.HIGH;
  return DisputePriority.MEDIUM;
};

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { orderId, subject, description, evidenceUrls, priority } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ message: 'subject and description are required' });
    }

    let vendorId: string | undefined;
    let orderNumber: string | undefined;

    if (orderId) {
      const order = await orderRepo.findOne({ where: { id: String(orderId) } });
      if (!order) return res.status(404).json({ message: 'Order not found' });

      const ownsOrder = String(order.userId) === req.user!.userId;
      const isVendorOnOrder = (order.items || []).some((item: any) => String(item.vendorId || '') === req.user!.userId);
      if (!ownsOrder && !isVendorOnOrder) {
        return res.status(403).json({ message: 'You cannot dispute this order' });
      }

      vendorId = (order.items || []).find((item: any) => Boolean(item.vendorId))?.vendorId;
      orderNumber = order.orderNumber || order.id;
    }

    const dispute = disputeRepo.create({
      buyerId: req.user!.userId,
      vendorId,
      orderId: orderId || undefined,
      orderNumber,
      subject: String(subject).trim(),
      description: String(description).trim(),
      evidenceUrls: Array.isArray(evidenceUrls)
        ? evidenceUrls.map((url) => String(url)).filter((url) => url.length > 0)
        : [],
      priority: normalizePriority(priority),
      status: DisputeStatus.OPEN,
    });
    const saved = await disputeRepo.save(dispute);

    res.status(201).json(saved);
  } catch (error) {
    console.error('[DISPUTE] create error:', error);
    res.status(500).json({ message: 'Failed to create dispute' });
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await userRepo.findOne({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isVendor = String(user.role).toLowerCase() === 'vendor';
    const where = isVendor ? { vendorId: req.user!.userId } : { buyerId: req.user!.userId };

    const disputes = await disputeRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    res.json(disputes);
  } catch (error) {
    console.error('[DISPUTE] my error:', error);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
});

router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const status = String(req.query.status || '').toLowerCase();
    const query = disputeRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.buyer', 'buyer')
      .leftJoinAndSelect('d.vendor', 'vendor')
      .leftJoinAndSelect('d.assignedAdmin', 'assignedAdmin')
      .orderBy('d.createdAt', 'DESC');

    if (status) {
      query.andWhere('d.status = :status', { status });
    }

    const disputes = await query.getMany();
    res.json(disputes);
  } catch (error) {
    console.error('[DISPUTE] admin/all error:', error);
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
});

router.patch('/admin/:id/status', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status, resolutionSummary, assignedAdminId } = req.body;
    const dispute = await disputeRepo.findOne({ where: { id: req.params.id } });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const normalizedStatus = String(status || '').toLowerCase() as DisputeStatus;
    if (!Object.values(DisputeStatus).includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    dispute.status = normalizedStatus;
    dispute.resolutionSummary = resolutionSummary ? String(resolutionSummary) : dispute.resolutionSummary;
    dispute.assignedAdminId = assignedAdminId || req.user!.userId;

    const saved = await disputeRepo.save(dispute);
    res.json(saved);
  } catch (error) {
    console.error('[DISPUTE] admin status error:', error);
    res.status(500).json({ message: 'Failed to update dispute status' });
  }
});

export default router;

