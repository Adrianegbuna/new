import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { Order, PaymentStatus } from '../models/Order';
import { User, UserRole } from '../models/User';
import { Product } from '../models/Product';
import { Package } from '../models/Package';
import { Store } from '../models/Store';
import { Coupon } from '../models/Coupon';
import { Referral, ReferralOrder, ReferralStatus } from '../models/Referral';
import { In } from 'typeorm';
import crypto from 'crypto';
import { emailService } from '../services/emailService';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../models/Notification';
import { processInstallmentFirstPaymentWebhook } from './installmentController';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_your_secret_key_here';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
};

const normalizeReferralCode = (value: unknown): string => String(value || '').trim().toUpperCase();

const applyReferralCommissionForOrder = async (params: {
  order: Order;
  buyerUserId: string;
  referralCode?: string | null;
}) => {
  const normalizedReferralCode = normalizeReferralCode(params.referralCode);
  if (!normalizedReferralCode) return;

  const referralOrderRepo = AppDataSource.getRepository(ReferralOrder);
  const existingReferralOrder = await referralOrderRepo.findOne({
    where: { orderId: params.order.id }
  });
  if (existingReferralOrder) return;

  const orderRepo = AppDataSource.getRepository(Order);
  const paidOrdersCount = await orderRepo.count({
    where: {
      userId: params.buyerUserId,
      paymentStatus: In([PaymentStatus.PAID, PaymentStatus.COMPLETED])
    }
  });
  if (paidOrdersCount !== 1) {
    console.log('[REFERRAL] Skipping commission - not first successful purchase', {
      buyerUserId: params.buyerUserId,
      paidOrdersCount
    });
    return;
  }

  const referralRepo = AppDataSource.getRepository(Referral);
  const referral = await referralRepo.findOne({
    where: { referralCode: normalizedReferralCode, status: ReferralStatus.ACTIVE }
  });
  if (!referral) {
    console.warn('[REFERRAL] Referral code not found/active:', normalizedReferralCode);
    return;
  }

  if (String(referral.referrerId) === String(params.buyerUserId)) {
    console.warn('[REFERRAL] Self-referral blocked for user:', params.buyerUserId);
    return;
  }

  const totalAmount = toNumber(params.order.total || params.order.totalPrice || 0);
  const commissionRate = 0.01;
  const commissionEarned = Number((totalAmount * commissionRate).toFixed(2));
  if (!Number.isFinite(commissionEarned) || commissionEarned <= 0) return;

  const referralOrder = referralOrderRepo.create({
    referralId: referral.id,
    orderId: params.order.id,
    orderAmount: totalAmount,
    commissionRate,
    commissionEarned,
    status: 'approved'
  });
  await referralOrderRepo.save(referralOrder);

  referral.totalCommission = Number(toNumber(referral.totalCommission) + commissionEarned) as any;
  referral.successfulPurchases = Number(referral.successfulPurchases || 0) + 1;
  referral.totalReferred = Number(referral.totalReferred || 0) + 1;
  await referralRepo.save(referral);

  console.log('[REFERRAL] Commission created', {
    referralCode: normalizedReferralCode,
    referralId: referral.id,
    orderId: params.order.id,
    commissionEarned
  });
};

/**
 * âœ… HELPER: Create Order with Full Error Logging & Validation
 */
