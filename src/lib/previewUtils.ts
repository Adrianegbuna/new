/**
 * Preview utilities for handling both File objects and S3 URLs
 * Prevents failed image loads and black preview boxes
 */

/**
 * Get preview source URL from File or existing URL
 * - File objects: Use URL.createObjectURL for local preview
 * - String URLs: Use directly (expected to be clean S3 URLs)
 * 
 * ❌ NEVER use for:
 * - Presigned URLs (they expire)
 * - Verifying S3 uploads by loading
 * 
 * ✅ Use only for:
 * - Pre-upload file previews
 * - Post-upload clean S3 URLs
 */
export function getPreviewSource(media: File | string): string {
  if (media instanceof File) {
    // For File objects, create a local preview URL
    return URL.createObjectURL(media);
  }
  
  // For strings, assume they are clean S3 URLs (https://bucket.s3.region.amazonaws.com/...)
  // Never use presigned URLs here - they expire and cause CORS errors
  return media;
}

/**
 * Detect if media is a video based on file extension or MIME type
 * Works with both File objects and URL strings
 */
export function isVideo(media: File | string): boolean {
  let fileExtOrType: string;
  
  if (media instanceof File) {
    // Check File MIME type first
    if (media.type.startsWith('video/')) {
      return true;
    }
    // Fall back to file name extension
    fileExtOrType = media.name.toLowerCase();
  } else {
    // For URLs, check extension
    fileExtOrType = media.toLowerCase();
  }
  
  const videoExtensions = /\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i;
  return videoExtensions.test(fileExtOrType);
}

/**
 * Extract clean S3 URL from presigned URL
 * Presigned URLs contain query parameters that expire
 * Use the base URL without parameters for previews
 * 
 * Example:
 * Input: https://bucket.s3.region.amazonaws.com/path?X-Amz-Signature=...
 * Output: https://bucket.s3.region.amazonaws.com/path
 */
export function getCleanS3Url(urlOrPresignedUrl: string): string {
  if (!urlOrPresignedUrl) {
    return '';
  }
  
  // Remove presigned URL parameters (X-Amz-*)
  const url = new URL(urlOrPresignedUrl);
  url.search = ''; // Remove all query parameters
  return url.toString();
}

/**
 * Validate that URL is a clean S3 URL (not presigned)
 */
export function isCleanS3Url(url: string): boolean {
  if (!url) return false;
  
  // Should start with https and have S3 domain
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    // Should have s3 in domain and NO X-Amz parameters
    const hasS3Domain = urlObj.hostname.includes('s3');
    const hasPresignedParams = urlObj.searchParams.has('X-Amz-Signature');
    
    return hasS3Domain && !hasPresignedParams;
  } catch {
    return false;
  }
}
