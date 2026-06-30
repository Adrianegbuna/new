import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Coupon } from '../models/Coupon';

const router = Router();

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
};

const calculateDiscount = (coupon: Coupon, subtotal: number) => {
  const percentage = toNumber(coupon.discountPercentage);
  const flatAmount = toNumber(coupon.discountAmount);
  const maximumDiscount = toNumber(coupon.maximumDiscount);

  let discount = 0;
  if (percentage > 0) {
    discount = (subtotal * percentage) / 100;
  } else if (flatAmount > 0) {
    discount = flatAmount;
  }

  if (maximumDiscount > 0) {
    discount = Math.min(discount, maximumDiscount);
  }

  discount = Math.max(0, Math.min(discount, subtotal));
  return Number(discount.toFixed(2));
};

router.get('/list', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Coupon);
    const now = new Date();
    const coupons = await repo.find({
      where: { isActive: true, status: 'active' },
      order: { createdAt: 'DESC' }
    });

    const activeCoupons = coupons.filter((c) => new Date(c.expiryDate) >= now);

    res.json({
      success: true,
      data: activeCoupons
    });
  } catch (error: any) {
    console.error('[COUPONS] Failed to fetch list:', error?.message || error);
    res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body || {};
    const normalizedCode = String(code || '').trim().toUpperCase();
    const subtotalAmount = toNumber(subtotal);

    if (!normalizedCode) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }
    if (subtotalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Subtotal must be greater than zero' });
    }

    const repo = AppDataSource.getRepository(Coupon);
    const coupon = await repo.findOne({ where: { code: normalizedCode } });

    if (!coupon || !coupon.isActive || String(coupon.status).toLowerCase() !== 'active') {
      return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });
    }

    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'This coupon has expired' });
    }

    if ((coupon.usageLimit || 0) > 0 && (coupon.timesUsed || 0) >= (coupon.usageLimit || 0)) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
    }

    const minimumOrderAmount = toNumber(coupon.minimumOrderAmount);
    if (minimumOrderAmount > 0 && subtotalAmount < minimumOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount for this coupon is ${minimumOrderAmount}`
      });
    }

    const discountAmount = calculateDiscount(coupon, subtotalAmount);
    const finalTotal = Number((subtotalAmount - discountAmount).toFixed(2));

    res.json({
      success: true,
      data: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountAmount,
        finalTotal
      }
    });
  } catch (error: any) {
    console.error('[COUPONS] Validation failed:', error?.message || error);
    res.status(500).json({ success: false, message: 'Failed to validate coupon' });
  }
});

export default router;