const createOrderFromItems = async (
  userId: string,
  enrichedItems: any[],
  total: number,
  shippingAddress: any,
  paymentReference: string
): Promise<Order | null> => {
  console.log('[ORDER-CREATE] === Starting Order Creation ===');
  console.log('[ORDER-CREATE] User ID:', userId);
  console.log('[ORDER-CREATE] Payment Reference:', paymentReference);
  console.log('[ORDER-CREATE] Items count:', enrichedItems?.length);
  console.log('[ORDER-CREATE] Total amount:', total);

  // Validate inputs
  if (!userId) {
    console.error('[ORDER-CREATE] âŒ Missing userId');
    throw new Error('User ID is required');
  }

  if (!paymentReference) {
    console.error('[ORDER-CREATE] âŒ Missing payment reference');
    throw new Error('Payment reference is required');
  }

  if (!enrichedItems || !Array.isArray(enrichedItems) || enrichedItems.length === 0) {
    console.error('[ORDER-CREATE] âŒ Missing or empty items');
    throw new Error('Order must have at least one item');
  }

  // Validate all items have productId
  const invalidItems = enrichedItems.filter(item => !item.productId);
  if (invalidItems.length > 0) {
    console.error('[ORDER-CREATE] âŒ Items missing productId:', invalidItems);
    throw new Error(`${invalidItems.length} items missing productId`);
  }

  console.log('[ORDER-CREATE] âœ“ Input validation passed');

  // Check if order already exists
  try {
    console.log('[ORDER-CREATE] Checking for existing order with reference:', paymentReference);
    const orderRepository = AppDataSource.getRepository(Order);

    const existing = await orderRepository.query(
      `SELECT id, "orderNumber" FROM "order" 
       WHERE "paymentReference" = $1 OR "paystackReference" = $1
       LIMIT 1`,
      [paymentReference]
    );

    if (existing && existing.length > 0) {
      console.log('[ORDER-CREATE] âœ“ Order already exists:', existing[0].id);
      const existingOrder = await orderRepository.findOne({
        where: { id: existing[0].id }
      });
      return existingOrder || null;
    }

    console.log('[ORDER-CREATE] âœ“ No existing order found');
  } catch (checkError: any) {
    console.warn('[ORDER-CREATE] âš ï¸ Error checking existing order (continuing):', checkError.message);
  }

  // Create new order in transaction
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('[ORDER-CREATE] Connecting to database...');
    await queryRunner.connect();
    console.log('[ORDER-CREATE] âœ“ Database connected');

    console.log('[ORDER-CREATE] Starting transaction...');
    await queryRunner.startTransaction();
    console.log('[ORDER-CREATE] âœ“ Transaction started');

    // Get repositories
    const userRepository = queryRunner.manager.getRepository(User);
    const orderRepository = queryRunner.manager.getRepository(Order);

    // Load user
    console.log('[ORDER-CREATE] Loading user:', userId);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      console.error('[ORDER-CREATE] âŒ User not found:', userId);
      await queryRunner.rollbackTransaction();
      throw new Error(`User not found: ${userId}`);
    }

    console.log('[ORDER-CREATE] âœ“ User found:', user.email);

    // Create order object
    console.log('[ORDER-CREATE] Creating order object...');
    const order = new Order();
    order.userId = userId;
    order.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    order.items = enrichedItems;
    order.total = total;
    order.shippingAddress = shippingAddress || {};
    order.paymentReference = paymentReference;
    order.paystackReference = paymentReference;
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
    order.orderStatus = 'pending'; // Single source of truth
    order.paymentStatus = PaymentStatus.PENDING;

    console.log('[ORDER-CREATE] Order object created:', {
      orderNumber: order.orderNumber,
      userId: order.userId,
      itemCount: order.items.length,
      total: order.total
    });

    // Save order
    console.log('[ORDER-CREATE] Saving order to database...');
    const savedOrder = await queryRunner.manager.save(Order, order);

    if (!savedOrder || !savedOrder.id) {
      console.error('[ORDER-CREATE] âŒ Saved order has no ID');
      await queryRunner.rollbackTransaction();
      throw new Error('Order saved but has no ID');
    }

    console.log('[ORDER-CREATE] âœ“ Order saved with ID:', savedOrder.id);

    // Commit transaction
    console.log('[ORDER-CREATE] Committing transaction...');
    await queryRunner.commitTransaction();
    console.log('[ORDER-CREATE] âœ“ Transaction committed');

    try {
      const vendorIds = Array.from(
        new Set((enrichedItems || []).map((item: any) => item.vendorId).filter((id: string) => id && id !== 'Unknown Vendor'))
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
      console.warn('[ORDER-CREATE] Failed to notify vendors:', notifyError);
    }

    try {
      const adminRepo = AppDataSource.getRepository(User);
      const admins = await adminRepo.find({ where: { role: UserRole.ADMIN } });
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
      console.warn('[ORDER-CREATE] Failed to create admin notifications:', notifyError);
    }

    console.log('[ORDER-CREATE] === Order Creation Complete ===');
    return savedOrder;

  } catch (error: any) {
    console.error('[ORDER-CREATE] âŒ Error during order creation:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack?.split('\n').slice(0, 3)
    });

    try {
      await queryRunner.rollbackTransaction();
      console.log('[ORDER-CREATE] âœ“ Transaction rolled back');
    } catch (rollbackError) {
      console.error('[ORDER-CREATE] âŒ Error during rollback:', rollbackError);
    }

    throw error; // Re-throw to caller

  } finally {
    try {
      await queryRunner.release();
      console.log('[ORDER-CREATE] âœ“ Database connection released');
    } catch (releaseError) {
      console.error('[ORDER-CREATE] âŒ Error releasing connection:', releaseError);
    }
  }
};

/**
 * âœ… REFACTORED: Initialize Payment WITHOUT Creating Order
 * 
 * Flow:
 * 1. Validate cart items and stock availability
 * 2. Initialize Paystack payment
 * 3. Return payment URL to frontend
 * 4. Order is created ONLY after payment verification (see verifyPayment)
 * 
 * This prevents fake orders from appearing in admin dashboard
 */
