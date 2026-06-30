import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { s3Service } from '../services/s3Service';
import { getRepository } from 'typeorm';
import { User } from '../models/User';
import { Store } from '../models/Store';
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP allowed.'));
    }
  },
});

export const validateImage = upload.single('image');

export const uploadProfilePhoto = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Upload to S3
    const result = await s3Service.uploadImage(
      req.file.buffer,
      `profiles/${req.user.userId}`,
      req.file.originalname,
      { contentType: req.file.mimetype }
    );

    // Update user profile photo
    const userRepo = getRepository(User);
    await userRepo.update(req.user.userId, {
      profilePhotoUrl: result.url,
      profilePhotoKey: result.key,
    });

    res.json({
      message: 'Profile photo uploaded successfully',
      url: result.url,
      key: result.key,
    });
  } catch (error: any) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

export const uploadStoreLogo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify user is vendor
    const userRepo = getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.userId } });
    
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can upload store logos' });
    }

    // Upload to S3
    const result = await s3Service.uploadImage(
      req.file.buffer,
      `stores/${req.user.userId}`,
      req.file.originalname,
      { contentType: req.file.mimetype }
    );

    // Update store logo
    const storeRepo = getRepository(Store);
    await storeRepo.update(
      { ownerId: req.user.userId },
      {
        logoUrl: result.url,
        logoKey: result.key,
      }
    );

    res.json({
      message: 'Store logo uploaded successfully',
      url: result.url,
      key: result.key,
    });
  } catch (error: any) {
    console.error('Store logo upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

export const uploadPortfolioImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify user is installer
    const userRepo = getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.user.userId } });
    
    if (!user || user.role !== 'installer') {
      return res.status(403).json({ message: 'Only installers can upload portfolio images' });
    }

    // Upload to S3
    const result = await s3Service.uploadImage(
      req.file.buffer,
      `portfolios/${req.user.userId}`,
      req.file.originalname,
      { contentType: req.file.mimetype }
    );

    res.json({
      message: 'Portfolio image uploaded successfully',
      url: result.url,
      key: result.key,
    });
  } catch (error: any) {
    console.error('Portfolio upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    if (!key) {
      return res.status(400).json({ message: 'Image key required' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Delete from S3
    await s3Service.deleteImage(key);

    res.json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    console.error('Image delete error:', error);
    res.status(500).json({ message: error.message || 'Delete failed' });
  }
};
