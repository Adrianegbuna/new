import { Router } from 'express';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { User, AdminLevel, UserRole } from '../models/User';
import { Order } from '../models/Order';
import { ServiceRequest } from '../models/ServiceRequest';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { InstallmentPayment } from '../models/InstallmentPayment';
import { Category } from '../models/Category';
import { SubCategory } from '../models/SubCategory';
import { UserAddress } from '../models/UserAddress';
import { Wishlist } from '../models/Wishlist';
import { ChatMessage } from '../models/ChatMessage';
import { ChatConversation } from '../models/ChatConversation';
import { Review } from '../models/Review';
import { TradeIn } from '../models/TradeIn';
import { ResaleProduct } from '../models/ResaleProduct';
import { PayoutRequest } from '../models/PayoutRequest';
import { StorePayoutRequest } from '../models/StorePayoutRequest';
import { InstallmentApplication } from '../models/InstallmentApplication';
import { Return } from '../models/Return';
import { Package } from '../models/Package';
import { InstallerProject } from '../models/InstallerProject';
import { InstallerQuotation } from '../models/InstallerQuotation';
import { InstallerJob } from '../models/InstallerJob';
import { InstallerServicePackage } from '../models/InstallerServicePackage';
import { Referral, ReferralPayout, ReferralClick, ReferralOrder } from '../models/Referral';
import { ServiceNotification, ServiceRequestUpdate } from '../models/ServiceRequest';
import { Notification } from '../models/Notification';
import { Dispute } from '../models/Dispute';
import { authenticate } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../models/Notification';
import bcrypt from 'bcrypt';
import { adminChatController } from '../controllers/adminChatController';
import { adminServiceRequestController } from '../controllers/serviceRequestController';
import { AdminAuditLog } from '../models/AdminAuditLog';

const router = Router();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware to check if user is admin
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.userId } });

    const normalizedRole = String(user?.role || '').toLowerCase();
    const normalizedAccountType = String(user?.accountType || '').toLowerCase();
    const normalizedAdminLevel = String(user?.adminLevel || '').toUpperCase();
    const isAdminLike =
      normalizedRole === 'admin' &&
      (normalizedAccountType === 'admin' || normalizedAdminLevel.startsWith('SA') || !normalizedAdminLevel);

    if (!isAdminLike) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    return next();
  } catch (error) {
    console.error('Admin guard error:', error);
    return res.status(500).json({ message: 'Error checking admin access' });
  }
};

// Middleware to check if user is SA00 (Super Admin)
const isSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.userId } });
    
    if (user && user.adminLevel === AdminLevel.SA00) {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Super Admin (SA00) only.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking admin level' });
  }
};

const normalizeAdminEmail = (value: unknown) => String(value || '').trim().toLowerCase();

const getOldestAdmin = async () => {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.findOne({
    where: { role: UserRole.ADMIN },
    order: { createdAt: 'ASC' },
  });
};

const isProtectedPrimaryAdmin = async (adminId: string) => {
  const oldestAdmin = await getOldestAdmin();
  return Boolean(oldestAdmin && String(oldestAdmin.id) === String(adminId));
};

// ===== ADMIN CHAT ROUTES =====
router.get('/conversations', authenticate, isAdmin, adminChatController.listConversations);
router.get('/conversations/:conversationId/messages', authenticate, isAdmin, adminChatController.getConversationMessages);
router.post('/conversations/:conversationId/reply', authenticate, isAdmin, adminChatController.replyToConversation);

// Service requests (alias for admin listing)
router.get('/service-requests', authenticate, isAdmin, adminServiceRequestController.getAllServiceRequests);

