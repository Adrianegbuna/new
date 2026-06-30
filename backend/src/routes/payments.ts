import { Router } from 'express';
import { initializePayment, verifyPayment, handlePaystackWebhook } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/initialize', authMiddleware, initializePayment);
router.get('/verify/:reference', verifyPayment);
router.post('/webhook', handlePaystackWebhook);

export default router;
