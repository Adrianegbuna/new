import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import * as uploadController from '../controllers/uploadController';

const router = Router();

// Profile photo upload (customers, vendors, installers, admin)
router.post(
  '/profile-photo',
  authMiddleware,
  uploadController.validateImage,
  uploadController.uploadProfilePhoto
);

// Store logo upload (vendors only)
router.post(
  '/store-logo',
  authMiddleware,
  uploadController.validateImage,
  uploadController.uploadStoreLogo
);

// Installer portfolio images
router.post(
  '/installer-portfolio',
  authMiddleware,
  uploadController.validateImage,
  uploadController.uploadPortfolioImage
);

// Delete uploaded image
router.delete(
  '/image/:publicId',
  authMiddleware,
  uploadController.deleteImage
);

export default router;