export const initializePayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount, email, metadata } = req.body;
    const clientAmount = toNumber(amount);

    console.log('=== Payment Initialization (NO ORDER CREATED YET) ===');
    console.log('User ID:', userId);
    console.log('Amount:', amount);
    console.log('Email:', email);

    // âœ… VALIDATION 1: Required fields
    if (!email || !email.includes('@')) {
      return res.status(400).json({ status: false, message: 'Invalid email address' });
    }
    if (!userId) {
      return res.status(401).json({ status: false, message: 'Unauthorized - user ID required' });
    }

    const cartItems = metadata?.cart_items || [];

    // âœ… VALIDATION 2: Cart items exist and valid
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ status: false, message: 'Cart is empty' });
    }

    const invalidItems = cartItems.filter(
      item => !item.productId || !item.name || !item.quantity || item.price === undefined
    );
    if (invalidItems.length > 0) {
      console.error('Invalid cart items:', invalidItems);
      return res.status(400).json({ 
        status: false, 
        message: 'Cart items missing required fields (productId, name, quantity, price)' 
      });
    }

    // âœ… VALIDATION 3: Check stock and enrich items
    // This is validation ONLY - no actual stock reduction yet
    const productRepository = AppDataSource.getRepository(Product);
    const packageRepository = AppDataSource.getRepository(Package);
    const enrichedItems: any[] = [];

    for (const item of cartItems) {
      const isSwapItem = item.productId?.startsWith('resale-') || item.productId?.startsWith('tradein-');

      if (isSwapItem) {
        // Handle swap/resale items
        const swapItemType = item.productId?.startsWith('resale-') ? 'resale' : 'tradein';
        const originalId = item.productId?.replace(/(resale-|tradein-)/, '') || item.productId;

        enrichedItems.push({
          productId: originalId,
          productName: item.name || 'Unknown Swap Item',
          quantity: item.quantity,
          price: item.price,
          category: item.category || '',
          image: item.image || '',
          isSwapItem: true,
          swapItemType: swapItemType,
          originalSellerId: item.sellerId || null
        });
      } else {
        // Handle regular products - validate product exists + has stock
        const product = await productRepository.findOne({
          where: { id: item.productId },
          relations: ['store']
        });

        if (product) {
          if (product.stock < item.quantity) {
            return res.status(400).json({
              status: false,
              message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
            });
          }

          const vendorId = item.vendorId || product.store?.ownerId || product.storeId;
          const storeName = item.storeName || product.store?.name;
          const storeCity = item.storeCity || product.store?.city;

          enrichedItems.push({
            productId: item.productId,
            productName: item.name || 'Unknown Product',
            quantity: item.quantity,
            price: item.price,
            category: product.category || item.category || '',
            image: item.image || '',
            vendorId: vendorId || 'Unknown Vendor',
            storeName: storeName || 'Unknown Store',
            storeCity: storeCity || 'Unknown'
          });
        } else {
          const pkg = await packageRepository.findOne({
            where: { id: item.productId },
            relations: ['store']
          });

          if (!pkg) {
            return res.status(400).json({
              status: false,
              message: `Product ${item.productId} not found`
            });
          }

          if (!pkg.isActive) {
            return res.status(400).json({
              status: false,
              message: `Flash deal ${pkg.name} is not active`
            });
          }

          if (Number(pkg.quantity || 0) < Number(item.quantity || 0)) {
            return res.status(400).json({
              status: false,
              message: `Insufficient stock for ${pkg.name}. Available: ${pkg.quantity}, Requested: ${item.quantity}`
            });
          }

          const resolvedPrice = Number(pkg.vendorPrice ?? item.price ?? 0);
          if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
            return res.status(400).json({
              status: false,
              message: `Flash deal ${pkg.name} has an invalid price`
            });
          }
          const vendorId = pkg.vendorId || pkg.store?.ownerId || item.vendorId || 'Unknown Vendor';
          const storeName = pkg.store?.name || item.storeName || 'Unknown Store';
          const storeCity = pkg.store?.city || item.storeCity || 'Unknown';
          const image = pkg.image || pkg.images?.[0] || item.image || '';

          enrichedItems.push({
            productId: pkg.id,
            productName: pkg.name || item.name || 'Flash Deal Package',
            name: pkg.name || item.name || 'Flash Deal Package',
            packageName: pkg.name || item.name || 'Flash Deal Package',
            quantity: Number(item.quantity || 1),
            price: resolvedPrice,
            category: 'Flash Deal',
            image,
            vendorId,
            storeId: pkg.storeId || undefined,
            storeName,
            storeCity,
            isFlashDeal: true,
            packageType: 'flash_deal',
            packageId: pkg.id
          });
        }
      }
    }

    // âœ… SERVER-SIDE PRICE CALCULATION (coupon-aware)
    const subtotal = Number(
      enrichedItems
        .reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0)
        .toFixed(2)
    );
    const shippingAmount = Math.max(0, toNumber(metadata?.shipping_amount));
    let discountAmount = 0;
    let normalizedCouponCode = '';
    let appliedCouponId: string | null = null;

    const couponCode = String(metadata?.couponCode || '').trim();
    if (couponCode) {
      normalizedCouponCode = couponCode.toUpperCase();
      const couponRepo = AppDataSource.getRepository(Coupon);
      const coupon = await couponRepo.findOne({ where: { code: normalizedCouponCode } });

      if (!coupon || !coupon.isActive || String(coupon.status).toLowerCase() !== 'active') {
        return res.status(400).json({ status: false, message: 'Invalid or inactive coupon code' });
      }
      if (new Date(coupon.expiryDate) < new Date()) {
        return res.status(400).json({ status: false, message: 'Coupon has expired' });
      }
      if ((coupon.usageLimit || 0) > 0 && (coupon.timesUsed || 0) >= (coupon.usageLimit || 0)) {
        return res.status(400).json({ status: false, message: 'Coupon usage limit reached' });
      }

      const minimumOrderAmount = toNumber(coupon.minimumOrderAmount);
      if (minimumOrderAmount > 0 && subtotal < minimumOrderAmount) {
        return res.status(400).json({
          status: false,
          message: `Coupon requires a minimum order of ${minimumOrderAmount}`
        });
      }

      const categoryRules = (coupon.applicableCategories || []).filter(Boolean);
      if (categoryRules.length > 0) {
        const hasCategoryMatch = enrichedItems.some((item) =>
          categoryRules.includes(String(item.category || ''))
        );
        if (!hasCategoryMatch) {
          return res.status(400).json({ status: false, message: 'Coupon does not apply to items in your cart' });
        }
      }

      const vendorRules = (coupon.applicableVendors || []).filter(Boolean);
      if (vendorRules.length > 0) {
        const hasVendorMatch = enrichedItems.some((item) =>
          vendorRules.includes(String(item.vendorId || item.originalSellerId || ''))
        );
        if (!hasVendorMatch) {
          return res.status(400).json({ status: false, message: 'Coupon does not apply to this vendor' });
        }
      }

      const percentage = toNumber(coupon.discountPercentage);
      const flatAmount = toNumber(coupon.discountAmount);
      const maximumDiscount = toNumber(coupon.maximumDiscount);

      if (percentage > 0) {
        discountAmount = (subtotal * percentage) / 100;
      } else if (flatAmount > 0) {
        discountAmount = flatAmount;
      }

      if (maximumDiscount > 0) {
        discountAmount = Math.min(discountAmount, maximumDiscount);
      }
      discountAmount = Number(Math.max(0, Math.min(discountAmount, subtotal)).toFixed(2));
      appliedCouponId = coupon.id;
    }

    const finalAmount = Number(Math.max(0, subtotal + shippingAmount - discountAmount).toFixed(2));
    if (finalAmount <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid final payment amount' });
    }

    const normalizedReferralCode = normalizeReferralCode(metadata?.referralCode);
    if (normalizedReferralCode) {
      const orderRepository = AppDataSource.getRepository(Order);
      const successfulOrdersCount = await orderRepository.count({
        where: {
          userId,
          paymentStatus: In([PaymentStatus.PAID, PaymentStatus.COMPLETED])
        }
      });
      if (successfulOrdersCount > 0) {
        return res.status(400).json({
          status: false,
          message: 'Referral code can only be applied on your first successful purchase.'
        });
      }

      const referralRepo = AppDataSource.getRepository(Referral);
      const referral = await referralRepo.findOne({
        where: { referralCode: normalizedReferralCode, status: ReferralStatus.ACTIVE }
      });
      if (!referral) {
        return res.status(400).json({ status: false, message: 'Invalid referral code' });
      }
      if (String(referral.referrerId) === String(userId)) {
        return res.status(400).json({ status: false, message: 'You cannot use your own referral code' });
      }
    }

    if (clientAmount > 0 && Math.abs(clientAmount - finalAmount) > 0.01) {
      console.warn('[PAYMENT] Client/server amount mismatch. Using server amount.', {
        clientAmount,
        finalAmount
      });
    }

    // âœ… Validation complete - now initialize Paystack payment
    const amountInKobo = Math.round(finalAmount * 100);
    const reference = `RZM-${userId}-${Date.now()}`;

    const paystackPayload = {
      amount: amountInKobo,
      email,
      reference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`,
      metadata: {
        userId,
        enrichedItems, // Store enriched items for order creation after payment succeeds
        shippingAddress: metadata?.shipping_address || {},
        couponCode: normalizedCouponCode || null,
        couponId: appliedCouponId,
        pricing: {
          subtotal,
          shippingAmount,
          discountAmount,
          finalAmount
        },
        ...metadata,
        referralCode: normalizedReferralCode || null
      }
    };

    console.log('[PAYMENT] Initializing Paystack transaction (NO ORDER YET):', reference);

    // Initialize Paystack transaction
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      paystackPayload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[PAYMENT] âœ“ Paystack initialized successfully');
    console.log('[PAYMENT] â„¹ï¸ Order will be created ONLY after payment verification');

    res.json({
      success: true,
      status: true,
      message: 'Payment initialized - order will be created after payment verification',
      reference,
      pricing: {
        subtotal,
        shippingAmount,
        discountAmount,
        finalAmount
      },
      data: response.data.data
    });
  } catch (error: any) {
    console.error('[PAYMENT] Initialize payment error:', error.response?.data || error.message);
    res.status(500).json({
      status: false,
      message: error.response?.data?.message || 'Failed to initialize payment',
      error: error.response?.data || error.message
    });
  }
};

/**
 * âœ… REFACTORED: Verify Payment AND Create Order (if not exists)
 * 
 * Simple, idempotent flow:
 * 1. Verify payment with Paystack
 * 2. Check if order already exists
 * 3. If yes â†’ Return success (idempotent)
 * 4. If no â†’ Create order in transaction
 * 5. Reduce stock
 * 6. Send emails
 */
export const verifyPayment = async (req: any, res: Response) => {
  const reference = req.params?.reference;
  
  if (!reference) {
    return res.status(400).json({
      status: false,
      message: 'Payment reference is required'
    });
  }

  console.log('[VERIFY] === Payment Verification Request ===');
  console.log('[VERIFY] Reference:', reference);

  try {
    // STEP 1: Verify payment with Paystack
    console.log('[VERIFY] Step 1: Verifying payment with Paystack...');
    const paystackResponse = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const paystackData = paystackResponse.data;
    if (!paystackData.status) {
      console.warn('[VERIFY] Paystack API returned non-success status');
      return res.status(400).json({
        status: false,
        message: 'Paystack verification failed',
        data: paystackData
      });
    }

    const transactionData = paystackData.data;
    console.log('[VERIFY] âœ“ Paystack verification successful');
    console.log('[VERIFY] Transaction status:', transactionData.status);
    console.log('[VERIFY] Amount:', transactionData.amount, 'kobo');

    // âœ… ONLY proceed if payment is successful
    if (transactionData.status !== 'success') {
      console.log('[VERIFY] Payment not successful, status:', transactionData.status);
      return res.json({
        status: true,
        message: 'Payment not successful',
        data: {
          reference: transactionData.reference,
          amount: transactionData.amount / 100,
          status: transactionData.status,
          orderId: null
        }
      });
    }

    // STEP 2: Check if order already exists
    const orderRepository = AppDataSource.getRepository(Order);
    console.log('[VERIFY] Step 2: Checking if order already exists for reference:', reference);

    const existingOrder = await orderRepository.findOne({
      where: [{
        paymentReference: reference
      }, {
        paystackReference: reference
      }]
    });

    if (existingOrder) {
      console.log('[VERIFY] âœ“ Order already exists:', existingOrder.id);
      try {
        await applyReferralCommissionForOrder({
          order: existingOrder,
          buyerUserId: existingOrder.userId,
          referralCode: transactionData.metadata?.referralCode
        });
      } catch (referralError: any) {
        console.warn('[VERIFY] Referral processing skipped (existing order):', referralError?.message || referralError);
      }
      return res.json({
        status: true,
        message: 'Payment verified (order already created)',
        data: {
          reference: transactionData.reference,
          amount: transactionData.amount / 100,
          status: transactionData.status,
          orderId: existingOrder.id
        }
      });
    }

    console.log('[VERIFY] Order does not exist yet - will create');

    // STEP 3: Extract data from metadata
    const userId = transactionData.metadata?.userId;
    const enrichedItems = transactionData.metadata?.enrichedItems || [];
    const shippingAddress = transactionData.metadata?.shippingAddress || {};
    const couponId = transactionData.metadata?.couponId;
    const couponCode = transactionData.metadata?.couponCode;

    if (!userId) {
      console.warn('[VERIFY] No userId in metadata');
      return res.status(400).json({
        status: false,
        message: 'Invalid payment metadata: missing userId'
      });
    }

    if (!enrichedItems || enrichedItems.length === 0) {
      console.warn('[VERIFY] No enriched items in metadata');
      return res.status(400).json({
        status: false,
        message: 'Invalid payment metadata: missing items'
      });
    }

    console.log('[VERIFY] Step 3: Creating order...');
    const amountInNaira = Math.round((transactionData.amount / 100) * 100) / 100;

    // STEP 4: Create order
    let newOrder: Order | null = null;
    try {
      newOrder = await createOrderFromItems(
        userId,
        enrichedItems,
        amountInNaira,
        shippingAddress,
        reference
      );
    } catch (orderError: any) {
      console.error('[VERIFY] âŒ Order creation threw error:', orderError.message);
      return res.status(500).json({
        status: false,
        message: 'Order creation failed: ' + orderError.message,
        error: orderError.message
      });
    }

    if (!newOrder) {
      console.error('[VERIFY] âŒ Order creation returned null');
      return res.status(500).json({
        status: false,
        message: 'Order creation returned null - unknown error'
      });
    }

    console.log('[VERIFY] âœ“ Order created successfully:', newOrder.id);
    const orderId = newOrder.id;

    // STEP 5: Update order status to PAID
    console.log('[VERIFY] Step 4: Updating order status...');
    await orderRepository.update(
      { id: orderId },
      {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: 'processing',
        paystackReference: transactionData.reference
      }
    );
    console.log('[VERIFY] âœ“ Order status updated to PAID');

    try {
      await applyReferralCommissionForOrder({
        order: { ...newOrder, paymentStatus: PaymentStatus.PAID } as Order,
        buyerUserId: userId,
        referralCode: transactionData.metadata?.referralCode
      });
    } catch (referralError: any) {
      console.warn('[VERIFY] Referral processing skipped:', referralError?.message || referralError);
    }

    // STEP 4B: Mark coupon usage (non-blocking)
    if (couponId || couponCode) {
      try {
        const couponRepo = AppDataSource.getRepository(Coupon);
        const coupon = couponId
          ? await couponRepo.findOne({ where: { id: String(couponId) } })
          : await couponRepo.findOne({ where: { code: String(couponCode || '').toUpperCase() } });
        if (coupon) {
          coupon.timesUsed = (coupon.timesUsed || 0) + 1;
          await couponRepo.save(coupon);
          console.log('[VERIFY] âœ“ Coupon usage updated:', coupon.code);
        }
      } catch (couponError: any) {
        console.warn('[VERIFY] âš ï¸ Failed to update coupon usage (non-blocking):', couponError?.message || couponError);
      }
    }

    // STEP 6: Reduce stock (non-blocking)
    console.log('[VERIFY] Step 5: Reducing stock...');
    try {
      await reduceStock(newOrder);
    } catch (stockError: any) {
      console.warn('[VERIFY] âš ï¸ Stock reduction error (non-blocking):', stockError.message);
    }

    // STEP 7: Send emails (non-blocking)
    console.log('[VERIFY] Step 6: Sending confirmation emails...');
    try {
      await sendOrderEmails(userId, newOrder, transactionData);
    } catch (emailError: any) {
      console.warn('[VERIFY] âš ï¸ Email error (non-blocking):', emailError.message);
    }

    // âœ… Return success
    console.log('[VERIFY] âœ“ Payment verification complete');
    res.json({
      status: true,
      message: 'Payment verified and order created',
      data: {
        reference: transactionData.reference,
        amount: transactionData.amount / 100,
        status: transactionData.status,
        orderId: orderId
      }
    });

  } catch (error: any) {
    console.error('[VERIFY] Error in payment verification:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    res.status(500).json({
      status: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

/**
 * Helper: Reduce stock for order items
 */
const reduceStock = async (order: Order) => {
  const productRepository = AppDataSource.getRepository(Product);
  const packageRepository = AppDataSource.getRepository(Package);
  const storeRepository = AppDataSource.getRepository(Store);

  if (!order.items || !Array.isArray(order.items)) {
    console.log('[STOCK] No items to reduce');
    return;
  }

  console.log('[STOCK] Reducing stock for', order.items.length, 'items');
  const storeUpdates = new Map<string, { sales: number; revenue: number }>();

  for (const item of order.items) {
    if (item.isSwapItem) {
      console.log('[STOCK] Skipping swap item:', item.productId);
      continue;
    }

    if (item.isFlashDeal || item.packageType || item.packageId) {
      const packageId = (item.packageId || item.productId) as string;
      const pkg = await packageRepository.findOne({
        where: { id: packageId },
        relations: ['store']
      });

      if (!pkg) {
        console.warn('[STOCK] Flash deal package not found:', packageId);
        continue;
      }

      const currentQty = Number(pkg.quantity || 0);
      const reduceBy = Number(item.quantity || 0);

      if (currentQty >= reduceBy && reduceBy > 0) {
        pkg.quantity = currentQty - reduceBy;
        await packageRepository.save(pkg);
        console.log('[STOCK] ✅ Reduced flash deal package stock by', reduceBy, 'for', pkg.name);

        const storeId = pkg.storeId || pkg.store?.id;
        if (storeId) {
          const current = storeUpdates.get(storeId) || { sales: 0, revenue: 0 };
          current.sales += reduceBy;
          current.revenue += Number(item.price || 0) * reduceBy;
          storeUpdates.set(storeId, current);
        }
      } else {
        console.warn('[STOCK] ❌ Insufficient flash deal stock for', pkg.name);
      }

      continue;
    }

    const product = await productRepository.findOne({
      where: { id: item.productId }
    });

    if (!product) {
      console.warn('[STOCK] Product not found:', item.productId);
      continue;
    }

    if (product.stock >= item.quantity) {
      product.stock -= item.quantity;
      await productRepository.save(product);
      console.log('[STOCK] âœ“ Reduced', item.productName, 'stock by', item.quantity);

      // Track for store update
      const storeId = product.storeId;
      if (storeId) {
        const current = storeUpdates.get(storeId) || { sales: 0, revenue: 0 };
        current.sales += item.quantity;
        current.revenue += item.price * item.quantity;
        storeUpdates.set(storeId, current);
      }
    } else {
      console.warn('[STOCK] âœ— Insufficient stock for', item.productName);
    }
  }

  // Update store totals
  const storeRepository_local = AppDataSource.getRepository(Store);
  for (const [storeId, updates] of storeUpdates.entries()) {
    const store = await storeRepository_local.findOne({ where: { id: storeId } });
    if (store) {
      store.totalSales = (store.totalSales || 0) + updates.sales;
      store.totalRevenue = (parseFloat(store.totalRevenue.toString()) || 0) + updates.revenue;
      await storeRepository_local.save(store);
      console.log('[STOCK] âœ“ Updated store', storeId);
    }
  }
};

/**
 * Helper: Send order confirmation emails
 */
const sendOrderEmails = async (userId: string, order: Order, paystackData: any) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user) {
    console.warn('[EMAIL] User not found:', userId);
    return;
  }

  console.log('[EMAIL] Sending emails for order:', order.id);

  // Send customer confirmation
  try {
    await emailService.sendPaymentConfirmation(user.email, user.firstName, {
      reference: paystackData.reference,
      amount: `${paystackData.amount / 100}`,
      orderId: order.id,
      paidAt: paystackData.paid_at
    });
    console.log('[EMAIL] âœ“ Customer confirmation sent');
  } catch (err) {
    console.warn('[EMAIL] âš ï¸ Customer email failed');
  }

  try {
    await NotificationService.createNotification(
      user.id,
      NotificationType.ORDER,
      'Order placed',
      `Your order ${order.orderNumber || order.id} was received.`,
      { relatedId: order.id, actionUrl: '/orders' }
    );
    await NotificationService.createNotification(
      user.id,
      NotificationType.PAYMENT,
      'Payment received',
      `Payment received for order ${order.orderNumber || order.id}.`,
      { relatedId: order.id, actionUrl: '/orders' }
    );
  } catch (notifyError) {
    console.warn('[NOTIFY] Customer notifications failed:', notifyError);
  }


  // Send order confirmation (redundant safety)
  try {
    await emailService.sendOrderConfirmation(user.email, user.firstName, {
      id: order.id,
      total: `${order.total || order.totalPrice || 0}`,
    });
    console.log('[EMAIL] âœ“ Order confirmation sent');
  } catch (err) {
    console.warn('[EMAIL] âš ï¸ Order confirmation failed');
  }
  // Send vendor notifications
  if (!order.items || !Array.isArray(order.items)) return;

  const vendorGroups = new Map<string, any>();
  order.items.forEach((item: any) => {
    const vendorId = item.vendorId;
    if (vendorId && vendorId !== 'Unknown Vendor') {
      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, []);
      }
      vendorGroups.get(vendorId).push(item);
    }
  });

  for (const [vendorId, vendorItems] of vendorGroups.entries()) {
    try {
      const vendor = await userRepository.findOne({ where: { id: vendorId } });
      if (vendor && vendor.email) {
        await emailService.sendVendorPurchaseNotification(
          vendor.email,
          vendor.firstName || 'Vendor',
          {
            orderId: order.id,
            customerName: user.firstName + ' ' + user.lastName,
            customerEmail: user.email,
            items: vendorItems,
            shippingAddress: order.shippingAddress
          }
        );
        console.log('[EMAIL] âœ“ Vendor email sent:', vendorId);
      }
    } catch (err) {
        console.warn('[EMAIL] âš ï¸ Vendor email failed:', vendorId);
    }
  }

  // Send vendor in-app notifications
  try {
    for (const [vendorId] of vendorGroups.entries()) {
      await NotificationService.createNotification(
        vendorId,
        NotificationType.ORDER,
        'New order received',
        `You have a new order (#${order.id.slice(0, 8)}).`,
        { relatedId: order.id, actionUrl: '/vendor-dashboard?tab=orders' }
      );
      await NotificationService.createNotification(
        vendorId,
        NotificationType.PAYMENT,
        'Payment received',
        `Payment received for order #${order.id.slice(0, 8)}.`,
        { relatedId: order.id, actionUrl: '/vendor-dashboard?tab=orders' }
      );
    }
    console.log('[NOTIFY] âœ“ Vendor notifications created for order:', order.id);
  } catch (err) {
    console.warn('[NOTIFY] âš ï¸ Vendor notifications failed:', err);
  }

  // Send admin notifications
  try {
    const admins = await userRepository.find({ where: { role: UserRole.ADMIN } });
    await Promise.all(
      admins.map((admin) =>
        NotificationService.createNotification(
          admin.id,
          NotificationType.ORDER,
          'New order placed',
          `Order #${order.id.slice(0, 8)} has been paid.`,
          { relatedId: order.id, actionUrl: '/admin/orders-management' }
        )
      )
    );
    console.log('[NOTIFY] âœ“ Admin notifications created for order:', order.id);
  } catch (err) {
    console.warn('[NOTIFY] âš ï¸ Admin notifications failed:', err);
  }
};

