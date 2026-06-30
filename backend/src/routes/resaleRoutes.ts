import { Router, Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { ResaleProduct } from '../models/ResaleProduct';
import { resaleService } from '../services/resaleService';

const router = Router();
const resaleRepository = AppDataSource.getRepository(ResaleProduct);

// Validation middleware
const validateResaleCreation = [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().optional(),
  body('productCondition').isIn(['Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid product condition'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('inspectionFee').isFloat({ min: 0 }).withMessage('Inspection fee must be a positive number'),
  body('deliveryOption').isIn(['pickup', 'delivery', 'both']).withMessage('Invalid delivery option'),
  body('images').isArray({ min: 1, max: 1 }).withMessage('Exactly one image is required'),
];

// POST /api/resales - Create new resale listing
router.post(
  '/',
  authMiddleware,
  validateResaleCreation,
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productName, description, productCondition, price, quantity, inspectionFee, deliveryOption, images } = req.body;

      const resale = await resaleService.createResale({
        userId: req.user!.userId,
        productName,
        description,
        productCondition,
        price,
        quantity,
        sellerRating: 0,
        inspectionFee,
        deliveryOption,
        images
      });

      res.status(201).json({
        message: 'Resale listing created successfully. Awaiting admin approval.',
        data: resale,
      });
    } catch (error: any) {
      console.error('Error creating resale:', error);
      res.status(500).json({ message: error.message || 'Failed to create resale listing' });
    }
  }
);

// GET /api/resales/approved - Get approved resales (public)
router.get('/approved', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const resales = await resaleService.getApprovedResales(skip, limit);
    res.json(resales);
  } catch (error: any) {
    console.error('Error fetching approved resales:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch resales' });
  }
});

// GET /api/resales/my-listings - Get user's resales
router.get(
  '/my-listings',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const resales = await resaleService.getUserResales(req.user!.userId);
      res.json({
        success: true,
        data: resales
      });
    } catch (error: any) {
      console.error('Error fetching user resales:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch your resales' });
    }
  }
);

// GET /api/resales/:id - Get single resale details
router.get('/:id', param('id').isUUID().withMessage('Invalid resale ID'), async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const resale = await resaleService.getResaleById(req.params.id);
    if (!resale) {
      return res.status(404).json({ message: 'Resale not found' });
    }

    res.json(resale);
  } catch (error: any) {
    console.error('Error fetching resale:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch resale' });
  }
});

// GET /api/resales - Get all resales (admin only)
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
        'APPROVED': 'approved',
        'REJECTED': 'rejected',
        'SOLD': 'sold',
        'CANCELLED': 'cancelled'
      };
      status = statusMap[statusParam.toUpperCase()];
    }

    const result = await resaleService.getAllResales(status);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching all resales:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch resales' });
  }
});

// POST /api/resales/:id/approve - Approve resale (admin only)
router.post(
  '/:id/approve',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid resale ID'),
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

      const resale = await resaleService.approveResale(req.params.id, req.user!.userId);
      res.json({ message: 'Resale approved successfully', data: resale });
    } catch (error: any) {
      console.error('Error approving resale:', error);
      res.status(500).json({ message: error.message || 'Failed to approve resale' });
    }
  }
);

// POST /api/resales/:id/reject - Reject resale (admin only)
router.post(
  '/:id/reject',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid resale ID'),
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

      const resale = await resaleService.rejectResale(req.params.id, req.body.reason, req.user!.userId);
      res.json({ message: 'Resale rejected successfully', data: resale });
    } catch (error: any) {
      console.error('Error rejecting resale:', error);
      res.status(500).json({ message: error.message || 'Failed to reject resale' });
    }
  }
);

// PUT /api/resales/:id - Edit resale (user only, own listing)
router.put(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid resale ID'),
  body('productName').optional().isString().isLength({ min: 2, max: 255 }).withMessage('Product name is required'),
  body('description').optional().isString().isLength({ max: 5000 }).withMessage('Description is too long'),
  body('productCondition').optional().isIn(['Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid product condition'),
  body('inspectionFee').optional().isFloat({ min: 0 }).withMessage('Inspection fee must be a positive number'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity cannot be negative'),
  body('deliveryOption').optional().isIn(['pickup', 'delivery', 'both']).withMessage('Invalid delivery option'),
  body('images').optional().isArray({ min: 1, max: 1 }).withMessage('Exactly one image is required'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productName, description, productCondition, inspectionFee, price, quantity, deliveryOption, images } = req.body;
      
      const resale = await resaleService.editResale(req.params.id, req.user!.userId, {
        productName,
        description,
        productCondition,
        inspectionFee,
        price,
        quantity,
        deliveryOption,
        images
      });

      res.json({ 
        message: 'Resale updated successfully', 
        data: resale 
      });
    } catch (error: any) {
      console.error('Error updating resale:', error);
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ 
        message: error.message || 'Failed to update resale' 
      });
    }
  }
);

// DELETE /api/resales/:id - Delete resale (user only, own listing)
router.delete(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('Invalid resale ID'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await resaleService.deleteResale(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      console.error('Error deleting resale:', error);
      res.status(error.message.includes('Unauthorized') ? 403 : 500).json({ 
        message: error.message || 'Failed to delete resale' 
      });
    }
  }
);

export default router;