// Admin audit logs
router.get('/audit-logs', authenticate, isAdmin, async (req, res) => {
  try {
    const auditRepo = AppDataSource.getRepository(AdminAuditLog);
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const logs = await auditRepo.find({
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      take: Number.isFinite(limit) ? limit : 100,
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

// Get all users
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find({
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'phone',
        'country',
        'city',
        'role',
        'accountType',
        'adminLevel',
        'isVerified',
        'verificationStatus',
        'verifiedBy',
        'verifiedAt',
        'createdAt',
      ]
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  const targetUserId = String(req.params.id || '').trim();
  const deletionSummary: Record<string, number> = {};
  const count = (key: string, affected?: number | null) => {
    deletionSummary[key] = Number(affected || 0);
  };

  const queryRunner = AppDataSource.createQueryRunner();
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const manager = queryRunner.manager;
    const userRepo = manager.getRepository(User);
    const user = await userRepo.findOne({ where: { id: targetUserId } });

    if (!user) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    const targetRole = String(user.role || '').toLowerCase();
    const targetAdminLevel = String(user.adminLevel || '').toUpperCase();
    const protectedSa00 =
      targetAdminLevel === 'SA00' || String(user.email || '').trim().toLowerCase() === 'sa00@renewablezmart.com';

    // Prevent deleting admin users and especially SA00 super admin.
    if (protectedSa00) {
      await queryRunner.rollbackTransaction();
      return res.status(403).json({ message: 'Cannot delete SA00 super admin account' });
    }
    if (targetRole === 'admin') {
      await queryRunner.rollbackTransaction();
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    const stores = await manager.getRepository(Store).find({
      select: ['id'],
      where: { ownerId: targetUserId },
    });
    const storeIds = stores.map((s) => String(s.id)).filter(Boolean);

    const userOrders = await manager.getRepository(Order).find({
      select: ['id'],
      where: { userId: targetUserId },
    });
    const orderIds = userOrders.map((o) => String(o.id)).filter(Boolean);

    count('userAddresses', (await manager.getRepository(UserAddress).delete({ userId: targetUserId })).affected);
    count('wishlists', (await manager.getRepository(Wishlist).delete({ userId: targetUserId })).affected);
    count('notifications', (await manager.getRepository(Notification).delete({ userId: targetUserId })).affected);
    count('chatMessages', (await manager.getRepository(ChatMessage).delete({ userId: targetUserId })).affected);
    count('chatConversations', (await manager.getRepository(ChatConversation).delete({ userId: targetUserId })).affected);
    count('reviews', (await manager.getRepository(Review).delete({ userId: targetUserId })).affected);
    count('tradeIns', (await manager.getRepository(TradeIn).delete({ userId: targetUserId })).affected);
    count('resaleProducts', (await manager.getRepository(ResaleProduct).delete({ userId: targetUserId })).affected);
    count('payoutRequests', (await manager.getRepository(PayoutRequest).delete({ userId: targetUserId })).affected);
    count('storePayoutRequestsByUser', (await manager.getRepository(StorePayoutRequest).delete({ userId: targetUserId })).affected);
    count('installmentApplications', (await manager.getRepository(InstallmentApplication).delete({ userId: targetUserId })).affected);
    count('installmentPayments', (await manager.getRepository(InstallmentPayment).delete({ userId: targetUserId })).affected);

    count(
      'installerQuotations',
      (
        await manager
          .getRepository(InstallerQuotation)
          .createQueryBuilder()
          .delete()
          .where('installerId = :uid OR customerId = :uid', { uid: targetUserId })
          .execute()
      ).affected
    );
    count(
      'installerJobs',
      (
        await manager
          .getRepository(InstallerJob)
          .createQueryBuilder()
          .delete()
          .where('installerId = :uid OR customerId = :uid', { uid: targetUserId })
          .execute()
      ).affected
    );
    count('installerProjects', (await manager.getRepository(InstallerProject).delete({ installerId: targetUserId })).affected);
    count('installerServicePackages', (await manager.getRepository(InstallerServicePackage).delete({ installerId: targetUserId })).affected);

    count('serviceNotifications', (await manager.getRepository(ServiceNotification).delete({ userId: targetUserId })).affected);
    count(
      'serviceRequestUpdates',
      (await manager.getRepository(ServiceRequestUpdate).createQueryBuilder().delete().where('updatedBy = :uid', { uid: targetUserId }).execute()).affected
    );
    count(
      'serviceRequestsAssignedCleared',
      (await manager.getRepository(ServiceRequest).createQueryBuilder().update().set({ assignedTo: null }).where('assignedTo = :uid', { uid: targetUserId }).execute())
        .affected
    );
    count('serviceRequests', (await manager.getRepository(ServiceRequest).delete({ userId: targetUserId })).affected);

    count(
      'referralClicks',
      (await manager.getRepository(ReferralClick).createQueryBuilder().delete().where('referredUserId = :uid', { uid: targetUserId }).execute()).affected
    );
    count('referralPayouts', (await manager.getRepository(ReferralPayout).delete({ userId: targetUserId })).affected);
    count('referrals', (await manager.getRepository(Referral).delete({ referrerId: targetUserId })).affected);

    count(
      'disputes',
      (
        await manager
          .getRepository(Dispute)
          .createQueryBuilder()
          .delete()
          .where('buyerId = :uid OR vendorId = :uid', { uid: targetUserId })
          .execute()
      ).affected
    );
    count('adminAuditLogs', (await manager.getRepository(AdminAuditLog).delete({ actorUserId: targetUserId })).affected);

    if (orderIds.length > 0) {
      count(
        'referralOrders',
        (
          await manager
            .getRepository(ReferralOrder)
            .createQueryBuilder()
            .delete()
            .where('orderId IN (:...orderIds)', { orderIds })
            .execute()
        ).affected
      );
      count(
        'returnsByOrder',
        (
          await manager
            .getRepository(Return)
            .createQueryBuilder()
            .delete()
            .where('orderId IN (:...orderIds)', { orderIds })
            .execute()
        ).affected
      );
      count('orders', (await manager.getRepository(Order).delete({ userId: targetUserId })).affected);
    } else {
      count('orders', (await manager.getRepository(Order).delete({ userId: targetUserId })).affected);
      count('returnsByOrder', 0);
      count('referralOrders', 0);
    }

    count('returnsByUser', (await manager.getRepository(Return).delete({ userId: targetUserId })).affected);

    if (storeIds.length > 0) {
      count(
        'storePayoutRequestsByStore',
        (
          await manager
            .getRepository(StorePayoutRequest)
            .createQueryBuilder()
            .delete()
            .where('storeId IN (:...storeIds)', { storeIds })
            .execute()
        ).affected
      );
      count(
        'products',
        (
          await manager
            .getRepository(Product)
            .createQueryBuilder()
            .delete()
            .where('storeId IN (:...storeIds)', { storeIds })
            .execute()
        ).affected
      );
      count(
        'packages',
        (
          await manager
            .getRepository(Package)
            .createQueryBuilder()
            .delete()
            .where('storeId IN (:...storeIds)', { storeIds })
            .execute()
        ).affected
      );
      count('stores', (await manager.getRepository(Store).delete({ ownerId: targetUserId })).affected);
    } else {
      count('storePayoutRequestsByStore', 0);
      count('products', 0);
      count('packages', 0);
      count('stores', 0);
    }

    count('user', (await userRepo.delete({ id: targetUserId })).affected);

    await queryRunner.commitTransaction();
    return res.json({
      message: 'User and related data deleted successfully',
      deletedUserId: targetUserId,
      summary: deletionSummary,
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Failed to delete user and related data' });
  } finally {
    await queryRunner.release();
  }
});

// Get all orders (enriched with customer and store data)
router.get('/orders', authenticate, isAdmin, async (req, res) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const orders = await orderRepo.find({
      order: { createdAt: 'DESC' }
    });

    // Enrich orders with full details for admin dashboard
    const enrichedOrders = orders.map(order => {
      // Extract store info from first item if store is not fully populated
      const firstItem = (order.items && order.items.length > 0) ? order.items[0] : null;
      const storeInfo = order.store || {
        id: firstItem?.vendorId || '',
        name: firstItem?.storeName || 'Unknown Store',
        location: firstItem?.storeCity || '',
        city: firstItem?.storeCity || '',
        email: '',
        phone: ''
      };

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        customerName: order.buyer?.fullName || 'Unknown',
        customer: {
          id: order.buyer?.id || '',
          fullName: order.buyer?.fullName || 'Unknown',
          email: order.buyer?.email || '',
          phone: order.buyer?.phone || '',
          address: order.buyer?.address || '',
          city: order.buyer?.city || '',
          state: order.buyer?.state || '',
          postalCode: order.buyer?.postalCode || ''
        },
        store: {
          id: storeInfo.id || '',
          name: storeInfo.name || 'Unknown Store',
          location: storeInfo.location || '',
          city: storeInfo.city || '',
          email: storeInfo.email || '',
          phone: storeInfo.phone || ''
        },
        items: order.items || [],
        total: order.total ?? order.totalPrice,
        totalPrice: order.totalPrice ?? order.total,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    res.json(enrichedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});


// ============================================
// ✅ CONSOLIDATED: Use /api/orders/:id/status instead
// ============================================
// Status updates are now handled through the main orders API
// endpoint: PATCH /api/orders/:id/status
// This is the single source of truth for order status

// Mark order for delivery
// Delete order (admin one-by-one)
router.delete('/orders/:id', authenticate, isAdmin, async (req, res) => {
  const orderId = String(req.params.id || '').trim();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const manager = queryRunner.manager;
    const orderRepo = manager.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    const tableExists = async (tableName: string) => {
      const rows = await manager.query('SELECT to_regclass($1) AS exists_name', [tableName]);
      return Boolean(rows?.[0]?.exists_name);
    };

    // Clean dependencies safely (only if those tables exist in this DB).
    if (await tableExists('returns')) {
      await manager.getRepository(Return).delete({ orderId });
    }
    if (await tableExists('referral_orders')) {
      await manager.getRepository(ReferralOrder).delete({ orderId });
    }
    if (await tableExists('installment_payments')) {
      await manager.query('UPDATE installment_payments SET order_id = NULL, "orderId" = NULL WHERE order_id = $1 OR "orderId" = $1', [orderId]);
    }
    if (await tableExists('installment_applications')) {
      await manager.query('UPDATE installment_applications SET "orderId" = NULL WHERE "orderId" = $1', [orderId]);
    }
    if (await tableExists('disputes')) {
      await manager.query('UPDATE disputes SET "orderId" = NULL, "orderNumber" = NULL WHERE "orderId" = $1', [orderId]);
    }

    await manager.getRepository(Order).delete({ id: orderId });

    await queryRunner.commitTransaction();
    return res.json({ message: 'Order deleted successfully', deletedOrderId: orderId });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Error deleting order:', error);
    const message = (error as any)?.message || 'Failed to delete order';
    return res.status(500).json({ message });
  } finally {
    await queryRunner.release();
  }
});

// Update user verification state
router.patch('/users/:id', authenticate, isAdmin, async (req: any, res) => {
  try {
    const targetUserId = String(req.params.id || '').trim();
    const { isVerified } = req.body || {};

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({ message: 'isVerified must be boolean' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const storeRepo = AppDataSource.getRepository(Store);
    const user = await userRepo.findOne({ where: { id: targetUserId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = isVerified;
    user.verifiedBy = isVerified ? req.user.userId : null;
    user.verifiedAt = isVerified ? new Date() : null;
    await userRepo.save(user);

    // Keep owned stores aligned for any legacy pages still reading store.isVerified.
    await storeRepo.update(
      { ownerId: targetUserId },
      {
        isVerified,
        verifiedBy: isVerified ? req.user.userId : (null as any),
        verifiedAt: isVerified ? new Date() : (null as any),
      }
    );

    return res.json({
      success: true,
      message: `User marked as ${isVerified ? 'verified' : 'unverified'}`,
      data: {
        id: user.id,
        isVerified: user.isVerified,
        verifiedBy: user.verifiedBy,
        verifiedAt: user.verifiedAt,
      },
    });
  } catch (error: any) {
    console.error('Error updating user verification state:', error);
    return res.status(500).json({ message: 'Failed to update verification status' });
  }
});

router.patch('/orders/:id/mark-delivery', authenticate, isAdmin, async (req, res) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    
    const order = await orderRepo.findOne({ where: { id: req.params.id }, relations: ['user'] });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.markedForDelivery = true;
    order.orderStatus = 'shipped'; // Update to use new field
    if (!order.shippedAt) {
      order.shippedAt = new Date();
    }
    await orderRepo.save(order);

    const buyerEmail = order.buyerDetails?.email || order.buyer?.email || order.user?.email || '';
    const buyerName = order.buyerDetails?.name || order.buyer?.fullName || order.user?.firstName || 'Customer';

    if (buyerEmail) {
      emailService.sendShippedEmail(buyerEmail, buyerName, {
        orderNumber: order.orderNumber || order.id,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        estimatedDelivery: order.estimatedDelivery,
      }).catch((err) => console.warn('[EMAIL] Shipped email failed:', err?.message || err));
    }

    res.json({ message: 'Order marked for delivery', order });
  } catch (error) {
    console.error('Error marking order for delivery:', error);
    res.status(500).json({ message: 'Failed to mark order for delivery' });
  }
});

// Get all products
router.get('/products', authenticate, isAdmin, async (req, res) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const products = await productRepo.find({
      relations: ['store']
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Get pending products for approval
router.get('/products/pending', authenticate, isAdmin, async (req, res) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const pendingProducts = await productRepo.find({
      where: { approvalStatus: 'pending' },
      relations: ['store'],
      order: { createdAt: 'DESC' }
    });

    res.json(pendingProducts);
  } catch (error) {
    console.error('Error fetching pending products:', error);
    res.status(500).json({ message: 'Failed to fetch pending products' });
  }
});

// Delete product
router.delete('/products/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const product = await productRepo.findOne({ where: { id: req.params.id } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await productRepo.remove(product);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});

// Delete resale listing (admin one-by-one)
router.delete('/resales/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const resaleRepo = AppDataSource.getRepository(ResaleProduct);
    const resale = await resaleRepo.findOne({ where: { id: req.params.id } });

    if (!resale) {
      return res.status(404).json({ message: 'Resale listing not found' });
    }

    await resaleRepo.delete({ id: String(req.params.id) });
    return res.json({ message: 'Resale listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting resale listing:', error);
    return res.status(500).json({ message: 'Failed to delete resale listing' });
  }
});

// Delete trade-in listing (admin one-by-one)
router.delete('/trade-ins/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const tradeInRepo = AppDataSource.getRepository(TradeIn);
    const tradeIn = await tradeInRepo.findOne({ where: { id: req.params.id } });

    if (!tradeIn) {
      return res.status(404).json({ message: 'Trade-in listing not found' });
    }

    await tradeInRepo.delete({ id: String(req.params.id) });
    return res.json({ message: 'Trade-in listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting trade-in listing:', error);
    return res.status(500).json({ message: 'Failed to delete trade-in listing' });
  }
});

// Get all stores
router.get('/stores', authenticate, isAdmin, async (req, res) => {
  try {
    const storeRepo = AppDataSource.getRepository(Store);
    const stores = await storeRepo.find();

    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ message: 'Failed to fetch stores' });
  }
});

// Delete store
router.delete('/stores/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const storeRepo = AppDataSource.getRepository(Store);
    const store = await storeRepo.findOne({ where: { id: req.params.id } });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    await storeRepo.remove(store);
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ message: 'Failed to delete store' });
  }
});

// Get platform statistics (admin only)
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const orderRepo = AppDataSource.getRepository(Order);
    const productRepo = AppDataSource.getRepository(Product);
    const storeRepo = AppDataSource.getRepository(Store);

    const [totalUsers, totalOrders, totalProducts, totalStores] = await Promise.all([
      userRepo.count(),
      orderRepo.count(),
      productRepo.count(),
      storeRepo.count()
    ]);

    const orders = await orderRepo.find();
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    const users = await userRepo.find();
    const totalVendors = users.filter(u => u.role === UserRole.VENDOR).length;
    const totalInstallers = users.filter(u => u.role === UserRole.INSTALLER).length;
    const totalCustomers = users.filter(u => u.role === UserRole.CUSTOMER).length;

    res.json({
      totalUsers,
      totalVendors,
      totalInstallers,
      totalCustomers,
      totalOrders,
      totalRevenue,
      totalProducts,
      totalStores
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Public stats endpoint (no authentication required)
router.get('/stats/public', async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const productRepo = AppDataSource.getRepository(Product);
    const storeRepo = AppDataSource.getRepository(Store);

    const [approvedProducts, totalVendors, totalInstallers, totalCustomers, totalStores] = await Promise.all([
      productRepo.count({ where: { approvalStatus: 'approved' } }),
      userRepo.count({ where: { role: UserRole.VENDOR } }),
      userRepo.count({ where: { accountType: 'installer' } }),
      userRepo.count({ where: { role: UserRole.CUSTOMER } }),
      storeRepo.count()
    ]);

    res.json({
      products: approvedProducts,
      vendors: totalVendors,
      installers: totalInstallers,
      customers: totalCustomers,
      stores: totalStores
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// SA00 ONLY: Change admin password
router.post('/change-password/:userId', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { userId } = req.params;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await userRepo.save(user);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

// SA00 ONLY: Create new admin account
router.post('/create-admin', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, adminLevel = 'SA20', country = 'Nigeria', city = 'Lagos' } = req.body;
    const normalizedEmail = normalizeAdminEmail(email);
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim() || 'Admin';

    // Validation
    if (!normalizedEmail || !password || !normalizedFirstName) {
      return res.status(400).json({ message: 'Email, password, and firstName are required' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Validate admin level
    const validAdminLevels = ['SA00', 'SA10', 'SA20'];
    if (!validAdminLevels.includes(adminLevel)) {
      return res.status(400).json({ message: 'Invalid admin level. Must be SA00, SA10, or SA20' });
    }

    const userRepo = AppDataSource.getRepository(User);

    // Check if email already exists
    const existingUser = await userRepo.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      const existingIsAdmin =
        String(existingUser.role || '').toLowerCase() === 'admin' ||
        String(existingUser.accountType || '').toLowerCase() === 'admin' ||
        String(existingUser.adminLevel || '').toUpperCase().startsWith('SA');

      if (existingIsAdmin) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      // Upgrade existing non-admin account to admin so the email can be reused for admin access.
      existingUser.password = await bcrypt.hash(password, 10);
      existingUser.firstName = normalizedFirstName;
      existingUser.lastName = normalizedLastName;
      existingUser.role = UserRole.ADMIN;
      existingUser.adminLevel = adminLevel as AdminLevel;
      existingUser.accountType = 'admin';
      existingUser.country = String(country || 'Nigeria').trim() || 'Nigeria';
      existingUser.city = String(city || 'Lagos').trim() || 'Lagos';
      existingUser.isVerified = true;
      existingUser.verifiedAt = new Date();

      const upgradedAdmin = await userRepo.save(existingUser);

      return res.status(201).json({
        message: 'Existing user upgraded to admin successfully',
        admin: {
          id: upgradedAdmin.id,
          email: upgradedAdmin.email,
          firstName: upgradedAdmin.firstName,
          lastName: upgradedAdmin.lastName,
          role: upgradedAdmin.role,
          adminLevel: upgradedAdmin.adminLevel,
          accountType: upgradedAdmin.accountType,
        }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = userRepo.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      role: UserRole.ADMIN,
      adminLevel: adminLevel as AdminLevel,
      accountType: 'admin',
      country: String(country || 'Nigeria').trim() || 'Nigeria',
      city: String(city || 'Lagos').trim() || 'Lagos',
      isVerified: true, // Auto-verify admin accounts
      verifiedAt: new Date(),
    });

    const savedAdmin = await userRepo.save(admin);

    res.status(201).json({
      message: 'Admin account created successfully',
      admin: {
        id: savedAdmin.id,
        email: savedAdmin.email,
        firstName: savedAdmin.firstName,
        lastName: savedAdmin.lastName,
        role: savedAdmin.role,
        adminLevel: savedAdmin.adminLevel,
        accountType: savedAdmin.accountType,
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Failed to create admin account' });
  }
});

// SA00 ONLY: Edit existing admin account
router.patch('/admins/:adminId', authenticate, isSuperAdmin, async (req: any, res) => {
  try {
    const { adminId } = req.params;
    const {
      email,
      firstName,
      lastName,
      adminLevel,
      country,
      city,
      password,
    } = req.body || {};

    const userRepo = AppDataSource.getRepository(User);
    const admin = await userRepo.findOne({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    if (admin.role !== UserRole.ADMIN) {
      return res.status(400).json({ message: 'Target user is not an admin account' });
    }

    if (await isProtectedPrimaryAdmin(adminId)) {
      return res.status(403).json({ message: 'Primary admin account cannot be edited' });
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeAdminEmail(email);
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
      const existing = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (existing && String(existing.id) !== String(adminId)) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      admin.email = normalizedEmail;
    }

    if (firstName !== undefined) {
      const nextFirstName = String(firstName || '').trim();
      if (!nextFirstName) {
        return res.status(400).json({ message: 'First name cannot be empty' });
      }
      admin.firstName = nextFirstName;
    }
    if (lastName !== undefined) {
      const nextLastName = String(lastName || '').trim();
      admin.lastName = nextLastName || admin.lastName || 'Admin';
    }
    if (country !== undefined) {
      admin.country = String(country || '').trim();
    }
    if (city !== undefined) {
      admin.city = String(city || '').trim();
    }
    if (adminLevel !== undefined) {
      const validAdminLevels = ['SA00', 'SA10', 'SA20'];
      if (!validAdminLevels.includes(String(adminLevel))) {
        return res.status(400).json({ message: 'Invalid admin level. Must be SA00, SA10, or SA20' });
      }
      admin.adminLevel = adminLevel as AdminLevel;
    }
    if (password !== undefined && String(password).trim() !== '') {
      if (String(password).length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      admin.password = await bcrypt.hash(String(password), 10);
    }

    await userRepo.save(admin);

    res.json({
      message: 'Admin account updated successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        adminLevel: admin.adminLevel,
        country: admin.country,
        city: admin.city,
      },
    });
  } catch (error) {
    console.error('Error updating admin account:', error);
    res.status(500).json({ message: 'Failed to update admin account' });
  }
});

// SA00 ONLY: Delete admin account
router.delete('/admins/:adminId', authenticate, isSuperAdmin, async (req: any, res) => {
  try {
    const { adminId } = req.params;

    if (String(req.user?.userId || '') === String(adminId)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const admin = await userRepo.findOne({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ message: 'Admin account not found' });
    }
    if (admin.role !== UserRole.ADMIN) {
      return res.status(400).json({ message: 'Target user is not an admin account' });
    }

    if (await isProtectedPrimaryAdmin(adminId)) {
      return res.status(403).json({ message: 'Primary admin account cannot be deleted' });
    }

    await userRepo.remove(admin);
    res.json({ message: 'Admin account deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin account:', error);
    res.status(500).json({ message: 'Failed to delete admin account' });
  }
});

// SA00 ONLY: Approve PaySmallSmall request
router.post('/approve-paysmallsmall/:orderId', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { approved } = req.body;

    const orderRepo = AppDataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Add paySmallSmallApproved field logic here
    res.json({ 
      message: approved ? 'PaySmallSmall approved' : 'PaySmallSmall rejected',
      orderId 
    });
  } catch (error) {
    console.error('Error approving PaySmallSmall:', error);
    res.status(500).json({ message: 'Failed to approve PaySmallSmall' });
  }
});

// SA00 ONLY: Approve financial transaction
router.post('/approve-financial/:transactionId', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { approved, amount } = req.body;

    res.json({ 
      message: approved ? 'Financial transaction approved' : 'Financial transaction rejected',
      transactionId,
      amount 
    });
  } catch (error) {
    console.error('Error approving financial transaction:', error);
    res.status(500).json({ message: 'Failed to approve financial transaction' });
  }
});

// SA10/SA20: Approve product for display
router.post('/approve-product/:productId', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { productId } = req.params;
    const { approved } = req.body;

    const productRepo = AppDataSource.getRepository(Product);
    const product = await productRepo.findOne({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get admin info
    const userRepo = AppDataSource.getRepository(User);
    const admin = await userRepo.findOne({ where: { id: req.user.userId } });

    // Update product approval status
    product.approvalStatus = approved ? 'approved' : 'rejected';
    product.approvedBy = admin?.id || '';
    product.approvedAt = new Date();
    await productRepo.save(product);

    res.json({ 
      message: approved ? 'Product approved for display' : 'Product rejected',
      productId,
      approvalStatus: product.approvalStatus
    });
  } catch (error) {
    console.error('Error approving product:', error);
    res.status(500).json({ message: 'Failed to approve product' });
  }
});

// Get current admin info including level
router.get('/me', authenticate, isAdmin, async (req: any, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ 
      where: { id: req.user.userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'adminLevel']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching admin info:', error);
    res.status(500).json({ message: 'Failed to fetch admin info' });
  }
});

// ===== VENDOR VERIFICATION ROUTES =====

// Get all vendors pending verification
router.get('/vendors/pending', authenticate, isAdmin, async (req: any, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const vendors = await userRepo.find({
      where: { 
        role: UserRole.VENDOR,
        verificationStatus: 'pending'
      },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'country', 'city', 'businessName', 'businessRegNumber', 'createdAt', 'verificationStatus', 'interestedInPaySmallSmall']
    });

    res.json(vendors);
  } catch (error) {
    console.error('Error fetching pending vendors:', error);
    res.status(500).json({ message: 'Failed to fetch pending vendors' });
  }
});

// Get all vendors (all statuses)
router.get('/vendors', authenticate, isAdmin, async (req: any, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const vendors = await userRepo.find({
      where: { role: UserRole.VENDOR },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'country', 'city', 'businessName', 'businessRegNumber', 'isVerified', 'verificationStatus', 'verifiedAt', 'createdAt', 'interestedInPaySmallSmall']
    });

    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Failed to fetch vendors' });
  }
});

// Verify/Approve vendor
router.post('/vendors/:id/verify', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { status, notes } = req.body; // status: 'approved' or 'rejected'
    const userRepo = AppDataSource.getRepository(User);
    const storeRepo = AppDataSource.getRepository(Store);
    
    const vendor = await userRepo.findOne({ where: { id: req.params.id, role: UserRole.VENDOR } });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    vendor.verificationStatus = status;
    // Keep verification separate from approval:
    // approval controls visibility, isVerified can be set later independently.
    if (status === 'approved') {
      vendor.isVerified = false;
      vendor.verifiedBy = null as any;
      vendor.verifiedAt = null;
    } else if (status === 'rejected') {
      vendor.isVerified = false;
      vendor.verifiedBy = null as any;
      vendor.verifiedAt = null;
    }
    vendor.verificationNotes = notes || '';

    await userRepo.save(vendor);

    // Also update the vendor's stores
    if (status === 'approved') {
      await storeRepo.update(
        { ownerId: vendor.id },
        {
          verificationStatus: 'approved',
          isVerified: false,
          verifiedBy: null as any,
          verifiedAt: null as any,
        }
      );

      // Get the first store to get the store name
      const vendorStore = await storeRepo.findOne({ where: { ownerId: vendor.id } });
      
      // Send approval email
      await emailService.sendVendorApprovalEmail(
        vendor.email,
        vendor.firstName,
        vendorStore?.name || 'Your Store'
      );
    } else {
      // Send rejection email
      await emailService.sendVendorRejectionEmail(
        vendor.email,
        vendor.firstName,
        (await storeRepo.findOne({ where: { ownerId: vendor.id } }))?.name || 'Your Store',
        notes
      );
    }

    res.json({ message: `Vendor ${status} successfully`, vendor });
  } catch (error) {
    console.error('Error verifying vendor:', error);
    res.status(500).json({ message: 'Failed to verify vendor' });
  }
});

// ===== ADMIN PRODUCT POSTING ROUTES =====

// Admin creates product and posts to multiple countries
router.post('/products/create', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { name, description, price, image, category, subcategory, stock, storeId, countries, city } = req.body;
    
    console.log('[ADMIN PRODUCT CREATE] Received request:', { name, category, storeId, price, stock });

    // Validate required fields
    if (!name || !description || !price || !image || !stock || !storeId || !category) {
      console.warn('[ADMIN PRODUCT CREATE] Missing required fields:', { name, description, price, image, stock, storeId, category });
      return res.status(400).json({ 
        message: 'Missing required fields: name, description, price, image, stock, storeId, and category are required',
        received: { name, description, price, image, stock, storeId, category }
      });
    }

    const productRepo = AppDataSource.getRepository(Product);
    const storeRepo = AppDataSource.getRepository(Store);

    // Verify store exists
    const store = await storeRepo.findOne({ where: { id: storeId } });
    if (!store) {
      console.warn('[ADMIN PRODUCT CREATE] Store not found:', storeId);
      return res.status(404).json({ message: 'Store not found' });
    }

    // Create product with 10% markup
    const originalPrice = parseFloat(price);
    const markedUpPrice = originalPrice * 1.10;
    
    const product = productRepo.create({
      name,
      description,
      price: markedUpPrice,
      image,
      category,
      subcategory: subcategory || null,
      stock: parseInt(stock),
      storeId,
      country: store.country, // Main country from store
      city: city || store.city,
      availableCountries: countries || [store.country], // Array of countries
      postedByAdmin: true,
      adminPosterId: req.user.userId,
      approvalStatus: 'approved', // Admin-posted products are auto-approved
      approvedBy: req.user.userId,
      approvedAt: new Date()
    });

    console.log('[ADMIN PRODUCT CREATE] Creating product:', product);
    const savedProduct = await productRepo.save(product);
    console.log('[ADMIN PRODUCT CREATE] ✓ Product saved successfully:', savedProduct.id);
    
    res.status(201).json({ message: 'Product created successfully', product: savedProduct });
  } catch (error: any) {
    console.error('[ADMIN PRODUCT CREATE] Error:', error);
    res.status(500).json({ 
      message: 'Failed to create product',
      error: error.message || error.toString()
    });
  }
});

// Get all verified stores for admin product posting
router.get('/stores/verified', authenticate, isAdmin, async (req, res) => {
  try {
    const storeRepo = AppDataSource.getRepository(Store);
    const stores = await storeRepo.find({
      where: { 
        verificationStatus: 'approved',
        isActive: true 
      },
      select: ['id', 'name', 'slug', 'country', 'city', 'ownerId']
    });

    res.json(stores);
  } catch (error) {
    console.error('Error fetching verified stores:', error);
    res.status(500).json({ message: 'Failed to fetch verified stores' });
  }
});

// Link product to a different store
router.patch('/products/:id/link-store', authenticate, isAdmin, async (req, res) => {
  try {
    const { storeId } = req.body;
    const productRepo = AppDataSource.getRepository(Product);
    const storeRepo = AppDataSource.getRepository(Store);

    const product = await productRepo.findOne({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const store = await storeRepo.findOne({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    product.storeId = storeId;
    await productRepo.save(product);

    res.json({ message: 'Product linked to store successfully', product });
  } catch (error) {
    console.error('Error linking product to store:', error);
    res.status(500).json({ message: 'Failed to link product to store' });
  }
});

// Update product available countries
router.patch('/products/:id/countries', authenticate, isAdmin, async (req, res) => {
  try {
    const { countries } = req.body; // Array of country names
    const productRepo = AppDataSource.getRepository(Product);

    const product = await productRepo.findOne({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.availableCountries = countries;
    await productRepo.save(product);

    res.json({ message: 'Product countries updated successfully', product });
  } catch (error) {
    console.error('Error updating product countries:', error);
    res.status(500).json({ message: 'Failed to update product countries' });
  }
});

// ===== INSTALLER VERIFICATION ROUTES =====

// Get all installers pending verification
router.get('/installers/pending', authenticate, isAdmin, async (req: any, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const installers = await userRepo.find({
      where: { 
        role: UserRole.INSTALLER,
        verificationStatus: 'pending'
      },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'country', 'city', 'certifications', 'yearsOfExperience', 'serviceAreas', 'createdAt', 'isVerified', 'verificationStatus']
    });

    res.json(installers);
  } catch (error) {
    console.error('Error fetching pending installers:', error);
    res.status(500).json({ message: 'Failed to fetch pending installers' });
  }
});

// Get all installers (all statuses)
router.get('/installers', authenticate, isAdmin, async (req: any, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const installers = await userRepo.find({
      where: { role: UserRole.INSTALLER },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'country', 'city', 'certifications', 'yearsOfExperience', 'serviceAreas', 'isVerified', 'verifiedAt', 'createdAt', 'verificationStatus']
    });

    res.json(installers);
  } catch (error) {
    console.error('Error fetching installers:', error);
    res.status(500).json({ message: 'Failed to fetch installers' });
  }
});

// Verify/Approve installer
router.post('/installers/:id/verify', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { isVerified, status, notes } = req.body; // status: approved/rejected/pending, isVerified optional
    const userRepo = AppDataSource.getRepository(User);
    
    const installer = await userRepo.findOne({ where: { id: req.params.id, role: UserRole.INSTALLER } });
    if (!installer) {
      return res.status(404).json({ message: 'Installer not found' });
    }

    if (typeof status === 'string' && ['approved', 'rejected', 'pending'].includes(status)) {
      installer.verificationStatus = status;
      if (status === 'approved' && typeof isVerified !== 'boolean') {
        installer.isVerified = false;
        installer.verifiedBy = null as any;
        installer.verifiedAt = null;
      }
      if (status === 'rejected') {
        installer.isVerified = false;
        installer.verifiedBy = null as any;
        installer.verifiedAt = null;
      }
    }

    if (typeof isVerified === 'boolean') {
      installer.isVerified = isVerified;
      installer.verifiedBy = req.user.userId;
      if (isVerified) {
        installer.verifiedAt = new Date();
      }
    }
    installer.verificationNotes = notes || '';

    await userRepo.save(installer);

    // Send email notification based on approval status
    if (installer.verificationStatus === 'approved') {
      await emailService.sendInstallerVerificationEmail(installer.email, installer.firstName);
    } else if (installer.verificationStatus === 'rejected') {
      await emailService.sendInstallerRejectionEmail(installer.email, installer.firstName, notes);
    }

    res.json({
      message: `Installer ${installer.verificationStatus} successfully`,
      installer
    });
  } catch (error) {
    console.error('Error verifying installer:', error);
    res.status(500).json({ message: 'Failed to verify installer' });
  }
});

// ============================================
// CATEGORIES MANAGEMENT ENDPOINTS
// ============================================

/**
 * @route GET /api/admin/categories
 * @desc Get all categories (including inactive)
 * @access Admin only
 */
router.get('/categories', authenticate, isAdmin, async (req: any, res) => {
  try {
    const categoryRepository = AppDataSource.getRepository(Category);
    const categories = await categoryRepository.find({
      relations: ['subcategories']
    });

    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

/**
 * @route POST /api/admin/categories
 * @desc Create a new category
 * @access Admin only
 */
router.post('/categories', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { name, description, icon, image } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const categoryRepository = AppDataSource.getRepository(Category);

    // Check if category already exists
    const existing = await categoryRepository.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ message: 'Category already exists' });
    }

    const category = categoryRepository.create({
      name: name.trim(),
      description: description || null,
      icon: icon || null,
      image: image || null,
    });

    await categoryRepository.save(category);

    console.log(`[ADMIN] Created category: ${name}`);
    res.status(201).json(category);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category', error: error.message });
  }
});

/**
 * @route PATCH /api/admin/categories/:id
 * @desc Update a category
 * @access Admin only
 */
router.patch('/categories/:id', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, image } = req.body;

    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOne({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if new name conflicts with existing category
    if (name && name.trim() !== category.name) {
      const existing = await categoryRepository.findOne({ where: { name: name.trim() } });
      if (existing) {
        return res.status(409).json({ message: 'Category name already exists' });
      }
    }

    if (name !== undefined) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (image !== undefined) category.image = image;

    await categoryRepository.save(category);

    console.log(`[ADMIN] Updated category: ${category.name}`);
    res.json(category);
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category', error: error.message });
  }
});