/**
 * âœ… REFACTORED: Webhook Handler for Paystack Events
 * 
 * Handles both:
 * 1. Old orders (orderId in metadata) - for backwards compatibility
 * 2. New orders (enrichedItems in metadata) - creates order on webhook
 */
export const handlePaystackWebhook = async (req: any, res: Response) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Verify webhook signature
    if (hash !== req.headers['x-paystack-signature']) {
      console.error('[WEBHOOK] âŒ Webhook signature verification failed');
      return res.status(401).json({ status: false, message: 'Unauthorized' });
    }

    const event = req.body;
    console.log('=== Paystack Webhook Event ===');
    console.log('Event Type:', event.event);
    console.log('Reference:', event.data?.reference);

    // Handle charge.success and payment.success events
    if (event.event === 'charge.success' || event.event === 'payment.success') {
      const { data } = event;

      if (data.status === 'success') {
        const installmentResult = await processInstallmentFirstPaymentWebhook(data);
        if (installmentResult?.handled) {
          console.log('[WEBHOOK] Installment payment handled:', installmentResult);
          res.status(200).json({ status: 'success', message: 'Installment webhook processed' });
          return;
        }
        const webhookReference = data.reference;
        const userId = data.metadata?.userId;
        const enrichedItems = data.metadata?.enrichedItems || [];
        const shippingAddress = data.metadata?.shippingAddress || {};

        console.log('[WEBHOOK] Payment successful for reference:', webhookReference);
        console.log('[WEBHOOK] User ID:', userId);
        console.log('[WEBHOOK] Has enrichedItems:', enrichedItems.length > 0);

        // âœ… NEW FLOW: Create order from enrichedItems
        if (userId && enrichedItems.length > 0) {
          console.log('[WEBHOOK] Creating order from enrichedItems...');
          const order = await createOrderFromItems(
            userId,
            enrichedItems,
            Math.round((data.amount / 100) * 100) / 100, // Convert from kobo to naira
            shippingAddress,
            webhookReference
          );

          if (!order) {
            console.error('[WEBHOOK] âŒ Failed to create order from webhook');
            res.status(200).json({ status: 'success', message: 'Webhook processed - order creation failed' });
            return;
          }

          console.log('[WEBHOOK] âœ“ Order created:', order.id);
          const orderId = order.id;

          // âœ… Reduce stock for items
          const userRepository = AppDataSource.getRepository(User);
          const productRepository = AppDataSource.getRepository(Product);
          const storeRepository = AppDataSource.getRepository(Store);
          const orderRepository = AppDataSource.getRepository(Order);

          if (order.items && Array.isArray(order.items)) {
            console.log(`[WEBHOOK] Reducing stock for ${order.items.length} items`);
            const storeUpdates = new Map<string, { salesIncrease: number; revenueIncrease: number }>();

            for (const item of order.items) {
              const product = await productRepository.findOne({
                where: { id: item.productId }
              });

              if (product) {
                if (product.stock >= item.quantity) {
                  product.stock -= item.quantity;
                  await productRepository.save(product);
                  console.log(`[WEBHOOK] âœ“ Stock reduced for ${product.name}: ${item.quantity} units`);

                  // Track store updates
                  const storeId = product.storeId;
                  if (storeId) {
                    const current = storeUpdates.get(storeId) || { salesIncrease: 0, revenueIncrease: 0 };
                    current.salesIncrease += item.quantity;
                    current.revenueIncrease += parseFloat(product.price.toString()) * item.quantity;
                    storeUpdates.set(storeId, current);
                  }
                } else {
                  console.warn(`[WEBHOOK] âš ï¸ Insufficient stock for ${item.productId}`);
                }
              }
            }

            // Update store totals
            for (const [storeId, updates] of storeUpdates.entries()) {
              const store = await storeRepository.findOne({ where: { id: storeId } });
              if (store) {
                store.totalSales = (store.totalSales || 0) + updates.salesIncrease;
                store.totalRevenue = (parseFloat(store.totalRevenue.toString()) || 0) + updates.revenueIncrease;
                await storeRepository.save(store);
                console.log(`[WEBHOOK] âœ“ Updated store ${storeId}`);
              }
            }
          }

          // âœ… Update order status
          await orderRepository.update(
            { id: orderId },
            {
              paymentStatus: PaymentStatus.PAID,
              orderStatus: 'processing',
              paystackReference: data.reference
            }
          );
          console.log('[WEBHOOK] âœ“ Order status updated to PROCESSING');

          try {
            await applyReferralCommissionForOrder({
              order: { ...order, paymentStatus: PaymentStatus.PAID } as Order,
              buyerUserId: userId,
              referralCode: data.metadata?.referralCode
            });
          } catch (referralError: any) {
            console.warn('[WEBHOOK] Referral processing skipped:', referralError?.message || referralError);
          }

          // âœ… Send emails
          try {
            const user = await userRepository.findOne({ where: { id: userId } });
            if (user) {
              await emailService.sendPaymentConfirmation(user.email, user.firstName, {
                reference: data.reference,
                amount: `${data.amount / 100}`,
                orderId: orderId,
                paidAt: new Date().toISOString()
              }).catch(() => console.warn('[WEBHOOK] âš ï¸ Payment email failed'));

            
  // Send order confirmation (redundant safety)
  try {
    await emailService.sendOrderConfirmation(user.email, user.firstName, {
      id: order.id,
      total: `${order.total || order.totalPrice || 0}`,
    });
    console.log('[EMAIL] âœ“ Order confirmation sent');
  } catch (err) {
    console.warn('[EMAIL] âš ï¸ Order confirmation failed');
  }
  // Send vendor notifications
              if (order.items && Array.isArray(order.items)) {
                const vendorGroups = new Map<string, any>();
                order.items.forEach((item: any) => {
                  const vendorId = item.vendorId;
                  if (vendorId && vendorId !== 'Unknown Vendor') {
                    if (!vendorGroups.has(vendorId)) {
                      vendorGroups.set(vendorId, []);
                    }
                    vendorGroups.get(vendorId).push(item);
                  }
                });

                for (const [vendorId, vendorItems] of vendorGroups.entries()) {
                  const vendor = await userRepository.findOne({ where: { id: vendorId } });
                  if (vendor && vendor.email) {
                    await emailService.sendVendorPurchaseNotification(vendor.email, vendor.firstName || 'Vendor', {
                      orderId: orderId,
                      customerName: user.firstName + ' ' + user.lastName,
                      customerEmail: user.email,
                      items: vendorItems,
                      shippingAddress: order.shippingAddress
                    }).catch(() => console.warn('[WEBHOOK] âš ï¸ Vendor email failed'));
                  }
                }

                try {
                  for (const [vendorId] of vendorGroups.entries()) {
                    await NotificationService.createNotification(
                      vendorId,
                      NotificationType.ORDER,
                      'New order received',
                      `You have a new order (#${orderId.slice(0, 8)}).`,
                      { relatedId: orderId, actionUrl: '/vendor-dashboard?tab=orders' }
                    );
                  }
                  console.log('[WEBHOOK] âœ“ Vendor notifications created');
                } catch (notifyErr) {
                  console.warn('[WEBHOOK] âš ï¸ Vendor notifications failed:', notifyErr);
                }
              }
            }
          } catch (emailError) {
            console.warn('[WEBHOOK] âš ï¸ Email error (non-critical):', emailError);
          }
        } else {
          console.warn('[WEBHOOK] âš ï¸ Missing userId or enrichedItems - cannot create order');
        }
      } else {
        console.log('[WEBHOOK] Payment not successful:', data.status);
      }
    }

    // Always return 200 to acknowledge webhook receipt
    res.status(200).json({ status: 'success', message: 'Webhook processed' });
  } catch (error: any) {
    console.error('[WEBHOOK] âŒ Processing error:', error.message);
    // Still return 200 to prevent Paystack from retrying
    res.status(200).json({ status: 'success', message: 'Webhook processed with error' });
  }
};

