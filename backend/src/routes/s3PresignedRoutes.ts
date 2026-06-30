import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import {
  generatePresignedUploadUrl,
  generateBatchPresignedUrls,
} from '../services/s3PresignedService';

const router = Router();

/**
 * POST /api/s3/presigned-url
 * Generate a single pre-signed URL for image/video upload
 *
 * Request body:
 * {
 *   "fileName": "product-photo.jpg",
 *   "fileType": "image/jpeg",
 *   "folder": "products",  // products | installers | store-logos
 *   "fileSizeBytes": 2500000
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "presignedUrl": "https://renewablezmart.s3.eu-west-2.amazonaws.com/...",
 *   "s3Key": "products/2026-02-03/abc123-1707033600000-photo.jpg",
 *   "s3Url": "https://renewablezmart.s3.eu-west-2.amazonaws.com/products/...",
 *   "expiresIn": 900
 * }
 */
router.post('/presigned-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileType, folder = 'uploads', fileSizeBytes } = req.body;

    // Validate required fields
    if (!fileName || !fileType) {
      return res.status(400).json({
        message: 'fileName and fileType are required',
      });
    }

    // Only allow authenticated users to request URLs
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await generatePresignedUploadUrl(
      fileName,
      fileType,
      folder,
      fileSizeBytes
    );

    res.json({
      success: true,
      ...result,
      expiresIn: 900, // 15 minutes
      uploadInstructions: {
        method: 'PUT',
        url: result.presignedUrl,
        headers: {
          'Content-Type': fileType,
        },
        note: 'Upload directly to this URL from browser. Pre-signed URL expires in 15 minutes.',
      },
    });
  } catch (error: any) {
    console.error('[PRESIGNED URL] Error:', error.message);
    res.status(400).json({
      message: 'Failed to generate pre-signed URL',
      error: error.message,
    });
  }
});

/**
 * POST /api/s3/presigned-urls-batch
 * Generate multiple pre-signed URLs for batch uploads
 *
 * Request body:
 * {
 *   "files": [
 *     { "fileName": "photo1.jpg", "fileType": "image/jpeg", "sizeBytes": 2500000 },
 *     { "fileName": "photo2.jpg", "fileType": "image/jpeg", "sizeBytes": 3000000 }
 *   ],
 *   "folder": "products"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "count": 2,
 *   "files": [
 *     { "presignedUrl": "...", "s3Key": "...", "s3Url": "...", "fileName": "photo1.jpg" },
 *     { "presignedUrl": "...", "s3Key": "...", "s3Url": "...", "fileName": "photo2.jpg" }
 *   ],
 *   "expiresIn": 900
 * }
 */
router.post(
  '/presigned-urls-batch',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { files, folder = 'uploads' } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          message: 'files array is required',
        });
      }

      if (files.length > 10) {
        return res.status(400).json({
          message: 'Maximum 10 files per batch',
        });
      }

      if (!req.user?.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const results = await generateBatchPresignedUrls(files, folder);

      res.json({
        success: true,
        count: results.length,
        files: results,
        expiresIn: 900,
      });
    } catch (error: any) {
      console.error('[PRESIGNED BATCH] Error:', error.message);
      res.status(400).json({
        message: 'Failed to generate batch pre-signed URLs',
        error: error.message,
      });
    }
  }
);

export default router;