/**
 * @route DELETE /api/admin/categories/:id
 * @desc Delete a category and its subcategories
 * @access Admin only
 */
router.delete('/categories/:id', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOne({ where: { id } });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const categoryName = category.name;
    await categoryRepository.remove(category);

    console.log(`[ADMIN] Deleted category: ${categoryName}`);
    res.json({ message: 'Category and its subcategories deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
});

// ============================================
// SUBCATEGORIES MANAGEMENT ENDPOINTS
// ============================================

/**
 * @route GET /api/admin/categories/:categoryId/subcategories
 * @desc Get all subcategories for a category (including inactive)
 * @access Admin only
 */
router.get('/categories/:categoryId/subcategories', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { categoryId } = req.params;

    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOne({ where: { id: categoryId } });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subcategoryRepository = AppDataSource.getRepository(SubCategory);
    const subcategories = await subcategoryRepository.find({
      where: { categoryId }
    });

    res.json(subcategories);
  } catch (error: any) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ message: 'Failed to fetch subcategories', error: error.message });
  }
});

/**
 * @route POST /api/admin/categories/:categoryId/subcategories
 * @desc Create a new subcategory
 * @access Admin only
 */
router.post('/categories/:categoryId/subcategories', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, icon, image } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Subcategory name is required' });
    }

    const categoryRepository = AppDataSource.getRepository(Category);
    const category = await categoryRepository.findOne({ where: { id: categoryId } });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const subcategoryRepository = AppDataSource.getRepository(SubCategory);

    // Check if subcategory already exists in this category
    const existing = await subcategoryRepository.findOne({
      where: { categoryId, name: name.trim() }
    });
    if (existing) {
      return res.status(409).json({ message: 'Subcategory already exists in this category' });
    }

    const subcategory = subcategoryRepository.create({
      name: name.trim(),
      description: description || null,
      icon: icon || null,
      image: image || null,
      categoryId,
    });

    await subcategoryRepository.save(subcategory);

    console.log(`[ADMIN] Created subcategory: ${name} for category: ${category.name}`);
    res.status(201).json(subcategory);
  } catch (error: any) {
    console.error('Error creating subcategory:', error);
    res.status(500).json({ message: 'Failed to create subcategory', error: error.message });
  }
});

