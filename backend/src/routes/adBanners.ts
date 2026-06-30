import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import {
  getActiveAdBanners,
  getAllAdBanners,
  createAdBanner,
  updateAdBanner,
  deleteAdBanner,
} from '../controllers/adBannersController';

const router = Router();

// Public
router.get('/active', getActiveAdBanners);

// Admin
router.get('/', authMiddleware, adminMiddleware, getAllAdBanners);
router.post('/', authMiddleware, adminMiddleware, createAdBanner);
router.put('/:id', authMiddleware, adminMiddleware, updateAdBanner);
router.delete('/:id', authMiddleware, adminMiddleware, deleteAdBanner);

export default router;
