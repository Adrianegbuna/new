import express, { Router } from 'express';
import { body } from 'express-validator';
import { payoutRequestController } from '../controllers/payoutRequestController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Middleware to verify authentication
router.use(authMiddleware);

// IMPORTANT: Specific routes must come BEFORE parameter routes (/:id)

// User routes - Create payout request
router.post(
  '/',
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('accountHolderName').notEmpty().withMessage('Account holder name is required'),
  body('requestedAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Requested amount must be greater than 0'),
  payoutRequestController.createPayoutRequest.bind(payoutRequestController)
);

// User routes - Get my requests
router.get(
  '/my-requests',
  payoutRequestController.getUserPayoutRequests.bind(payoutRequestController)
);

// Admin routes - Get stats (must come BEFORE /:id parameter route)
router.get(
  '/admin/stats',
  payoutRequestController.getPayoutStats.bind(payoutRequestController)
);

// Admin routes - Get all payout requests
router.get(
  '/',
  payoutRequestController.getAllPayoutRequests.bind(payoutRequestController)
);

// User routes - Approve payout request (admin)
router.post(
  '/:id/approve',
  body('adminNotes').optional().isString(),
  payoutRequestController.approvePayoutRequest.bind(payoutRequestController)
);

// User routes - Reject payout request (admin)
router.post(
  '/:id/reject',
  body('rejectionReason')
    .notEmpty()
    .withMessage('Rejection reason is required'),
  payoutRequestController.rejectPayoutRequest.bind(payoutRequestController)
);

// User routes - Mark as processing
router.post(
  '/:id/mark-processing',
  payoutRequestController.markAsProcessing.bind(payoutRequestController)
);

// User routes - Mark as completed
router.post(
  '/:id/mark-completed',
  body('transactionReference')
    .notEmpty()
    .withMessage('Transaction reference is required'),
  payoutRequestController.markAsCompleted.bind(payoutRequestController)
);

// User routes - Cancel payout request
router.post(
  '/:id/cancel',
  payoutRequestController.cancelPayoutRequest.bind(payoutRequestController)
);

// User routes - Get single payout request (must come LAST to avoid matching parameters)
router.get(
  '/:id',
  payoutRequestController.getPayoutRequestById.bind(payoutRequestController)
);

export default router;