/**
 * @route PATCH /api/admin/categories/:categoryId/subcategories/:subcategoryId
 * @desc Update a subcategory
 * @access Admin only
 */
router.patch('/categories/:categoryId/subcategories/:subcategoryId', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const { name, description, icon, image } = req.body;

    const subcategoryRepository = AppDataSource.getRepository(SubCategory);
    const subcategory = await subcategoryRepository.findOne({
      where: { id: subcategoryId, categoryId }
    });

    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    // Check if new name conflicts with existing subcategory in same category
    if (name && name.trim() !== subcategory.name) {
      const existing = await subcategoryRepository.findOne({
        where: { categoryId, name: name.trim() }
      });
      if (existing) {
        return res.status(409).json({ message: 'Subcategory name already exists in this category' });
      }
    }

    if (name !== undefined) subcategory.name = name.trim();
    if (description !== undefined) subcategory.description = description;
    if (icon !== undefined) subcategory.icon = icon;
    if (image !== undefined) subcategory.image = image;

    await subcategoryRepository.save(subcategory);

    console.log(`[ADMIN] Updated subcategory: ${subcategory.name}`);
    res.json(subcategory);
  } catch (error: any) {
    console.error('Error updating subcategory:', error);
    res.status(500).json({ message: 'Failed to update subcategory', error: error.message });
  }
});

