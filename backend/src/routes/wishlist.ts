import express, { Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Wishlist } from '../models/Wishlist';
import { Product } from '../models/Product';
import { AppDataSource } from '../config/database';

const router = express.Router();

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's wishlist items
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const wishlistRepo = AppDataSource.getRepository(Wishlist);
    
    const wishlist = await wishlistRepo.find({
      where: { userId },
      order: { addedAt: 'DESC' }
    });

    res.json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

/**
 * @swagger
 * /api/wishlist/add:
 *   post:
 *     summary: Add product to wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               notifyOnPriceDrop:
 *                 type: boolean
 *               notifyOnStockUpdate:
 *                 type: boolean
 */
router.post('/add', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      productId,
      notifyOnPriceDrop,
      notifyOnStockUpdate,
      notes,
      productName,
      productPrice,
      productImage,
      productCategory,
    } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    const wishlistRepo = AppDataSource.getRepository(Wishlist);
    const productRepo = AppDataSource.getRepository(Product);

    // Check if already in wishlist
    const existing = await wishlistRepo.findOne({ 
      where: { userId, productId } 
    });

    if (existing) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }

    // Get product details
    const product = await productRepo.findOne({ where: { id: productId } });

    const fallbackName = String(productName || '').trim() || 'Wishlist item';
    const parsedFallbackPrice = Number(productPrice);
    const fallbackPrice = Number.isFinite(parsedFallbackPrice) ? parsedFallbackPrice : 0;
    const fallbackImage = String(productImage || '').trim();
    const fallbackCategory = String(productCategory || '').trim() || 'Wishlist item';

    const wishlistItem = wishlistRepo.create({
      userId,
      productId,
      productName: product?.name || fallbackName,
      productPrice: Number(product?.price ?? fallbackPrice),
      productImage: product?.image || fallbackImage,
      productCategory: product?.subcategory || fallbackCategory,
      notifyOnPriceDrop: notifyOnPriceDrop || false,
      notifyOnStockUpdate: notifyOnStockUpdate || false,
      notesFromUser: notes
    });

    await wishlistRepo.save(wishlistItem);

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlistItem
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

/**
 * @swagger
 * /api/wishlist/{id}:
 *   delete:
 *     summary: Remove product from wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const wishlistId = req.params.id;

    const wishlistRepo = AppDataSource.getRepository(Wishlist);
    const item = await wishlistRepo.findOne({ 
      where: { id: wishlistId, userId } 
    });

    if (!item) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    await wishlistRepo.remove(item);

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

/**
 * @swagger
 * /api/wishlist/{id}/toggle-notification:
 *   patch:
 *     summary: Toggle price/stock notifications
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/toggle-notification', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const wishlistId = req.params.id;
    const { notifyOnPriceDrop, notifyOnStockUpdate } = req.body;

    const wishlistRepo = AppDataSource.getRepository(Wishlist);
    const item = await wishlistRepo.findOne({ 
      where: { id: wishlistId, userId } 
    });

    if (!item) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    if (notifyOnPriceDrop !== undefined) {
      item.notifyOnPriceDrop = notifyOnPriceDrop;
    }
    if (notifyOnStockUpdate !== undefined) {
      item.notifyOnStockUpdate = notifyOnStockUpdate;
    }

    await wishlistRepo.save(item);

    res.json({
      success: true,
      message: 'Notification settings updated',
      data: item
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

/**
 * @swagger
 * /api/wishlist/count:
 *   get:
 *     summary: Get wishlist count
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 */
router.get('/count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const wishlistRepo = AppDataSource.getRepository(Wishlist);
    
    const count = await wishlistRepo.count({
      where: { userId }
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get wishlist count' });
  }
});

export default router;
