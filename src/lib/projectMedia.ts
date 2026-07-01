import { getImageUrl, isVideoUrl } from '@/lib/imageUtils'

type UnknownRecord = Record<string, unknown>

const MEDIA_OBJECT_KEYS = [
  'url',
  'secure_url',
  'image',
  'src',
  'mediaUrl',
  'location',
  'path',
] as const

const splitCommaList = (value: string): string[] => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const sanitizeMediaPath = (value: string): string => {
  const normalized = String(value || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\/g, '/')
  if (!normalized) return ''

  if (
    normalized.startsWith('data:') ||
    normalized.startsWith('blob:') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('https://')
  ) {
    try {
      return encodeURI(normalized)
    } catch {
      return normalized
    }
  }

  return getImageUrl(normalized)
}

const extractStringFromObject = (obj: UnknownRecord): string => {
  for (const key of MEDIA_OBJECT_KEYS) {
    const raw = obj[key]
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim()
    }
  }
  return ''
}

const normalizeMediaInput = (input: unknown): string[] => {
  if (!input) return []

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') return extractStringFromObject(item as UnknownRecord)
        return ''
      })
      .map(sanitizeMediaPath)
      .filter(Boolean)
  }

  if (typeof input === 'string') {
    const raw = input.trim()
    if (!raw) return []

    // Supports serialized JSON arrays saved as text.
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw)
        return normalizeMediaInput(parsed)
      } catch {
        // Fall through to comma-separated support.
      }
    }

    const list = raw.includes(',') ? splitCommaList(raw) : [raw]
    return list.map(sanitizeMediaPath).filter(Boolean)
  }

  if (typeof input === 'object') {
    return normalizeMediaInput(extractStringFromObject(input as UnknownRecord))
  }

  return []
}

export interface ProjectMediaResult {
  all: string[]
  images: string[]
  videos: string[]
  previewUrl: string
  previewIsVideo: boolean
}

export function getProjectMedia(project: {
  images?: unknown
  videos?: unknown
  media?: unknown
}): ProjectMediaResult {
  const imageItems = normalizeMediaInput(project.images)
  const videoItems = normalizeMediaInput(project.videos)
  const genericItems = normalizeMediaInput(project.media)

  const merged = [...imageItems, ...videoItems, ...genericItems]
  const deduped = Array.from(new Set(merged))

  const videos = deduped.filter((url) => isVideoUrl(url))
  const images = deduped.filter((url) => !isVideoUrl(url))
  const previewUrl = images[0] || videos[0] || ''

  return {
    all: deduped,
    images,
    videos,
    previewUrl,
    previewIsVideo: previewUrl ? isVideoUrl(previewUrl) : false,
  }
}
