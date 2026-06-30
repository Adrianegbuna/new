/**
 * S3 Image Uploader - Direct browser-to-S3 upload via pre-signed URLs
 * This module handles all S3 operations for the frontend
 */

import { apiClient } from './api-client';

export interface UploadProgress {
  percentComplete: number;
  uploadedBytes: number;
  totalBytes: number;
  uploadSpeed: string; // KB/s or MB/s
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

/**
 * Compress an image using browser Canvas API
 * Targets: max 5MB after compression, JPEG quality 80%
 * 
 * IMPORTANT: This function is for image compression only.
 * - Videos and non-image files are returned as-is
 * - Compression is attempted only for valid image types
 * - If compression fails, file is returned uncompressed
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1440,
    quality = 0.8,
    maxSizeBytes = 5 * 1024 * 1024, // 5MB
  } = options || {};

  // ✅ Skip compression for videos and non-image files
  if (!file.type.startsWith('image/')) {
    console.log(`[COMPRESS] Skipping compression for non-image: ${file.type}`);
    return file;
  }

  // If file is small enough, return as-is
  if (file.size <= maxSizeBytes && file.type === 'image/jpeg') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas conversion failed'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          quality
        );
      };

      // ✅ CRITICAL: If image fails to load in canvas, return uncompressed file instead of failing
      // This prevents false "upload failed" errors when the file is actually valid
      img.onerror = () => {
        console.warn(`[COMPRESS] Failed to load image for compression, returning uncompressed: ${file.name}`);
        resolve(file); // Return original file uncompressed instead of rejecting
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get a pre-signed URL from backend for S3 direct upload
 */
export async function getPresignedUrl(
  fileName: string,
  fileType: string,
  folder: string = 'uploads',
  fileSize: number
): Promise<{ presignedUrl: string; s3Url: string; expiresIn: number; s3Key: string }> {
  try {
    const response = await apiClient.post('/s3/presigned-url', {
      fileName,
      fileType,
      folder,
      fileSizeBytes: fileSize,
    });

    return response.data;
  } catch (error: any) {
    console.error('[S3] Pre-signed URL request failed:', {
      fileName,
      error: error.response?.data || error.message,
    });
    throw new Error(`Failed to get pre-signed URL: ${error.message}`);
  }
}

/**
 * Upload file to S3 using pre-signed URL
 * Uses XMLHttpRequest for better progress tracking and error handling
 */
export async function uploadToS3(
  presignedUrl: string,
  blob: Blob,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void,
  fileName?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const uploadedMB = e.loaded / 1024 / 1024;
        const speedMBps = uploadedMB / elapsedSeconds;
        const speedStr = speedMBps.toFixed(2);

        onProgress?.({
          percentComplete,
          uploadedBytes: e.loaded,
          totalBytes: e.total,
          uploadSpeed: `${speedStr} MB/s`,
        });
      }
    });

    // Handle response
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        // Try to parse S3 error response
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xhr.responseText, 'text/xml');
          const errorCode = xmlDoc.getElementsByTagName('Code')[0]?.textContent || 'Unknown';
          const errorMessage = xmlDoc.getElementsByTagName('Message')[0]?.textContent || xhr.statusText;
          reject(new Error(`S3 Error (${xhr.status} ${errorCode}): ${errorMessage}`));
        } catch {
          reject(new Error(`S3 Error (${xhr.status}): ${xhr.statusText}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error: S3 unreachable or connection lost. Check internet connection.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted by browser'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout (30s). Network may be slow.'));
    });

    // Set timeout: 30 seconds for slow networks
    xhr.timeout = 30000;

    // Send request
    xhr.open('PUT', presignedUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    // CRITICAL: Add required headers from presigned URL
    xhr.setRequestHeader('x-amz-server-side-encryption', 'AES256');
    xhr.send(blob);
  });
}

/**
 * Upload a single image file to S3
 * Handles: compression → pre-signed URL → direct upload
 */
export async function uploadImageToS3(
  file: File,
  folder: string = 'uploads',
  compressionOptions?: CompressionOptions,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const uploadId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    console.log(`[S3-${uploadId}] Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Step 1: Compress
    console.log(`[S3-${uploadId}] Compressing...`);
    const compressedBlob = await compressImage(file, compressionOptions);
    console.log(`[S3-${uploadId}] Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);

    // Step 2: Get pre-signed URL
    console.log(`[S3-${uploadId}] Getting pre-signed URL...`);
    const { presignedUrl, s3Url } = await getPresignedUrl(
      file.name,
      file.type,
      folder,
      compressedBlob.size
    );
    console.log(`[S3-${uploadId}] Got pre-signed URL (${presignedUrl.substring(0, 80)}...)`);

    // Step 3: Upload to S3
    console.log(`[S3-${uploadId}] Uploading to S3...`);
    await uploadToS3(presignedUrl, compressedBlob, file.type, onProgress, file.name);

    const totalTime = Date.now() - startTime;
    console.log(`[S3-${uploadId}] ✓ Upload complete (${totalTime}ms): ${s3Url}`);

    return s3Url;
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`[S3-${uploadId}] ❌ Upload failed (${totalTime}ms):`, {
      error: error.message,
      file: file.name,
    });
    throw error;
  }
}

/**
 * Batch upload multiple images sequentially
 */
export async function batchUploadImagesToS3(
  files: File[],
  folder: string = 'uploads',
  compressionOptions?: CompressionOptions,
  onProgress?: (progress: { currentFile: number; totalFiles: number; currentProgress: UploadProgress }) => void
): Promise<string[]> {
  const urls: string[] = [];
  const batchId = Math.random().toString(36).substring(7);

  console.log(`[BATCH-${batchId}] Starting batch upload of ${files.length} files`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[BATCH-${batchId}] File ${i + 1}/${files.length}: ${file.name}`);

    try {
      const url = await uploadImageToS3(file, folder, compressionOptions, (progress) => {
        onProgress?.({
          currentFile: i + 1,
          totalFiles: files.length,
          currentProgress: progress,
        });
      });
      urls.push(url);
    } catch (error: any) {
      console.error(`[BATCH-${batchId}] ❌ File ${i + 1} failed:`, error.message);
      throw error;
    }
  }

  console.log(`[BATCH-${batchId}] ✓ Batch complete: ${urls.length}/${files.length} uploaded`);
  return urls;
}

export default {
  compressImage,
  getPresignedUrl,
  uploadToS3,
  uploadImageToS3,
  batchUploadImagesToS3,
};