/**
 * @route DELETE /api/admin/categories/:categoryId/subcategories/:subcategoryId
 * @desc Delete a subcategory
 * @access Admin only
 */
router.delete('/categories/:categoryId/subcategories/:subcategoryId', authenticate, isAdmin, async (req: any, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;

    const subcategoryRepository = AppDataSource.getRepository(SubCategory);
    const subcategory = await subcategoryRepository.findOne({
      where: { id: subcategoryId, categoryId }
    });

    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    const subcategoryName = subcategory.name;
    await subcategoryRepository.remove(subcategory);

    console.log(`[ADMIN] Deleted subcategory: ${subcategoryName}`);
    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting subcategory:', error);
    res.status(500).json({ message: 'Failed to delete subcategory', error: error.message });
  }
});

// ============================================
// NEW ADMIN ENDPOINTS - PAYMENT FEATURES
// ============================================

// Get all payments (Paystack transactions)
router.get('/payments', authenticate, isAdmin, async (req, res) => {
  try {
    const queryBuilder = AppDataSource.getRepository(Order)
      .createQueryBuilder('order')
      .select([
        'order.id',
        'order.orderNumber',
        'order.total',
        'order.paymentStatus',
        'order.createdAt',
        'order.updatedAt',
        'order.items',
        'order.store'
      ])
      .where("order.paymentStatus = :status", { status: 'paid' })
      .orderBy('order.updatedAt', 'DESC')
      .take(50);

    const payments = await queryBuilder.getMany();

    const installmentRepo = AppDataSource.getRepository(InstallmentPayment);
    const installmentPayments = await installmentRepo.find({
      order: { updatedAt: 'DESC' },
      take: 50
    });
    const installmentByOrder = new Map<string, any>();
    installmentPayments.forEach((inst: any) => {
      if (inst?.orderId) {
        installmentByOrder.set(String(inst.orderId), inst);
      }
    });

    const serviceRepo = AppDataSource.getRepository(ServiceRequest);
    const serviceRequests = await serviceRepo.find({
      order: { updatedAt: 'DESC' },
      take: 50
    });

    const parsePaymentRef = (message: string) => {
      if (!message) return '';
      const match = message.match(/payment reference:\s*(.+)/i);
      if (!match?.[1]) return '';
      return match[1].split('\n')[0].trim();
    };

    const parsePaymentAmount = (message: string) => {
      if (!message) return 0;
      const match = message.match(/payment amount:\s*([\u20A6N]?\s*[\d,]+(\.\d+)?)/i);
      if (!match?.[1]) return 0;
      const raw = match[1].replace(/[\u20A6N,\s]/g, '');
      const value = Number(raw);
      return Number.isFinite(value) ? value : 0;
    };

    const classifyOrderPayment = (order: any) => {
      const items = Array.isArray(order?.items) ? order.items : [];
      const hasFlash = items.some((item: any) => item?.isFlashDeal || item?.packageType || item?.packageId);
      if (hasFlash) return 'flash';
      const hasSwap = items.some((item: any) => item?.isSwapItem && item?.swapItemType === 'resale');
      if (hasSwap) return 'swap';
      const hasTradeIn = items.some((item: any) => item?.isSwapItem && item?.swapItemType === 'tradein');
      if (hasTradeIn) return 'tradein';
      const hasEv = items.some((item: any) => {
        const category = String(item?.category || item?.storeCategory || '').toLowerCase();
        const name = String(item?.productName || item?.name || '').toLowerCase();
        return category.includes('electric vehicle') || category.includes('ev') || name.includes('electric') || name.includes('ev ');
      });
      if (hasEv) return 'ev';
      return 'order';
    };

    const orderPayments = payments.map((o: any) => {
      const installment = installmentByOrder.get(String(o.id));
      const isInstallmentOrder = String(o.orderNumber || '').startsWith('ORD-INST-');
      const paidAmount = installment ? Number(installment.paidAmount || installment.firstPayment || 0) : 0;
      return {
      id: o.id,
      reference: `PAY-${o.orderNumber}`,
      orderId: o.id,
      amount: isInstallmentOrder && paidAmount > 0 ? paidAmount : o.total,
      status: o.paymentStatus === 'paid' ? 'completed' : 'pending',
      paymentMethod: 'Paystack',
      transactionDate: o.updatedAt,
      createdAt: o.createdAt,
      paymentType: isInstallmentOrder ? 'installment' : 'order',
      paymentCategory: isInstallmentOrder ? 'installment' : classifyOrderPayment(o),
      order: {
        id: o.id,
        store: o.store,
        items: o.items
      }
    };
    });

    const installmentPaymentRows = installmentPayments
      .filter((inst: any) => Number(inst.paidAmount || 0) > 0 || inst.firstPaymentReference)
      .map((inst: any) => ({
        id: `inst-${inst.id}`,
        reference: inst.firstPaymentReference || `PAY-INST-${String(inst.id).slice(0, 8)}`,
        orderId: inst.orderId,
        amount: Number(inst.paidAmount || inst.firstPayment || 0),
        status: Number(inst.paidAmount || 0) > 0 ? 'completed' : 'pending',
        paymentMethod: 'Paystack',
        transactionDate: inst.updatedAt || inst.createdAt,
        createdAt: inst.createdAt,
        paymentType: 'installment',
        paymentCategory: 'installment'
      }));

    const servicePayments = serviceRequests
      .filter((sr: any) => sr?.isPaid || /payment reference/i.test(String(sr?.message || '')))
      .map((sr: any) => ({
        id: sr.id,
        reference: parsePaymentRef(sr.message) || `PAY-SVC-${String(sr.id).slice(0, 8)}`,
        serviceRequestId: sr.id,
        amount: parsePaymentAmount(sr.message),
        status: sr.isPaid || /payment reference/i.test(String(sr?.message || '')) ? 'completed' : 'pending',
        paymentMethod: 'Paystack',
        transactionDate: sr.updatedAt || sr.createdAt,
        createdAt: sr.createdAt,
        paymentType: 'service',
        paymentCategory: 'service',
        customer: {
          fullName: sr.fullName,
          email: sr.email,
          phone: sr.phone
        }
      }));

    let externalServicePayments: any[] = [];
    if (PAYSTACK_SECRET_KEY && !PAYSTACK_SECRET_KEY.includes('sk_test_your_secret_key_here')) {
      try {
        const paystackResponse = await axios.get(
          `${PAYSTACK_BASE_URL}/transaction`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            },
            params: { perPage: 50 }
          }
        );

        const paystackList = Array.isArray(paystackResponse.data?.data) ? paystackResponse.data.data : [];
        externalServicePayments = paystackList
          .filter((tx: any) => String(tx?.reference || '').startsWith('service-request-'))
          .map((tx: any) => ({
            id: `paystack-${tx.id || tx.reference}`,
            reference: tx.reference,
            amount: Number(tx.amount || 0) / 100,
            status: tx.status === 'success' ? 'completed' : 'pending',
            paymentMethod: 'Paystack',
            transactionDate: tx.paid_at || tx.created_at || tx.createdAt,
            createdAt: tx.created_at || tx.createdAt,
            paymentType: 'service',
            paymentCategory: 'service',
            customer: {
              fullName: tx?.customer?.first_name || tx?.customer?.last_name
                ? `${tx?.customer?.first_name || ''} ${tx?.customer?.last_name || ''}`.trim()
                : undefined,
              email: tx?.customer?.email,
              phone: tx?.customer?.phone
            }
          }));
      } catch (paystackError: any) {
        console.warn('[ADMIN] Paystack fetch failed:', paystackError?.message || paystackError);
      }
    }

    const servicePaymentsByRef = new Set(servicePayments.map((p: any) => p.reference));
    const mergedServicePayments = [
      ...servicePayments,
      ...externalServicePayments.filter((p: any) => !servicePaymentsByRef.has(p.reference))
    ];

    const auditRepo = AppDataSource.getRepository(AdminAuditLog);
    const suppressedLogs = await auditRepo.find({
      where: { action: 'PAYMENT_REFERENCE_SUPPRESSED' as any },
      select: ['metadata'],
      take: 5000,
      order: { createdAt: 'DESC' },
    });
    const suppressedRefs = new Set(
      suppressedLogs
        .map((log: any) => String(log?.metadata?.reference || '').trim())
        .filter(Boolean)
    );

    const merged = [...orderPayments, ...installmentPaymentRows, ...mergedServicePayments]
      .filter((payment: any) => !suppressedRefs.has(String(payment?.reference || '').trim()))
      .sort(
      (a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );

    res.json(merged);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

// Delete a payment entry (currently supports service payments)
router.delete('/payments/:paymentId', authenticate, isAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const reference = String(req.query.reference || '').trim();
    const paymentCategory = String(req.query.paymentCategory || req.query.paymentType || '').trim().toLowerCase();
    const actorUserId = String((req as any).user?.userId || '').trim();

    if (paymentCategory && paymentCategory !== 'service') {
      return res.status(400).json({ message: 'Only service payment entries can be deleted from this endpoint.' });
    }

    const serviceRepo = AppDataSource.getRepository(ServiceRequest);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(paymentId || ''));
    let targetRequest: ServiceRequest | null = null;

    if (isUuid) {
      targetRequest = await serviceRepo.findOne({ where: { id: paymentId } });
    }

    if (!targetRequest && reference) {
      targetRequest = await serviceRepo
        .createQueryBuilder('sr')
        .where('LOWER(sr.message) LIKE :ref', {
          ref: `%payment reference: ${reference.toLowerCase()}%`,
        })
        .orderBy('sr.updatedAt', 'DESC')
        .getOne();
    }

    await AppDataSource.transaction(async (manager) => {
      if (targetRequest) {
        await manager.getRepository(ServiceRequestUpdate).delete({ requestId: targetRequest.id });
        await manager.getRepository(ServiceNotification).delete({ serviceRequestId: targetRequest.id });
        await manager.getRepository(ServiceRequest).delete({ id: targetRequest.id });
      }

      if (reference && actorUserId) {
        const auditEntry = manager.getRepository(AdminAuditLog).create({
          actorUserId,
          action: 'PAYMENT_REFERENCE_SUPPRESSED',
          targetType: 'payment',
          targetId: targetRequest?.id || paymentId || reference,
          metadata: {
            reference,
            paymentCategory: 'service',
            source: targetRequest ? 'service_request' : 'external_payment',
          },
          statusCode: 200,
        });
        await manager.getRepository(AdminAuditLog).save(auditEntry);
      }
    });

    return res.json({
      success: true,
      message: targetRequest
        ? 'Service payment entry deleted successfully.'
        : 'Payment entry hidden successfully.',
      id: targetRequest?.id || null,
      reference: reference || null,
    });
  } catch (error: any) {
    console.error('Error deleting payment entry:', error);
    return res.status(500).json({ message: 'Failed to delete payment entry' });
  }
});

