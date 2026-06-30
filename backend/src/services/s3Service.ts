import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import sharp from 'sharp';
import AWS from 'aws-sdk';

// Validate AWS credentials at startup
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('[S3 SERVICE] ⚠️ WARNING: AWS credentials are not configured!');
  console.error('[S3 SERVICE] AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ set' : '✗ MISSING');
  console.error('[S3 SERVICE] AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ set' : '✗ MISSING');
  console.error('[S3 SERVICE] Product uploads will FAIL without valid AWS credentials');
}

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'renewablezmart';
const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL; // Optional: https://your-cloudfront-distribution-id.cloudfront.net
const S3_URL = CLOUDFRONT_URL || process.env.AWS_S3_URL || `https://${BUCKET_NAME}.s3.eu-west-2.amazonaws.com`;

console.log('[S3 SERVICE] Initialized with:', {
  bucket: BUCKET_NAME,
  region: process.env.AWS_S3_REGION || 'eu-west-2',
  url: S3_URL,
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'eu-west-2',
});
const useObjectAcl = String(process.env.AWS_S3_USE_ACL || '').toLowerCase() === 'true';

export const s3Service = {
  // Upload image from buffer
  uploadImage: async (
    buffer: Buffer,
    folder: string,
    originalFileName: string,
    options?: any
  ): Promise<any> => {
    try {
      const fileName = `${folder}/${uuidv4()}-${Date.now()}-${originalFileName}`;
      
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME || 'renewablezmart',
        Key: fileName,
        Body: buffer,
        ContentType: options?.contentType || 'image/jpeg',
        Metadata: {
          'original-filename': originalFileName,
        },
      };
      if (useObjectAcl) {
        (params as any).ACL = 'public-read';
      }

      const result = await s3.upload(params).promise();

      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        etag: result.ETag,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  },

  // Delete image from S3
  deleteImage: async (key: string) => {
    try {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME || 'renewablezmart',
        Key: key,
      };

      await s3.deleteObject(params).promise();
      return { success: true };
    } catch (error) {
      console.error('S3 delete error:', error);
      throw error;
    }
  },

  // Get optimized image URL with transformations
  getOptimizedUrl: (url: string, width?: number, height?: number) => {
    if (!url) return '';
    
    // S3 doesn't have built-in image optimization like Cloudinary
    // You can add CloudFront distribution for caching or use on-the-fly resizing
    // For now, return the original URL
    return url;
  },

  // Generate signed URL for private images (if needed)
  getSignedUrl: async (key: string, expiresIn: number = 3600) => {
    try {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME || 'renewablezmart',
        Key: key,
        Expires: expiresIn,
      };

      const signedUrl = await s3.getSignedUrlPromise('getObject', params);
      return signedUrl;
    } catch (error) {
      console.error('S3 signed URL error:', error);
      throw error;
    }
  },
};

/**
 * Optimize and upload an image to S3 with automatic resizing
 * @param fileBuffer - Image buffer
 * @param fileName - Original filename
 * @param folder - Folder path in S3
 * @param maxWidth - Max width in pixels (default: 1920)
 * @param maxHeight - Max height in pixels (default: 1440)
 * @param quality - JPEG quality 1-100 (default: 80)
 * @returns URL of uploaded file
 */
