import { useState } from 'react'
import { getBackendBaseUrl } from '@/lib/apiConfig'
import { isVideoUrl } from '@/lib/imageUtils'

interface MediaCarouselProps {
  mainImage: string
  images?: string[]
  videos?: string[]
  title: string
}

export default function MediaCarousel({ mainImage, images = [], videos = [], title }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="350"%3E%3Crect fill="%23e5e7eb" width="400" height="350"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="system-ui" font-size="16" fill="%236b7280"%3ENo Image Available%3C/text%3E%3C/svg%3E'
  
  // Convert all image and video URLs to full URLs with error handling
  const convertToFullUrl = (media: string) => {
    if (!media) return ''
    // If already a full URL
    if (media.startsWith('http')) return media
    
    const baseUrl = typeof window !== 'undefined' ? getBackendBaseUrl() : 'http://localhost:4000'
    
    // Handle different path formats
    if (media.startsWith('/')) return `${baseUrl}${media}`
    if (media.startsWith('uploads/')) return `${baseUrl}/${media}`
    
    // Default: assume it's just a filename
    return `${baseUrl}/uploads/${media}`
  }
  
  // Combine all media items (main image + additional images + videos)
  const allMedia = [
    mainImage,
    ...images.map(img => convertToFullUrl(img)).slice(1), // Skip first image since it's already mainImage
    ...((videos || []).map(vid => convertToFullUrl(vid)))
  ].filter(Boolean)

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1))
  }

  const handleImageError = (media: string) => {
    setFailedImages(prev => new Set(prev).add(media))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1))
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const getMediaUrl = (media: string) => {
    // Media should already be a full URL from allMedia array
    return media || ''
  }

  const currentMedia = allMedia[currentIndex] ? getMediaUrl(allMedia[currentIndex]) : ''
  const isVideo = isVideoUrl(currentMedia)

  if (allMedia.length === 0) {
    return <div className="w-full aspect-square bg-gray-200 rounded flex items-center justify-center">No media available</div>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      {/* Main Display */}
      <div className="relative bg-[#f8f8f8] rounded overflow-hidden mb-3 aspect-square flex items-center justify-center p-5">
        {isVideo ? (
          <video
            key={currentMedia}
            src={currentMedia}
            autoPlay
            muted
            playsInline
            loop
            controls
            controlsList="nodownload"
            className="max-w-full max-h-full object-contain bg-black"
            poster={mainImage}
            preload="auto"
            onError={() => handleImageError(currentMedia)}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={failedImages.has(currentMedia) ? fallbackImage : currentMedia}
            alt={title}
            className="max-w-full max-h-full object-contain"
            onError={() => handleImageError(currentMedia)}
          />
        )}

        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            {/* Left Arrow */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition"
              aria-label="Previous media"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right Arrow */}
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition"
              aria-label="Next media"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Counter */}
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
              {currentIndex + 1} / {allMedia.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {allMedia.length > 1 && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-min">
            {allMedia.map((media, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 relative rounded transition ${
                  currentIndex === index
                    ? 'border-2 border-orange-500'
                    : 'border-2 border-gray-200 hover:border-orange-300'
                }`}
              >
                {isVideoUrl(media) ? (
                  <video
                    src={getMediaUrl(media)}
                    className="w-16 h-16 object-cover rounded bg-black"
                    autoPlay
                    muted
                    playsInline
                    loop
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={failedImages.has(media) ? fallbackImage : getMediaUrl(media)}
                    alt={`${index + 1}`}
                    className="w-16 h-16 object-cover rounded"
                    onError={() => handleImageError(media)}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
