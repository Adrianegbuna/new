import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order, PaymentStatus } from '../models/Order';
import { Product } from '../models/Product';
import { ResaleProduct, ResaleStatus } from '../models/ResaleProduct';
import { TradeIn, TradeInStatus } from '../models/TradeIn';
import { User, UserRole } from '../models/User';
import { Store } from '../models/Store';
import { AuthRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../models/Notification';

const orderRepository = AppDataSource.getRepository(Order);
const productRepository = AppDataSource.getRepository(Product);
const userRepository = AppDataSource.getRepository(User);
const storeRepository = AppDataSource.getRepository(Store);

export const createOrder = async (req: AuthRequest, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const userId = req.user?.userId;
    const { items, shippingAddress, paymentReference } = req.body;

    console.log('[ORDER] Creating order for user:', userId);
    console.log('[ORDER] Items in request:', items?.length || 0);

    // âœ… VALIDATION 1: Check required fields
    if (!userId) {
      await queryRunner.rollbackTransaction();
      return res.status(401).json({ message: 'Unauthorized: User ID required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({ message: 'Invalid or empty items array' });
    }

    // âœ… VALIDATION 2: Check duplicate payment reference
    if (paymentReference) {
      const existingOrder = await queryRunner.manager.findOne(Order, {
        where: { paymentReference }
      });
      if (existingOrder) {
        await queryRunner.rollbackTransaction();
        console.log('[ORDER] Duplicate payment reference detected:', paymentReference);
        return res.status(200).json({ 
          message: 'Order already exists for this payment',
          orderId: existingOrder.id,
          data: existingOrder 
        });
      }
    }

    // âœ… VALIDATION 3: Verify user exists
    const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
    if (!user) {
      await queryRunner.rollbackTransaction();
      return res.status(404).json({ message: 'User not found' });
    }

    // âœ… VALIDATION 4: Validate all items exist and have required fields
    const productRepository = queryRunner.manager.getRepository(Product);
    let total = 0;
    const enrichedItems: any[] = [];

    for (const item of items) {
      // Validate required fields
      if (!item.productId || !item.quantity || item.price === undefined) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          message: 'Missing required fields in item: productId, quantity, or price'
        });
      }

      // Check if this is a swap/resale item
      const isSwapItem = item.productId?.startsWith('resale-') || item.productId?.startsWith('tradein-');

      if (isSwapItem) {
        // Handle swap/resale items - no stock check
        const swapItemType = item.productId?.startsWith('resale-') ? 'resale' : 'tradein';
        const originalId = item.productId?.replace(/(resale-|tradein-)/, '') || item.productId;

        if (swapItemType === 'resale') {
          const resaleRepo = queryRunner.manager.getRepository(ResaleProduct);
          const resale = await resaleRepo.findOne({ where: { id: originalId } });
          if (!resale) {
            await queryRunner.rollbackTransaction();
            return res.status(400).json({ message: 'Resale listing not found' });
          }
          if ((resale.quantity || 0) < item.quantity) {
            await queryRunner.rollbackTransaction();
            return res.status(400).json({ message: 'Insufficient resale quantity available' });
          }
          resale.quantity = Math.max(0, (resale.quantity || 0) - item.quantity);
          if (resale.quantity === 0) {
            resale.status = ResaleStatus.SOLD;
          }
          await queryRunner.manager.save(ResaleProduct, resale);
        } else {
          const tradeInRepo = queryRunner.manager.getRepository(TradeIn);
          const tradeIn = await tradeInRepo.findOne({ where: { id: originalId } });
          if (!tradeIn) {
            await queryRunner.rollbackTransaction();
            return res.status(400).json({ message: 'Trade-in listing not found' });
          }
          if ((tradeIn.quantity || 0) < item.quantity) {
            await queryRunner.rollbackTransaction();
            return res.status(400).json({ message: 'Insufficient trade-in quantity available' });
          }
          tradeIn.quantity = Math.max(0, (tradeIn.quantity || 0) - item.quantity);
          if (tradeIn.quantity === 0) {
            tradeIn.status = TradeInStatus.COMPLETED;
          }
          await queryRunner.manager.save(TradeIn, tradeIn);
        }

        total += (item.price || 0) * (item.quantity || 1);

        enrichedItems.push({
          productId: originalId,
          productName: item.productName || 'Unknown Swap Item',
          quantity: item.quantity,
          price: item.price,
          image: item.image || '',
          isSwapItem: true,
          swapItemType: swapItemType,
          originalSellerId: item.sellerId || null
        });
      } else {
        // Handle regular products - ONLY fetch the specific product being purchased
        const product = await productRepository.findOne({
          where: { id: item.productId },
          relations: ['store']
        });

        if (!product) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({
            message: `Product ${item.productId} not found`
          });
        }

        // âœ… CRITICAL: Check stock BEFORE reducing
        if (product.stock < item.quantity) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          });
        }

        // Reduce stock immediately (within transaction)
        product.stock -= item.quantity;
        await queryRunner.manager.save(Product, product);
        console.log(`[ORDER] Stock reduced for product ${product.id}: ${item.quantity} units`);

        // Calculate subtotal
        total += parseFloat(product.price.toString()) * item.quantity;

        // Enrich item with store info
        enrichedItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          price: parseFloat(product.price.toString()),
          image: product.image || '',
          vendorId: product.store?.ownerId || 'Unknown Vendor',
          storeName: product.store?.name || 'Unknown Store',
          storeCity: product.store?.city || 'Unknown'
        });
      }
    }

    // âœ… VALIDATION 5: Ensure we have valid items
    if (enrichedItems.length === 0) {
      await queryRunner.rollbackTransaction();
      return res.status(400).json({ message: 'No valid items to order' });
    }

    // âœ… Create order with ONLY the purchased items
    const order = new Order();
    order.userId = userId;
    order.orderNumber = `ORD-${Date.now()}`;
    order.items = enrichedItems;
    order.total = parseFloat(total.toFixed(2));
    order.shippingAddress = shippingAddress || {};
    order.paymentReference = paymentReference || null;
    order.buyer = {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || '',
      address: shippingAddress?.street || '',
      city: shippingAddress?.city || '',
      state: shippingAddress?.state || '',
      postalCode: shippingAddress?.postalCode || ''
    };
    order.store = enrichedItems.length > 0 ? {
      id: enrichedItems[0].vendorId || 'Unknown',
      name: enrichedItems[0].storeName || 'Unknown Store',
      location: 'Store Location',
      city: enrichedItems[0].storeCity || 'Unknown',
      email: 'store@example.com',
      phone: ''
    } : {
      id: 'Unknown',
      name: 'Unknown Store',
      location: 'Unknown',
      city: 'Unknown',
      email: '',
      phone: ''
    };
    order.buyerDetails = {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || ''
    };
    order.orderStatus = 'pending'; // Single source of truth
    order.paymentStatus = PaymentStatus.PENDING;

    const savedOrder = await queryRunner.manager.save(Order, order);
    console.log('[ORDER] Order saved successfully:', savedOrder.id);

    // âœ… Commit transaction
    await queryRunner.commitTransaction();

    try {
      await NotificationService.createNotification(
        user.id,
        NotificationType.ORDER,
        'Order placed',
        `Your order ${savedOrder.orderNumber} was received.`,
        { relatedId: savedOrder.id, actionUrl: '/orders' }
      );
    } catch (notifyError) {
      console.warn('[ORDER] Failed to notify customer:', notifyError);
    }

    try {
      const vendorIds = Array.from(
        new Set((enrichedItems || []).map((item) => item.vendorId).filter((id) => id && id !== 'Unknown Vendor'))
      );
      await Promise.all(
        vendorIds.map((vendorId) =>
          NotificationService.createNotification(
            vendorId,
            NotificationType.ORDER,
            'New purchase request',
            `You have a new order request (${savedOrder.orderNumber}).`,
            { relatedId: savedOrder.id, actionUrl: '/vendor-dashboard?tab=orders' }
          )
        )
      );
    } catch (notifyError) {
      console.warn('[ORDER] Failed to notify vendors:', notifyError);
    }

    try {
      const admins = await userRepository.find({ where: { role: UserRole.ADMIN } });
      const title = 'New purchase request';
      const message = `Order ${savedOrder.orderNumber} placed by ${user.firstName} ${user.lastName} (₦${savedOrder.total}).`;
      await Promise.all(
        admins.map((admin) =>
          NotificationService.createNotification(
            admin.id,
            NotificationType.ORDER,
            title,
            message,
            { relatedId: savedOrder.id, actionUrl: '/admin/expanded-dashboard?tab=orders' }
          )
        )
      );
    } catch (notifyError) {
      console.warn('[ORDER] Failed to create admin notifications:', notifyError);
    }

    // Send emails (non-blocking)
    emailService.sendOrderConfirmation(user.email, user.firstName, {
      id: savedOrder.id,
      total: `${savedOrder.total}`,
    }).catch(() => {
      console.warn('[EMAIL] Order confirmation failed (non-critical)');
    });

    emailService.sendAdminOrderNotification({
      id: savedOrder.id,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      total: `${savedOrder.total}`,
      itemCount: enrichedItems.length,
    }).catch(() => {
      console.warn('[EMAIL] Admin notification failed (non-critical)');
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: savedOrder
    });
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    console.error('[ORDER] Create order failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  } finally {
    await queryRunner.release();
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const orders = await orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    res.json(orders);
  } catch (error: any) {
    console.error('[ORDER] Get orders failed:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getVendorOrders = async (req: AuthRequest, res: Response) => {
  try {
    const vendorId = req.user?.userId;

    if (!vendorId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const vendorStores = await storeRepository.find({ where: { ownerId: vendorId } });
    const vendorStoreIds = vendorStores.map((store) => String(store.id));

    // Get all orders where any item belongs to this vendor
    const allOrders = await orderRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['user']
    });

    // Filter orders to only those containing items from this vendor
    const validStatuses = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

    const vendorOrders = allOrders
      .filter(order => {
        // Exclude vendor's personal purchases from vendor-sales dashboard.
        // Personal purchases should be viewed from My Account / My Orders.
        if (String(order.userId || '') === String(vendorId)) {
          return false;
        }

        const isInstallmentOrder = String(order.orderNumber || '').startsWith('ORD-INST-');
        if (isInstallmentOrder) {
          return false;
        }

        return order.items &&
          order.items.length > 0 &&
          order.items.some((item: any) => {
            // Check if vendorId matches (account for different formats)
            const itemVendorId = String(item.vendorId || '');
            return itemVendorId === String(vendorId) || vendorStoreIds.includes(itemVendorId);
          });
      })
      .map(order => {
        const rawStatus = String((order as any)?.status || '').toLowerCase();
        const orderStatus = String(order.orderStatus || '').toLowerCase();
        const normalizedStatus = validStatuses.has(rawStatus)
          ? rawStatus
          : validStatuses.has(orderStatus)
            ? orderStatus
            : 'pending';

        return {
          ...order,
          orderStatus: normalizedStatus,
          status: normalizedStatus,
          // Filter items to only show items belonging to this vendor
          items: order.items.filter((item: any) => 
            String(item.vendorId || '') === String(vendorId) || vendorStoreIds.includes(String(item.vendorId || ''))
          )
        };
      });

    // Sort by date descending
    vendorOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(vendorOrders);
  } catch (error: any) {
    console.error('[ORDER] Get vendor orders failed:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const order = await orderRepository.findOne({
      where: { id, userId },
      relations: ['user'],
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    console.error('[ORDER] Get order failed:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('[ORDER] ðŸ”„ Status update request:', { id, status });

    // âœ… VALIDATE STATUS
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      console.warn('[ORDER] âŒ Invalid status:', status);
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // âœ… FIND ORDER
    const order = await orderRepository.findOne({ where: { id }, relations: ['user'] });
    if (!order) {
      console.warn('[ORDER] âŒ Order not found:', id);
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('[ORDER] âœ… Order found:', { id, currentStatus: order.orderStatus });

    const previousStatus = String(order.orderStatus || '').toLowerCase();
    const nextStatus = String(status).toLowerCase();

    // âœ… UPDATE STATUS IN DATABASE
    order.orderStatus = status;
    if (nextStatus === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
    }
    if (nextStatus === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }
    await orderRepository.save(order);

    console.log('[ORDER] âœ… Order status updated:', { id, newStatus: status });

    // âœ… VERIFY PERSISTENCE
    const verified = await orderRepository.findOne({ where: { id } });
    if (!verified || verified.orderStatus !== status) {
      console.error('[ORDER] âŒ VERIFICATION FAILED:', { verified: verified?.orderStatus });
      return res.status(500).json({ error: 'Failed to persist status change' });
    }

    console.log('[ORDER] âœ… VERIFIED: Status persisted to database');

    const buyerEmail = order.buyerDetails?.email || order.buyer?.email || order.user?.email || '';
    const buyerName = order.buyerDetails?.name || order.buyer?.fullName || order.user?.firstName || 'Customer';

    if (buyerEmail && previousStatus !== nextStatus) {
      if (nextStatus === 'shipped') {
        emailService.sendShippedEmail(buyerEmail, buyerName, {
          orderNumber: order.orderNumber || order.id,
          trackingNumber: order.trackingNumber,
          carrier: order.carrier,
          estimatedDelivery: order.estimatedDelivery,
        }).catch((err) => console.warn('[EMAIL] Shipped email failed:', err?.message || err));
      } else if (nextStatus === 'delivered') {
        emailService.sendDeliveredEmail(buyerEmail, buyerName, {
          orderNumber: order.orderNumber || order.id,
          itemCount: order.items?.length || 0,
          orderTotal: order.total || order.totalPrice,
        }).catch((err) => console.warn('[EMAIL] Delivered email failed:', err?.message || err));

        emailService.sendReviewRequest(buyerEmail, buyerName, {
          orderId: order.id,
          itemCount: order.items?.length || 0,
          total: order.total || order.totalPrice,
        }).catch((err) => console.warn('[EMAIL] Review request failed:', err?.message || err));
      } else {
        emailService.sendOrderStatusUpdate(
          buyerEmail,
          buyerName,
          order.orderNumber || order.id,
          nextStatus,
          order.trackingNumber,
          order.carrier
        ).catch((err) => console.warn('[EMAIL] Status update failed:', err?.message || err));
      }
    }

    // âœ… RETURN VERIFIED ORDER
    res.json({ id: verified.id, orderStatus: verified.orderStatus });

  } catch (error: any) {
    console.error('[ORDER] âŒ Update order status failed:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user as any;
    
    // Only admins can update payment status
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Admin only' });
    }

    const { id } = req.params;
    const { paymentStatus } = req.body;

    const order = await orderRepository.findOne({ where: { id } });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const oldPaymentStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;

    const updatedOrder = await orderRepository.save(order);

    try {
      const wasPaid = String(oldPaymentStatus || '').toLowerCase() === 'paid';
      const nowPaid = String(paymentStatus || '').toLowerCase() === 'paid';
      if (!wasPaid && nowPaid && order.userId) {
        await NotificationService.createNotification(
          order.userId,
          NotificationType.PAYMENT,
          'Payment received',
          `Payment received for order ${order.orderNumber || order.id}.`,
          { relatedId: order.id, actionUrl: '/orders' }
        );
      }
      if (!wasPaid && nowPaid && Array.isArray(order.items)) {
        const vendorIds = Array.from(
          new Set(order.items.map((item: any) => item.vendorId).filter((id: string) => id && id !== 'Unknown Vendor'))
        );
        await Promise.all(
          vendorIds.map((vendorId) =>
            NotificationService.createNotification(
              vendorId,
              NotificationType.PAYMENT,
              'Payment received',
              `Payment received for order ${order.orderNumber || order.id}.`,
              { relatedId: order.id, actionUrl: '/vendor-dashboard?tab=orders' }
            )
          )
        );
      }
    } catch (notifyError) {
      console.warn('[ORDER] Failed to notify vendors of payment:', notifyError);
    }

    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      data: updatedOrder
    });
  } catch (error: any) {
    console.error('[ORDER] Update payment status failed:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrderTracking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await orderRepository.findOne({ 
      where: { id },
      relations: ['user']
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Validate that order has items with productName
    if (!order.items || order.items.length === 0) {
      return res.status(404).json({ 
        message: 'Order items not found. Please contact support if you believe this is an error.'
      });
    }

    // âœ… BUILD TIMELINE FROM ORDER_STATUS (SINGLE SOURCE OF TRUTH)
    const normalizedStatus = String(order.orderStatus || '').toLowerCase();
    const paymentStatus = String(order.paymentStatus || '').toLowerCase();
    const hasShipmentProof = Boolean(order.shippedAt || order.trackingNumber || order.markedForDelivery);
    const hasDeliveryProof = Boolean(order.deliveredAt);

    let effectiveStatus = normalizedStatus || 'pending';
    if (normalizedStatus === 'delivered' && !hasDeliveryProof) {
      effectiveStatus = hasShipmentProof
        ? 'shipped'
        : (paymentStatus === 'paid' || paymentStatus === 'completed' ? 'processing' : 'pending');
    } else if (normalizedStatus === 'shipped' && !hasShipmentProof) {
      effectiveStatus = paymentStatus === 'paid' || paymentStatus === 'completed' ? 'processing' : 'pending';
    }

    const timeline: Array<any> = [];
    
    // Step 1: Order Placed (always first)
    timeline.push({
      status: 'Order Placed',
      description: 'Your order has been received and confirmed',
      date: order.createdAt.toLocaleString(),
      timestamp: order.createdAt.toISOString(),
      completed: true
    });

    // Build timeline based on orderStatus
    const orderStatusMap = {
      'pending': {
        labels: ['Order Placed'],
        nextLabel: 'Processing'
      },
      'processing': {
        labels: ['Order Placed', 'Processing'],
        nextLabel: 'Shipped'
      },
      'shipped': {
        labels: ['Order Placed', 'Processing', 'Shipped'],
        nextLabel: 'Delivered'
      },
      'delivered': {
        labels: ['Order Placed', 'Processing', 'Shipped', 'Delivered']
      },
      'cancelled': {
        labels: ['Order Cancelled']
      }
    };

    const statusConfig = orderStatusMap[effectiveStatus as keyof typeof orderStatusMap] || orderStatusMap['pending'];

    // Build timeline from orderStatus
    if (effectiveStatus === 'cancelled') {
      timeline[0] = {
        status: 'Order Cancelled',
        description: 'Your order has been cancelled',
        date: order.updatedAt.toLocaleString(),
        timestamp: order.updatedAt.toISOString(),
        completed: true
      };
    } else {
      // Add Processing step
      if (effectiveStatus === 'processing' || effectiveStatus === 'shipped' || effectiveStatus === 'delivered') {
        timeline.push({
          status: 'Processing',
          description: 'Your order is being prepared for shipment',
          date: order.updatedAt.toLocaleString(),
          timestamp: order.updatedAt.toISOString(),
          completed: true
        });
      }

      // Add Shipped step
      if (effectiveStatus === 'shipped' || effectiveStatus === 'delivered') {
        timeline.push({
          status: 'Shipped',
          description: 'Your order has been shipped from the warehouse',
          date: order.shippedAt ? order.shippedAt.toLocaleString() : order.updatedAt.toLocaleString(),
          timestamp: order.shippedAt ? order.shippedAt.toISOString() : order.updatedAt.toISOString(),
          completed: true
        });
      }

      // Add Delivered step
      if (effectiveStatus === 'delivered') {
        timeline.push({
          status: 'Delivered',
          description: 'Your order has been delivered successfully',
          date: order.deliveredAt ? order.deliveredAt.toLocaleString() : order.updatedAt.toLocaleString(),
          timestamp: order.deliveredAt ? order.deliveredAt.toISOString() : order.updatedAt.toISOString(),
          completed: true
        });
      }

      // Add pending future steps
      if (effectiveStatus === 'pending' || effectiveStatus === 'processing') {
        timeline.push({
          status: 'Shipped',
          description: 'Awaiting shipment',
          date: 'Pending',
          timestamp: null as any,
          completed: false
        });

        if (effectiveStatus === 'pending') {
          timeline.push({
            status: 'Processing',
            description: 'Awaiting processing',
            date: 'Pending',
            timestamp: null as any,
            completed: false
          });
        }

        timeline.push({
          status: 'Delivered',
          description: 'Awaiting delivery',
          date: 'Pending',
          timestamp: null as any,
          completed: false
        });
      } else if (effectiveStatus === 'shipped') {
        timeline.push({
          status: 'Delivered',
          description: 'In transit - delivery coming soon',
          date: 'Pending',
          timestamp: null as any,
          completed: false
        });
      }
    }

    const trackingData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: effectiveStatus,
      orderDate: order.createdAt.toISOString().split('T')[0],
      shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
      deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      estimatedDelivery: order.estimatedDelivery 
        ? order.estimatedDelivery.toISOString().split('T')[0]
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      items: order.items.map(item => ({
        name: item.productName || 'Product Name Not Available',
        quantity: item.quantity || 1,
        price: item.price || 0,
        image: item.image || ''
      })),
      timeline
    };

    res.json(trackingData);
  } catch (error: any) {
    console.error('[ORDER] Get tracking failed:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Get all orders with full details
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await orderRepository.find({
      order: { createdAt: 'DESC' }
    });

    // âœ… LOG: Exact count from database
    console.log(`ðŸ“Š [DB QUERY] Retrieved ${orders?.length || 0} unique orders from database`);

    if (!orders || orders.length === 0) {
      console.log('ðŸ“Š [API RESPONSE] Returning 0 orders');
      return res.status(200).json({ 
        success: true,
        data: [] 
      });
    }

    // Enrich orders with full details including customer and store info
    const enrichedOrders = orders.map(order => {
      // âœ… FIX: Ensure store data is properly populated, not "Unknown Store"
      // The store info should have been set during order creation from product.store
      const finalStore = order.store && order.store.name && order.store.name !== 'Unknown Store' 
        ? order.store 
        : {
            id: 'Unknown',
            name: order.items?.[0]?.storeName || 'General Store',
            location: order.items?.[0]?.storeCity || 'Unknown',
            email: '',
            phone: ''
          };

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.buyer ? {
          id: order.buyer.id || 'Unknown',
          fullName: order.buyer.fullName || 'Unknown Customer',
          email: order.buyer.email || '',
          phone: order.buyer.phone || '',
          address: order.buyer.address || '',
          city: order.buyer.city || '',
          state: order.buyer.state || '',
          postalCode: order.buyer.postalCode || ''
        } : {
          id: 'Unknown',
          fullName: 'Unknown Customer',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          postalCode: ''
        },
        store: {
          id: finalStore.id || 'Unknown',
          name: finalStore.name || 'General Store',
          location: finalStore.location || 'Unknown',
          email: finalStore.email || '',
          phone: finalStore.phone || '',
          city: finalStore.city || 'Unknown'
        },
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          product: {
            id: item.productId,
            name: item.productName,
            price: item.price,
            quantity: item.quantity,
            image: item.image || '',
            sku: item.sku || 'N/A',
            productCode: item.productCode || 'N/A',
            category: item.category || 'Uncategorized',
            store: {
              id: item.vendorId || 'Unknown',
              name: item.storeName || 'Unknown Store',
              city: item.storeCity || 'Unknown'
            }
          },
          quantity: item.quantity,
          price: item.price,
          productCode: item.productCode
        })),
        total: order.total || 0,
        orderStatus: order.orderStatus || 'pending', // Single source of truth
        paymentStatus: order.paymentStatus || PaymentStatus.PENDING,
        paymentReference: order.paymentReference || null,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber || null,
        estimatedDelivery: order.estimatedDelivery || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    // âœ… LOG: Final response count
    console.log(`ðŸ“Š [API RESPONSE] Sending ${enrichedOrders.length} enriched orders to frontend`);
    console.log(`ðŸ“Š [DATA VALIDATION] Orders structure: ${JSON.stringify(enrichedOrders.slice(0, 1), null, 2)}`);

    res.json({
      success: true,
      data: enrichedOrders
    });
  } catch (error: any) {
    console.error('Get all orders error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
};