// Get cheques for admin
router.get('/cheques', authenticate, isAdmin, async (req, res) => {
  try {
    const Cheque = AppDataSource.getRepository('Cheque');
    const cheques = await Cheque.find({ 
      relations: ['installmentPayment'],
      order: { createdAt: 'DESC' },
      take: 50
    });
    res.json(cheques);
  } catch (error: any) {
    console.error('Error fetching cheques:', error);
    res.status(500).json({ message: 'Failed to fetch cheques' });
  }
});

// Get returns for admin
router.get('/returns', authenticate, isAdmin, async (req, res) => {
  try {
    const Return = AppDataSource.getRepository('Return');
    const returns = await Return.find({ 
      relations: ['order'],
      order: { requestedAt: 'DESC' },
      take: 50
    });
    res.json(returns);
  } catch (error: any) {
    console.error('Error fetching returns:', error);
    res.status(500).json({ message: 'Failed to fetch returns' });
  }
});

// Approve return request
router.post('/returns/:returnId/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;
    const Return = AppDataSource.getRepository('Return');
    const ret = await Return.findOne({ where: { id: returnId } });

    if (!ret) {
      return res.status(404).json({ message: 'Return not found' });
    }

    ret.status = 'approved';
    await Return.save(ret);

    res.json({ message: 'Return approved successfully', data: ret });
  } catch (error: any) {
    console.error('Error approving return:', error);
    res.status(500).json({ message: 'Failed to approve return' });
  }
});

