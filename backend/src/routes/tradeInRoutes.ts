import { Router, Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { TradeIn } from '../models/TradeIn';
import { tradeInService } from '../services/tradeInService';

const router = Router();
const tradeInRepository = AppDataSource.getRepository(TradeIn);

// Validation middleware
const validateTradeInCreation = [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('interestedInProduct').trim().notEmpty().withMessage('Interested product is required'),
  body('productCondition').isIn(['Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid product condition'),
  body('estimatedPrice').isFloat({ min: 0 }).withMessage('Estimated price must be a positive number'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('images').isArray({ min: 1, max: 1 }).withMessage('Exactly one image is required'),
];

// POST /api/trade-ins - Create new trade-in request
router.post(
  '/',
  authMiddleware,
  validateTradeInCreation,
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productName, interestedInProduct, productCondition, estimatedPrice, quantity, images } = req.body;

      const tradeIn = await tradeInService.createTradeIn({
        userId: req.user!.userId,
        productName,
        interestedInProduct,
        productCondition,
        estimatedPrice,
        quantity,
        inspectionFee: 0,
        deliveryOption: 'both',
        images
      });

      res.status(201).json({
        message: 'Trade-in request submitted successfully. Our team will quote your product shortly.',
        data: tradeIn,
      });
    } catch (error: any) {
      console.error('Error creating trade-in:', error);
      res.status(500).json({ message: error.message || 'Failed to create trade-in request' });
    }
  }
);

// GET /api/trade-ins/approved - Get approved trade-ins (public)
router.get('/approved', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const tradeIns = await tradeInService.getApprovedTradeIns(skip, limit);
    res.json(tradeIns);
  } catch (error: any) {
    console.error('Error fetching approved trade-ins:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch trade-ins' });
  }
});

// GET /api/trade-ins/my-requests - Get user's trade-in requests
router.get(
  '/my-requests',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const tradeIns = await tradeInService.getUserTradeIns(req.user!.userId);
      res.json(tradeIns);
    } catch (error: any) {
      console.error('Error fetching user trade-ins:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch your trade-in requests' });
    }
  }
);

// GET /api/trade-ins/my-listings - Get user's trade-in listings (alias for my-requests)
router.get(
  '/my-listings',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const tradeIns = await tradeInService.getUserTradeIns(req.user!.userId);
      res.json({
        success: true,
        data: tradeIns
      });
    } catch (error: any) {
      console.error('Error fetching user trade-in listings:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch your trade-in listings' });
    }
  }
);

// GET /api/trade-ins/:id - Get single trade-in details
router.get('/:id', param('id').isUUID().withMessage('Invalid trade-in ID'), async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tradeIn = await tradeInService.getTradeInById(req.params.id);
    if (!tradeIn) {
      return res.status(404).json({ message: 'Trade-in request not found' });
    }

    res.json(tradeIn);
  } catch (error: any) {
    console.error('Error fetching trade-in:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch trade-in' });
  }
});

// GET /api/trade-ins - Get all trade-ins (admin only)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check admin role
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const statusParam = req.query.status as string | undefined;
    let status: any = undefined;
    
    if (statusParam) {
      // Map status string to enum value
      const statusMap: { [key: string]: any } = {
        'PENDING': 'pending',
        'QUOTED': 'quoted',
        'APPROVED': 'approved',
        'REJECTED': 'rejected',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled'
      };
      status = statusMap[statusParam.toUpperCase()];
    }

    const result = await tradeInService.getAllTradeIns(status);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching all trade-ins:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch trade-ins' });
  }
});

// POST /api/trade-ins/:id/quote - Send quote for trade-in (admin only)
router.post(
  '/:id/quote',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid trade-in ID'),
  body('quotedPrice').isFloat({ min: 0 }).withMessage('Quoted price must be a positive number'),
  body('quotationNotes').optional().trim(),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check admin role
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const tradeIn = await tradeInService.quoteTradeIn(req.params.id, {
        quotedPrice: req.body.quotedPrice,
        quotationNotes: req.body.quotationNotes,
        quotedBy: req.user!.userId
      });

      res.json({ message: 'Quote sent successfully', data: tradeIn });
    } catch (error: any) {
      console.error('Error sending quote:', error);
      res.status(500).json({ message: error.message || 'Failed to send quote' });
    }
  }
);

// POST /api/trade-ins/:id/approve - Approve trade-in (admin only)
router.post(
  '/:id/approve',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid trade-in ID'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check admin role
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const tradeIn = await tradeInService.approveTradeIn(req.params.id, req.user!.userId);
      res.json({ message: 'Trade-in approved successfully', data: tradeIn });
    } catch (error: any) {
      console.error('Error approving trade-in:', error);
      res.status(500).json({ message: error.message || 'Failed to approve trade-in' });
    }
  }
);

// POST /api/trade-ins/:id/reject - Reject trade-in (admin only)
router.post(
  '/:id/reject',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid trade-in ID'),
  body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check admin role
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const tradeIn = await tradeInService.rejectTradeIn(req.params.id, req.body.reason, req.user!.userId);
      res.json({ message: 'Trade-in rejected successfully', data: tradeIn });
    } catch (error: any) {
      console.error('Error rejecting trade-in:', error);
      res.status(500).json({ message: error.message || 'Failed to reject trade-in' });
    }
  }
);

// POST /api/trade-ins/:id/complete - Mark trade-in as complete (admin only)
router.post(
  '/:id/complete',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid trade-in ID'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check admin role
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const tradeIn = await tradeInService.completeTradeIn(req.params.id);
      res.json({ message: 'Trade-in marked as complete', data: tradeIn });
    } catch (error: any) {
      console.error('Error completing trade-in:', error);
      res.status(500).json({ message: error.message || 'Failed to complete trade-in' });
    }
  }
);

// PUT /api/trade-ins/:id - Edit trade-in (user only, own listing)
router.put(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid trade-in ID'),
  body('productName').optional().isString().isLength({ min: 2, max: 255 }).withMessage('Product name is required'),
  body('description').optional().isString().isLength({ max: 5000 }).withMessage('Description is too long'),
  body('interestedInProduct').optional().isString().isLength({ min: 2, max: 255 }).withMessage('Interested product is required'),
  body('productCondition').optional().isIn(['Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid product condition'),
  body('inspectionFee').optional().isFloat({ min: 0 }).withMessage('Inspection fee must be a positive number'),
  body('estimatedPrice').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity cannot be negative'),
  body('deliveryOption').optional().isIn(['pickup', 'delivery', 'both']).withMessage('Invalid delivery option'),
  body('images').optional().isArray({ min: 1, max: 1 }).withMessage('Exactly one image is required'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productName, description, interestedInProduct, productCondition, inspectionFee, estimatedPrice, quantity, deliveryOption, images } = req.body;
      
      const tradeIn = await tradeInService.editTradeIn(req.params.id, req.user!.userId, {
        productName,
        description,
        interestedInProduct,
        productCondition,
        inspectionFee,
        estimatedPrice,
        quantity,
        deliveryOption,
        images
      });

      res.json({ 
        message: 'Trade-in updated successfully', 
        data: tradeIn 
      });
    } catch (error: any) {
      console.error('Error updating trade-in:', error);
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ 
        message: error.message || 'Failed to update trade-in' 
      });
    }
  }
);

// DELETE /api/trade-ins/:id - Delete trade-in (user only, own listing)
router.delete(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid trade-in ID'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await tradeInService.deleteTradeIn(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      console.error('Error deleting trade-in:', error);
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ 
        message: error.message || 'Failed to delete trade-in' 
      });
    }
  }
);

export default router;
