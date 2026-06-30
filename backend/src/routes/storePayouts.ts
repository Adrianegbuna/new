import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getAllPayoutRequests,
  createPayoutRequest,
  getUserPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  getPayoutRequestDetails,
  cancelPayoutRequest
} from '../controllers/storePayoutController';
import { body, validationResult } from 'express-validator';

const router = Router();

// Admin routes
router.get('/admin/all', authMiddleware, (req: any, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}, getAllPayoutRequests);

router.get('/admin/:id', authMiddleware, (req: any, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}, getPayoutRequestDetails);

router.put(
  '/admin/:id/approve',
  authMiddleware,
  (req: any, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  },
  [
    body('transactionReference').optional().isString(),
    body('notes').optional().isString()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  approvePayoutRequest
);

router.put(
  '/admin/:id/reject',
  authMiddleware,
  (req: any, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  },
  [
    body('rejectionReason').notEmpty().withMessage('Rejection reason is required')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  rejectPayoutRequest
);

// Vendor routes
router.post(
  '/create',
  authMiddleware,
  [
    body('storeId').notEmpty().withMessage('Store ID is required'),
    body('amount').isNumeric().toFloat().custom(val => val >= 1000).withMessage('Minimum payout amount is \u20A61,000'),
    body('bankDetails.bankName').notEmpty().withMessage('Bank name is required'),
    body('bankDetails.accountName').notEmpty().withMessage('Account name is required'),
    body('bankDetails.accountNumber').notEmpty().withMessage('Account number is required')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  createPayoutRequest
);

router.get('/my-requests', authMiddleware, getUserPayoutRequests);

router.delete('/:id/cancel', authMiddleware, cancelPayoutRequest);

export default router;




