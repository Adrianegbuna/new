/**
 * Utility functions for handling image and video URLs consistently across the app
 */

import { getBackendBaseUrl } from './apiConfig'

/**
 * Convert relative or absolute image URLs to full URLs
 * Handles: HTTP(S) URLs, relative paths, and filenames
 */
export function getImageUrl(imagePath: string | undefined | null): string {
  if (!imagePath) return ''

  // Already a full HTTP(S) URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  const baseUrl = getBackendBaseUrl()

  // Absolute path starting with /
  if (imagePath.startsWith('/')) {
    return `${baseUrl}${imagePath}`
  }

  // Relative path like "uploads/..."
  if (imagePath.startsWith('uploads/')) {
    return `${baseUrl}/${imagePath}`
  }

  // Just a filename - assume it's in uploads folder
  return `${baseUrl}/uploads/${imagePath}`
}

/**
 * Get a fallback SVG image when actual image fails to load
 * Optional: can be text to display in center
 */
export function getFallbackImage(text?: string): string {
  const displayText = text || 'No Image'
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="350"%3E%3Crect fill="%23e5e7eb" width="400" height="350"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="16" fill="%236b7280"%3E${encodeURIComponent(displayText)}%3C/text%3E%3C/svg%3E`
}

/**
 * Get a small fallback image for thumbnails
 */
export function getSmallFallbackImage(text?: string): string {
  const displayText = text || 'No Image'
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="10" fill="%236b7280"%3E${encodeURIComponent(displayText)}%3C/text%3E%3C/svg%3E`
}

/**
 * Check if a URL is a video file
 * Supports: local files (.mp4, .webm, etc.) and Cloudinary URLs (resource_type=video)
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase()
  
  // Check for common video file extensions
  if (lowerUrl.includes('.mp4') || 
      lowerUrl.includes('.webm') || 
      lowerUrl.includes('.mov') ||
      lowerUrl.includes('.avi') ||
      lowerUrl.includes('.mkv') ||
      lowerUrl.includes('.m4v') ||
      lowerUrl.includes('.flv') ||
      lowerUrl.includes('.3gp')) {
    return true
  }
  
  // Check for Cloudinary video URLs (resource_type=video)
  if (lowerUrl.includes('cloudinary.com') && lowerUrl.includes('resource_type=video')) {
    return true
  }
  
  // Check for Cloudinary video URLs by format parameter
  if (lowerUrl.includes('cloudinary.com') && (
      lowerUrl.includes('f_auto') || // auto format
      lowerUrl.includes('f_mp4') ||  // mp4 format
      lowerUrl.includes('f_webm') || // webm format
      lowerUrl.includes('f_ogv')     // ogv format
  )) {
    return true
  }
  
  // Check if URL contains video folder path
  if (lowerUrl.includes('/videos/') || lowerUrl.includes('videos%2F')) {
    return true
  }
  
  return false
}

/**
 * Get MIME type for video file based on URL
 * Supports: local files and Cloudinary URLs
 */
export function getVideoMimeType(url: string): string {
  if (!url) return 'video/mp4'
  const lowerUrl = url.toLowerCase()
  
  // Check for specific video file extensions
  if (lowerUrl.includes('.webm')) return 'video/webm'
  if (lowerUrl.includes('.mov')) return 'video/quicktime'
  if (lowerUrl.includes('.avi')) return 'video/x-msvideo'
  if (lowerUrl.includes('.mkv')) return 'video/x-matroska'
  if (lowerUrl.includes('.3gp')) return 'video/3gpp'
  if (lowerUrl.includes('.flv')) return 'video/x-flv'
  if (lowerUrl.includes('.ogv')) return 'video/ogg'
  
  // For Cloudinary URLs without specific extension, check format parameter
  if (lowerUrl.includes('cloudinary.com')) {
    if (lowerUrl.includes('f_webm')) return 'video/webm'
    if (lowerUrl.includes('f_ogv')) return 'video/ogg'
    if (lowerUrl.includes('f_mov')) return 'video/quicktime'
    // Default to mp4 for Cloudinary (most compatible)
    return 'video/mp4'
  }
  
  return 'video/mp4' // default
}

export default {
  getImageUrl,
  getFallbackImage,
  getSmallFallbackImage,
  isVideoUrl,
  getVideoMimeType
}