// Reject return request
router.post('/returns/:returnId/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;
    const Return = AppDataSource.getRepository('Return');
    const ret = await Return.findOne({ where: { id: returnId } });

    if (!ret) {
      return res.status(404).json({ message: 'Return not found' });
    }

    ret.status = 'rejected';
    await Return.save(ret);

    res.json({ message: 'Return rejected successfully', data: ret });
  } catch (error: any) {
    console.error('Error rejecting return:', error);
    res.status(500).json({ message: 'Failed to reject return' });
  }
});

// Process refund
router.post('/returns/:returnId/refund', authenticate, isAdmin, async (req, res) => {
  try {
    const { returnId } = req.params;
    const { refundAmount } = req.body;
    const Return = AppDataSource.getRepository('Return');
    const ret = await Return.findOne({ where: { id: returnId } });

    if (!ret) {
      return res.status(404).json({ message: 'Return not found' });
    }

    ret.status = 'refunded';
    ret.refundAmount = refundAmount;
    await Return.save(ret);

    res.json({ message: 'Refund processed successfully', data: ret });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Failed to process refund' });
  }
});

// Get all coupons
router.get('/coupons', authenticate, isAdmin, async (req, res) => {
  try {
    const Coupon = AppDataSource.getRepository('Coupon');
    const coupons = await Coupon.find({ 
      order: { createdAt: 'DESC' },
      take: 100
    });
    res.json(coupons);
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ message: 'Failed to fetch coupons' });
  }
});

// Create coupon
router.post('/coupons', authenticate, isAdmin, async (req, res) => {
  try {
    const { code, discountPercentage, discountAmount, minimumOrderAmount, expiryDate, usageLimit } = req.body;
    const Coupon = AppDataSource.getRepository('Coupon');

    const coupon = Coupon.create({
      code: code.toUpperCase(),
      discountPercentage,
      discountAmount,
      minimumOrderAmount,
      expiryDate,
      usageLimit,
      status: 'active',
      isActive: true,
      timesUsed: 0
    });

    await Coupon.save(coupon);
    res.status(201).json({ message: 'Coupon created successfully', data: coupon });
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Failed to create coupon', error: error.message });
  }
});

// Update coupon status
router.patch('/coupons/:couponId', authenticate, isAdmin, async (req, res) => {
  try {
    const { couponId } = req.params;
    const { isActive } = req.body;
    const Coupon = AppDataSource.getRepository('Coupon');
    
    const coupon = await Coupon.findOne({ where: { id: couponId } });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.isActive = isActive;
    coupon.status = isActive ? 'active' : 'inactive';
    await Coupon.save(coupon);

    res.json({ message: 'Coupon updated successfully', data: coupon });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Failed to update coupon' });
  }
});

// Delete coupon
router.delete('/coupons/:couponId', authenticate, isAdmin, async (req, res) => {
  try {
    const { couponId } = req.params;
    const Coupon = AppDataSource.getRepository('Coupon');
    
    const result = await Coupon.delete(couponId);
    
    if (result.affected === 0) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Failed to delete coupon' });
  }
});

// Get wishlists for admin
router.get('/wishlists', authenticate, isAdmin, async (req, res) => {
  try {
    const Wishlist = AppDataSource.getRepository('Wishlist');
    const wishlists = await Wishlist.find({ 
      relations: ['user'],
      order: { addedAt: 'DESC' },
      take: 100
    });
    res.json(wishlists);
  } catch (error: any) {
    console.error('Error fetching wishlists:', error);
    res.status(500).json({ message: 'Failed to fetch wishlists' });
  }
});

// Get financial report
router.get('/financial-report', authenticate, isAdmin, async (req, res) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const ReturnRepo = AppDataSource.getRepository('Return');
    const InstallmentPayment = AppDataSource.getRepository('InstallmentPayment');

    const totalOrders = await orderRepo.count();
    const completedOrders = await orderRepo.count({ where: { paymentStatus: 'paid' } as any });
    
    const totalRevenue = await orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where("order.paymentStatus = :status", { status: 'paid' })
      .getRawOne();

    const returns = await ReturnRepo.find();
    const totalRefunds = returns.reduce((sum: number, r: any) => sum + (r.refundAmount || 0), 0);

    const installments = await InstallmentPayment.find();
    const paidInstallments = installments.filter(i => i.status === 'paid');
    const pendingInstallments = installments.filter(i => i.status === 'pending');

    const totalInstallmentsAmount = installments.reduce((sum: number, i: any) => sum + i.amount, 0);
    const paidInstallmentsAmount = paidInstallments.reduce((sum: number, i: any) => sum + i.amount, 0);

    const averageOrderValue = totalOrders > 0 ? (totalRevenue.total || 0) / totalOrders : 0;

    const report = {
      totalRevenue: totalRevenue.total || 0,
      totalOrders,
      totalRefunds,
      totalInstallments: totalInstallmentsAmount,
      paidInstallments: paidInstallmentsAmount,
      pendingInstallments: totalInstallmentsAmount - paidInstallmentsAmount,
      totalPayments: completedOrders,
      completedPayments: completedOrders,
      failedPayments: totalOrders - completedOrders,
      averageOrderValue,
      lastUpdated: new Date().toISOString()
    };

    res.json(report);
  } catch (error: any) {
    console.error('Error fetching financial report:', error);
    res.status(500).json({ message: 'Failed to fetch financial report' });
  }
});

