import { apiClient } from './api-client'
import {
  getWishlistIds,
  setWishlistIds,
  getWishlistMap,
  setWishlistMap,
} from './wishlist'
import { triggerHaptic } from './haptics'

const WISHLIST_SYNC_TTL_MS = 60 * 1000
let lastSyncAt = 0
let syncPromise: Promise<void> | null = null

const toLocalWishlistId = (value: string): string => {
  const cleaned = String(value || '').trim()
  if (!cleaned) return ''
  return cleaned.includes(':') ? cleaned : `product:${cleaned}`
}

const toServerProductId = (value: string): string => {
  const localId = toLocalWishlistId(value)
  return localId.startsWith('product:') ? localId.slice('product:'.length) : localId
}

const buildWishlistMap = (items: any[]) => {
  const map: Record<string, string> = {}
  items.forEach((item) => {
    const productId = toLocalWishlistId(String(item?.productId || ''))
    const wishlistId = String(item?.id || '').trim()
    if (productId && wishlistId) {
      map[productId] = wishlistId
    }
  })
  return map
}

export const syncWishlistFromApi = async (): Promise<{ productIds: string[]; map: Record<string, string> }> => {
  const response = await apiClient.get('/wishlist')
  const items = Array.isArray(response?.data?.data) ? response.data.data : []
  const productIds = items
    .map((item: any) => toLocalWishlistId(String(item?.productId || '')))
    .filter(Boolean)
  const map = buildWishlistMap(items)
  setWishlistIds(Array.from(new Set(productIds)))
  setWishlistMap(map)
  lastSyncAt = Date.now()
  return { productIds, map }
}

export const ensureWishlistSync = async (force = false): Promise<void> => {
  if (!force && Date.now() - lastSyncAt < WISHLIST_SYNC_TTL_MS) return
  if (syncPromise) return syncPromise
  syncPromise = syncWishlistFromApi()
    .then(() => undefined)
    .catch((error) => {
      console.error('Failed to sync wishlist:', error)
    })
    .finally(() => {
      syncPromise = null
    })
  return syncPromise
}

export const fetchWishlistCount = async (): Promise<number> => {
  const response = await apiClient.get('/wishlist/count')
  const raw = response?.data?.count ?? response?.data?.data?.count ?? 0
  const count = Number(raw)
  return Number.isFinite(count) ? count : 0
}

export const addProductToWishlist = async (
  productId: string,
  metadata?: {
    productName?: string
    productPrice?: number
    productImage?: string
    productCategory?: string
  }
): Promise<void> => {
  const cleanedId = String(productId || '').trim()
  if (!cleanedId) return
  const localId = toLocalWishlistId(cleanedId)
  const response = await apiClient.post('/wishlist/add', {
    productId: toServerProductId(localId),
    productName: metadata?.productName,
    productPrice: metadata?.productPrice,
    productImage: metadata?.productImage,
    productCategory: metadata?.productCategory,
  })
  const wishlistId = String(response?.data?.data?.id || '').trim()
  const current = getWishlistIds()
  const next = Array.from(new Set([...current, localId]))
  setWishlistIds(next)
  if (wishlistId) {
    const map = getWishlistMap()
    map[localId] = wishlistId
    setWishlistMap(map)
  }
  triggerHaptic(15)
}

export const removeProductFromWishlist = async (productId: string): Promise<void> => {
  const cleanedId = String(productId || '').trim()
  if (!cleanedId) return
  const localId = toLocalWishlistId(cleanedId)
  let map = getWishlistMap()
  let wishlistId = map[localId] || map[cleanedId] || map[toServerProductId(localId)]

  if (!wishlistId) {
    try {
      const synced = await syncWishlistFromApi()
      map = synced.map
      wishlistId = map[localId] || map[cleanedId] || map[toServerProductId(localId)]
    } catch (error) {
      console.error('Failed to refresh wishlist before removal:', error)
    }
  }

  if (!wishlistId) return

  await apiClient.delete(`/wishlist/${wishlistId}`)
  const remaining = getWishlistIds().filter((id) => id !== localId)
  setWishlistIds(remaining)
  map = getWishlistMap()
  delete map[localId]
  delete map[cleanedId]
  delete map[toServerProductId(localId)]
  setWishlistMap(map)
  triggerHaptic(15)
}
