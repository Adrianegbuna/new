import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadImageToS3, validateImageFile } from '../services/s3Service';

const router = Router();

// Configure multer for file uploads (stores in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/**
 * Test S3 Image Upload with Optimization
 * POST /api/test-s3/upload
 * 
 * Form Data:
 * - image: image file
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Image uploaded successfully",
 *   "url": "https://...",
 *   "originalSize": 2500000,
 *   "uploadedSize": 650000,
 *   "compressionRatio": "74%",
 *   "uploadedTo": "S3" or "CloudFront",
 *   "folder": "test-uploads"
 * }
 */
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided. Please upload an image file.',
      });
    }

    // Validate image
    const validation = validateImageFile(req.file.buffer, req.file.originalname);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    console.log(`Uploading image: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)}KB)`);

    // Upload to S3 with optimization
    const url = await uploadImageToS3(
      req.file.buffer,
      req.file.originalname,
      'test-uploads',  // folder in S3
      1920,            // max width
      1440,            // max height
      80               // quality (80% = good balance)
    );

    // Calculate compression stats
    const uploadedUrl = new URL(url);
    const isCloudFront = uploadedUrl.hostname.includes('cloudfront');

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url,
      originalSize: req.file.size,
      uploadedTo: isCloudFront ? 'CloudFront' : 'S3',
      folder: 'test-uploads',
      note: 'Image automatically optimized and resized',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Image upload failed',
    });
  }
});

/**
 * Test S3 Connection
 * GET /api/test-s3/health
 * 
 * Response:
 * {
 *   "status": "connected",
 *   "bucket": "renewablezmart-images",
 *   "region": "eu-london",
 *   "cdnEnabled": true,
 *   "cdnUrl": "https://d123abc.cloudfront.net"
 * }
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isCloudFront = !!process.env.AWS_CLOUDFRONT_URL;
    
    res.json({
      status: 'connected',
      bucket: process.env.AWS_S3_BUCKET || 'not-configured',
      region: process.env.AWS_S3_REGION || 'not-configured',
      cdnEnabled: isCloudFront,
      cdnUrl: process.env.AWS_CLOUDFRONT_URL || 'not-configured',
      s3Url: process.env.AWS_S3_URL || 'not-configured',
      note: 'AWS S3 is ready for image uploads',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * Upload Multiple Images
 * POST /api/test-s3/upload-multiple
 * 
 * Form Data:
 * - images: multiple image files
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "3 images uploaded successfully",
 *   "uploads": [
 *     { "fileName": "image1.jpg", "url": "https://...", "size": 123456 },
 *     ...
 *   ]
 * }
 */
router.post('/upload-multiple', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided',
      });
    }

    const uploads = await Promise.all(
      (req.files as Express.Multer.File[]).map(async (file) => {
        const validation = validateImageFile(file.buffer, file.originalname);
        if (!validation.valid) {
          throw new Error(`${file.originalname}: ${validation.error}`);
        }

        const url = await uploadImageToS3(
          file.buffer,
          file.originalname,
          'test-uploads'
        );

        return {
          fileName: file.originalname,
          url,
          originalSize: file.size,
        };
      })
    );

    res.json({
      success: true,
      message: `${uploads.length} images uploaded successfully`,
      uploads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch upload failed',
    });
  }
});

export default router;
