import { triggerHaptic } from './haptics'
const STORAGE_KEY = 'renewablezmart_wishlist'
const STORAGE_MAP_KEY = 'renewablezmart_wishlist_map'

const emitWishlistUpdated = (ids: string[]) => {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { ids } }))
  } catch (error) {
    console.warn('Failed to emit wishlistUpdated event:', error)
  }
}

export function getWishlistIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : []
  } catch (error) {
    console.error('Failed to read wishlist storage:', error)
    return []
  }
}

export function setWishlistIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    emitWishlistUpdated(ids)
  } catch (error) {
    console.error('Failed to write wishlist storage:', error)
  }
}

export function isWishlisted(id: string): boolean {
  return getWishlistIds().includes(id)
}

export function toggleWishlistId(id: string): string[] {
  const ids = getWishlistIds()
  const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
  setWishlistIds(next)
  triggerHaptic(15)
  return next
}

export function getWishlistProductIds(): string[] {
  return getWishlistIds()
    .filter((id) => id.startsWith('product:'))
    .map((id) => id.replace(/^product:/, ''))
}

export function replaceProductWishlistIds(productIds: string[]): string[] {
  const existing = getWishlistIds()
  const nonProduct = existing.filter((id) => !id.startsWith('product:'))
  const normalized = productIds
    .map((id) => String(id || '').trim())
    .filter(Boolean)
    .map((id) => `product:${id}`)
  const next = Array.from(new Set([...nonProduct, ...normalized]))
  setWishlistIds(next)
  return next
}

export function getWishlistMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_MAP_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.error('Failed to read wishlist map:', error)
    return {}
  }
}

export function setWishlistMap(map: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_MAP_KEY, JSON.stringify(map || {}))
  } catch (error) {
    console.error('Failed to write wishlist map:', error)
  }
}