export async function uploadImageToS3(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = 'uploads',
  maxWidth: number = 1920,
  maxHeight: number = 1440,
  quality: number = 80
): Promise<string> {
  try {
    let optimizedBuffer = fileBuffer;

    // Optimize image using sharp
    try {
      optimizedBuffer = await sharp(fileBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality, progressive: true })
        .toBuffer();
      console.log(`Image optimized: ${(fileBuffer.length / 1024).toFixed(2)}KB → ${(optimizedBuffer.length / 1024).toFixed(2)}KB`);
    } catch (err) {
      console.warn('Image optimization skipped, uploading original:', err);
      optimizedBuffer = fileBuffer;
    }

    // Generate unique filename with timestamp for cache busting
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    const uniqueName = `${name}-${uuidv4()}${ext}`;
    const key = `${folder}/${Date.now()}/${uniqueName}`;

    // Upload optimized image to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: optimizedBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'max-age=31536000', // 1 year cache for immutable files
      Metadata: {
        'original-name': fileName,
        'upload-date': new Date().toISOString(),
      },
    });
    if (useObjectAcl) {
      (command.input as any).ACL = 'public-read';
    }

    await s3Client.send(command);

    // Return public URL (CloudFront or S3)
    return `${S3_URL}/${key}`;
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.Code,
      statusCode: error?.$metadata?.httpStatusCode,
      bucket: BUCKET_NAME,
      region: process.env.AWS_S3_REGION,
    };
    console.error('[IMAGE UPLOAD ERROR]', JSON.stringify(errorDetails, null, 2));
    
    // Provide more specific error messages for common issues
    let userMessage = 'S3 Upload failed';
    if (error?.Code === 'NoCredentialsError' || error?.Code === 'InvalidAccessKeyId') {
      userMessage = 'AWS credentials are invalid or missing';
    } else if (error?.Code === 'SignatureDoesNotMatch') {
      userMessage = 'AWS credentials signature mismatch - check your access keys';
    } else if (error?.Code === 'AccessDenied') {
      userMessage = 'AWS access denied - check IAM permissions';
    } else if (error?.Code === 'NoSuchBucket') {
      userMessage = `S3 bucket '${BUCKET_NAME}' does not exist`;
    }
    
    throw new Error(userMessage);
  }
}

/**
 * Upload a file to AWS S3
 * @param fileBuffer - Buffer containing file data
 * @param fileName - Original filename
 * @param folder - Folder path in S3 (e.g., 'products', 'installers')
 * @returns URL of uploaded file
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = 'uploads'
): Promise<string> {
  try {
    // Check if it's an image - if so, optimize it
    if (isImageFile(fileName)) {
      return await uploadImageToS3(fileBuffer, fileName, folder);
    }

    // For non-image files, upload as-is
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    const uniqueName = `${name}-${uuidv4()}${ext}`;
    const key = `${folder}/${uniqueName}`;

    console.log(`[S3 UPLOAD] Non-image file: ${fileName} → ${key}`);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: getMimeType(ext),
    });
    if (useObjectAcl) {
      (command.input as any).ACL = 'public-read';
    }

    await s3Client.send(command);

    const url = `${S3_URL}/${key}`;
    console.log(`[S3 UPLOAD] Success: ${url}`);
    return url;
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.Code,
      statusCode: error?.$metadata?.httpStatusCode,
      fileName,
      bucket: BUCKET_NAME,
    };
    console.error('[S3 UPLOAD ERROR]', JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

/**
 * Upload multiple files to S3
 * @param files - Array of {buffer, fileName}
 * @param folder - Folder path in S3
 * @returns Array of URLs
 */
export async function uploadMultipleToS3(
  files: Array<{ buffer: Buffer; fileName: string }>,
  folder: string = 'uploads'
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) =>
      uploadToS3(file.buffer, file.fileName, folder)
    );
    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple Upload Error:', error);
    throw new Error('Failed to upload files to S3');
  }
}

/**
 * Delete a file from S3
 * @param fileUrl - URL of file to delete
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  try {
    // Extract key from URL
    const key = fileUrl.replace(`${S3_URL}/`, '');

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Deleted from S3: ${key}`);
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Check if file is an image
 */
function isImageFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

/**
 * Generate presigned URL for temporary access (if needed)
 * Useful for private files
 */
export async function generatePresignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
  try {
    // For now, just return the public URL
    // If you need private files, use AWS SDK's getSignedUrl
    return fileUrl;
  } catch (error) {
    console.error('Presigned URL Error:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: Buffer, fileName: string, maxSizeMB: number = 5): { valid: boolean; error?: string } {
  const ext = path.extname(fileName).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!allowedExts.includes(ext)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedExts.join(', ')}` };
  }

  if (file.length > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  return { valid: true };
}