// ✅ Admin endpoint: Clean up duplicate orders
router.post('/cleanup-duplicates', authenticate, isAdmin, async (req, res) => {
  try {
    console.log('[CLEANUP] Starting comprehensive duplicate order cleanup...');
    
    const orderRepo = AppDataSource.getRepository(Order);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    const report = {
      duplicateOrdersDeleted: 0,
      orphanedOrderItemsDeleted: 0,
      nonPaidOrdersAnalyzed: 0,
      totalProcessed: 0,
      details: [] as any[]
    };
    
    try {
      // ============================================================
      // STEP 1: Clean up duplicate orders (keep first, delete rest)
      // ============================================================
      console.log('[CLEANUP] Step 1: Finding duplicate payment references...');
      
      const duplicates = await orderRepo.query(`
        SELECT "paymentReference", "paystackReference", COUNT(*) as count
        FROM "order"
        WHERE ("paymentReference" IS NOT NULL AND "paymentReference" != '')
           OR ("paystackReference" IS NOT NULL AND "paystackReference" != '')
        GROUP BY "paymentReference", "paystackReference"
        HAVING COUNT(*) > 1
      `);
      
      console.log(`[CLEANUP] Found ${duplicates.length} payment references with duplicates`);
      
      for (const dup of duplicates) {
        const ref = dup.paymentReference || dup.paystackReference;
        
        // Find all orders for this payment reference
        const orders = await orderRepo.query(`
          SELECT id, "createdAt", "paymentStatus", "orderNumber", total
          FROM "order"
          WHERE ("paymentReference" = $1 OR "paystackReference" = $1)
          ORDER BY "createdAt" ASC
        `, [ref]);
        
        if (orders.length > 1) {
          const [first, ...toDelete] = orders;
          
          console.log(`[CLEANUP] ✓ Keeping order ${first.id} (${first.orderNumber})`);
          
          for (const order of toDelete) {
            console.log(`[CLEANUP] ✗ Deleting duplicate order ${order.id}`);
            
            // Delete associated order items first
            const itemDeleteResult = await queryRunner.query(
              `DELETE FROM "order_items" WHERE "orderId" = $1`,
              [order.id]
            );
            
            // Delete the order
            await queryRunner.query(
              `DELETE FROM "order" WHERE id = $1`,
              [order.id]
            );
            
            report.duplicateOrdersDeleted++;
            report.details.push({
              type: 'DUPLICATE',
              orderId: order.id,
              orderNumber: order.orderNumber,
              total: order.total,
              paymentReference: ref
            });
          }
        }
      }
      
      console.log(`[CLEANUP] ✓ Deleted ${report.duplicateOrdersDeleted} duplicate orders`);
      
      // ============================================================
      // STEP 2: Clean up orphaned order items (orders that don't exist)
      // ============================================================
      console.log('[CLEANUP] Step 2: Finding orphaned order items...');
      
      const orphanedItems = await queryRunner.query(`
        SELECT COUNT(*) as count
        FROM "order_items" oi
        WHERE NOT EXISTS (SELECT 1 FROM "order" o WHERE o.id = oi."orderId")
      `);
      
      const orphanedCount = orphanedItems[0]?.count || 0;
      console.log(`[CLEANUP] Found ${orphanedCount} orphaned order items`);
      
      if (orphanedCount > 0) {
        const result = await queryRunner.query(`
          DELETE FROM "order_items"
          WHERE "orderId" NOT IN (SELECT id FROM "order")
        `);
        report.orphanedOrderItemsDeleted = orphanedCount;
        report.details.push({
          type: 'ORPHANED_ITEMS',
          count: orphanedCount
        });
        console.log(`[CLEANUP] ✓ Deleted ${orphanedCount} orphaned order items`);
      }
      
      // ============================================================
      // STEP 3: Analyze non-paid old orders (24+ hours old)
      // ============================================================
      console.log('[CLEANUP] Step 3: Analyzing old non-paid orders...');
      
      const oldNonPaidOrders = await orderRepo.query(`
        SELECT id, "orderNumber", "paymentStatus", "createdAt", total
        FROM "order"
        WHERE "paymentStatus" IN ('pending', 'failed')
        AND "createdAt" < NOW() - INTERVAL '24 hours'
        ORDER BY "createdAt" DESC
      `);
      
      report.nonPaidOrdersAnalyzed = oldNonPaidOrders.length;
      console.log(`[CLEANUP] Found ${oldNonPaidOrders.length} non-paid orders older than 24 hours`);
      
      if (oldNonPaidOrders.length > 0) {
        report.details.push({
          type: 'OLD_NON_PAID_ALERT',
          count: oldNonPaidOrders.length,
          note: 'These orders could be cleaned up if manual approval is given',
          samples: oldNonPaidOrders.slice(0, 5)
        });
      }
      
      // ============================================================
      // STEP 4: Generate summary
      // ============================================================
      report.totalProcessed = report.duplicateOrdersDeleted + report.orphanedOrderItemsDeleted;
      
      console.log(`[CLEANUP] ✅ Cleanup complete!`);
      console.log(`   - Duplicate orders deleted: ${report.duplicateOrdersDeleted}`);
      console.log(`   - Orphaned items deleted: ${report.orphanedOrderItemsDeleted}`);
      console.log(`   - Old non-paid orders: ${report.nonPaidOrdersAnalyzed}`);
      
      res.json({
        success: true,
        message: `✅ Cleanup complete! Deleted ${report.totalProcessed} items total`,
        report: report
      });
      
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('[CLEANUP] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
});

// ✅ UPDATE ORDER PAYMENT STATUS
// Admin updates payment status independently and it persists to database
router.patch('/orders/:id/payment', authenticate, isAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!id || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and payment status are required'
      });
    }

    // Valid payment statuses
    const validStatuses = ['pending', 'paid', 'completed', 'failed', 'refunded'];

    if (!validStatuses.includes(paymentStatus.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({ where: { id } });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`[ADMIN] 💰 Updating order ${id} payment status to: ${paymentStatus}`);
    console.log(`[ADMIN] Current payment status: ${order.paymentStatus}`);

    // Update the order with new payment status
    await orderRepository.update(
      { id },
      { paymentStatus: paymentStatus.toLowerCase() }
    );

    // Fetch updated order to confirm
    const updatedOrder = await orderRepository.findOne({ where: { id } });

    console.log(`[ADMIN] ✅ Order ${id} payment status updated to ${paymentStatus}`);
    console.log(`[ADMIN] Verified in DB: ${updatedOrder?.paymentStatus}`);

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        id: updatedOrder?.id,
        orderNumber: updatedOrder?.orderNumber,
        paymentStatus: updatedOrder?.paymentStatus,
        orderStatus: updatedOrder?.orderStatus
      }
    });
  } catch (error: any) {
    console.error('[ADMIN] Error updating payment status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
});

// ✅ GET ORDER TRACKING INFO (for customer)
// Customer fetches real-time shipping status from database
router.get('/orders/:id/tracking', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id },
      select: [
        'id',
        'orderNumber',
        'orderStatus',
        'paymentStatus',
        'trackingNumber',
        'createdAt',
        'updatedAt'
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Build timeline based on order status
    const timeline = buildTimeline(order.orderStatus, order.createdAt);

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        trackingNumber: order.trackingNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        timeline: timeline
      }
    });
  } catch (error: any) {
    console.error('[TRACKING] Error fetching order tracking:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order tracking',
      error: error.message
    });
  }
});

/**
 * Helper: Build timeline based on order status
 */
const buildTimeline = (orderStatus: string, createdAt: Date) => {
  const statuses = [
    { name: 'pending', label: 'Order Placed', completed: true },
    {
      name: 'processing',
      label: 'Processing',
      completed: ['processing', 'shipped', 'delivered'].includes(
        orderStatus?.toLowerCase()
      )
    },
    {
      name: 'shipped',
      label: 'Shipped',
      completed: ['shipped', 'delivered'].includes(orderStatus?.toLowerCase())
    },
    {
      name: 'delivered',
      label: 'Delivered',
      completed: orderStatus?.toLowerCase() === 'delivered'
    }
  ];

  return statuses;
};

// ============================================
// ✅ DEPRECATED - Use /api/orders/:id/status instead
// ============================================
// The shipping endpoint has been consolidated into the main orders API.
// Please use: PATCH /api/orders/:id/status
// This provides the single source of truth for order status management.

/*
router.patch('/orders/:orderId/shipping', authenticate, isAdmin, async (req: any, res: any) => {
  // DEPRECATED - Use /api/orders/:id/status instead
});

// ============================================
// 🚀 SIMPLE DIRECT ENDPOINTS - PAYMENT STATUS
// ============================================

/**
 * PATCH /api/admin/orders/:orderId/payment
 * Update ONLY the payment_status column
 * Request: { status: "pending" | "paid" | "completed" | "failed" | "refunded" }
 * Response: { id, payment_status }
 */
router.patch('/orders/:orderId/payment', authenticate, isAdmin, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const orderRepo = AppDataSource.getRepository(Order);
    
    // ✅ DIRECT UPDATE - no enum conversion, just set the value
    console.log(`\n💰 [PAYMENT] Updating order ${orderId} payment status to: ${status}`);
    
    const result = await orderRepo.update(
      { id: orderId },
      { paymentStatus: status as any }
    );

    if (result.affected === 0) {
      console.log(`[ERROR] Order not found: ${orderId}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    // ✅ READ BACK from database to confirm
    const updatedOrder = await orderRepo.findOne({ 
      where: { id: orderId },
      select: ['id', 'paymentStatus']
    });

    console.log(`✅ [PAYMENT] Updated successfully:`, {
      id: updatedOrder?.id,
      payment_status: updatedOrder?.paymentStatus
    });

    res.json({
      id: updatedOrder?.id,
      payment_status: updatedOrder?.paymentStatus
    });
  } catch (error: any) {
    console.error(`❌ [PAYMENT] Error updating payment status:`, error.message);
    res.status(500).json({ message: 'Failed to update payment status', error: error.message });
  }
});

export default router;

