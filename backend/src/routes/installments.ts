import { Router } from 'express';
import { 
  submitInstallmentApplication, 
  getMyApplications, 
  getAllApplications,
  approveApplication,
  rejectApplication,
  updateApplicationProgress,
  updateInstallmentPaymentStatus,
  initializeInstallmentPayment,
  verifyInstallmentFirstPayment,
  reconcileInstallmentPayment,
  processDueDebitsManually,
  createInstallment,
  getUserInstallments,
  getInstallmentDetails,
  updateChequeStatus,
  addChequeToInstallment,
  cancelInstallment,
  getInstallmentStats,
  getAllInstallments
} from '../controllers/installmentController';
import { getVendorInstallmentApplications } from '../controllers/installmentController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// Customer routes - Existing
router.post('/apply', authMiddleware, submitInstallmentApplication);
router.get('/my-applications', authMiddleware, getMyApplications);
router.post('/initialize-payment', authMiddleware, initializeInstallmentPayment);
router.get('/verify-first-payment/:reference', authMiddleware, verifyInstallmentFirstPayment);
router.post('/admin/reconcile/:applicationId', authMiddleware, adminMiddleware, reconcileInstallmentPayment);

// Admin routes - Must come before parameterized routes
router.get('/all', authMiddleware, adminMiddleware, getAllApplications);
router.get('/admin/all-installments', authMiddleware, adminMiddleware, getAllInstallments);
router.get('/admin/stats', authMiddleware, adminMiddleware, getInstallmentStats);
router.get('/vendor/applications', authMiddleware, getVendorInstallmentApplications);
router.post('/admin/process-due-debits', authMiddleware, adminMiddleware, processDueDebitsManually);
router.patch('/admin/:id/progress', authMiddleware, adminMiddleware, updateApplicationProgress);
router.patch('/admin/:id/payment-status', authMiddleware, adminMiddleware, updateInstallmentPaymentStatus);
router.put('/cheque/:chequeId/status', authMiddleware, adminMiddleware, updateChequeStatus);
router.post('/:installmentId/cheque', authMiddleware, adminMiddleware, addChequeToInstallment);

// Customer routes - Cheque tracking
router.post('/create', authMiddleware, createInstallment);
router.get('/user/all', authMiddleware, getUserInstallments);
router.get('/:id/details', authMiddleware, getInstallmentDetails);
router.post('/:id/cancel', authMiddleware, cancelInstallment);

// Parameterized routes - Must come last
router.put('/:id/approve', authMiddleware, adminMiddleware, approveApplication);
router.put('/:id/reject', authMiddleware, adminMiddleware, rejectApplication);

export default router;
