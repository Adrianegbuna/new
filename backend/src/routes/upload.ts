import express, { Response } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { uploadToS3, deleteFromS3, validateImageFile } from '../services/s3Service';

const router = express.Router();

// Multer config for memory storage (we'll upload to S3, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * POST /api/upload/video
 * Upload single video file to S3
 */
router.post('/video', authMiddleware, upload.single('video'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Basic video validation - check MIME type and size
    if (!req.file.mimetype.startsWith('video/')) {
      return res.status(400).json({ message: 'Invalid file type. Please upload a video file.' });
    }

    // Upload to S3
    const videoUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      `videos/${req.user.userId}`
    );

    res.json({
      success: true,
      url: videoUrl,
      fileName: req.file.originalname,
    });
  } catch (error: any) {
    console.error('Video Upload Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

/**
 * POST /api/upload/product-image
 * Upload single product image to S3
 */
router.post('/product-image', authMiddleware, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate image
    const validation = validateImageFile(req.file.buffer, req.file.originalname, 5);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    // Upload to S3
    const imageUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      `products/${req.user.userId}`
    );

    res.json({
      success: true,
      url: imageUrl,
      fileName: req.file.originalname,
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

/**
 * POST /api/upload/installer-project
 * Upload installer project images to S3
 */
router.post('/installer-project', authMiddleware, upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const uploadedUrls: string[] = [];

    // Upload each file
    for (const file of req.files as Express.Multer.File[]) {
      const validation = validateImageFile(file.buffer, file.originalname, 10);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const url = await uploadToS3(
        file.buffer,
        file.originalname,
        `projects/${req.user.userId}`
      );
      uploadedUrls.push(url);
    }

    res.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error: any) {
    console.error('Multiple Upload Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

/**
 * POST /api/upload/profile-photo
 * Upload profile photo to S3
 */
router.post('/profile-photo', authMiddleware, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const validation = validateImageFile(req.file.buffer, req.file.originalname, 5);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const photoUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      `profiles/${req.user.userId}`
    );

    res.json({
      success: true,
      url: photoUrl,
    });
  } catch (error: any) {
    console.error('Profile Photo Upload Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

/**
 * DELETE /api/upload/:fileName
 * Delete file from S3
 */
router.delete('/:fileName', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const fileUrl = req.body.fileUrl; // Send full URL in body

    if (!fileUrl) {
      return res.status(400).json({ message: 'File URL required' });
    }

    await deleteFromS3(fileUrl);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete Error:', error);
    res.status(500).json({ message: error.message || 'Delete failed' });
  }
});

export default router;
