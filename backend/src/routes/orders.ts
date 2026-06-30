import { Router, Request, Response } from 'express';
import { createOrder, getMyOrders, getVendorOrders, getOrderById, updateOrderStatus, updatePaymentStatus, getOrderTracking, getAllOrders } from '../controllers/orderController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../models/Order';

const router = Router();

router.post('/', authMiddleware, createOrder);
router.get('/my-orders', authMiddleware, getMyOrders);
router.get('/vendor/orders', authMiddleware, getVendorOrders);

// ✅ DEBUG ENDPOINT: Check raw database count
router.get('/debug/count', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const count = await orderRepository.count();
    const ids = (await orderRepository.find()).map(o => ({ id: o.id, orderNumber: o.orderNumber }));
    
    res.json({
      message: 'Raw database count',
      totalCount: count,
      uniqueIds: ids.length,
      orders: ids,
      duplicate: count !== ids.length ? 'YES - DUPLICATES DETECTED' : 'No duplicates'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/all', authMiddleware, adminMiddleware, getAllOrders); // Admin: Get all orders
router.get('/:id', authMiddleware, getOrderById);
router.get('/:id/tracking', getOrderTracking); // Public route for tracking

// ✅ SINGLE SOURCE OF TRUTH: PATCH /orders/:id/status
router.patch('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);
router.patch('/:id/payment-status', authMiddleware, updatePaymentStatus); // Admin: Update payment status

export default router;
