import { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { getApiBaseUrl } from '../lib/apiConfig'
import { getFallbackImage, getImageUrl } from '../lib/imageUtils'
import { getWishlistIds } from '../lib/wishlist'
import { addProductToWishlist, ensureWishlistSync, removeProductFromWishlist } from '../lib/wishlist-api'
import { useAuthStore } from '@/store/authStore'
import type { CatalogProduct } from '../types'

interface StandardProductCardProps {
  product: {
    id: string
    title: string
    price: number
    image?: string
    storeName?: string
    storeHref?: string
    storeSlug?: string
    storeId?: string
    category?: string
    stock?: number
    description?: string
    rating?: number
    ratingCount?: number
    showVisitStore?: boolean
    showDescription?: boolean
  }
}

export default function StandardProductCard({ product }: StandardProductCardProps) {
  const router = useRouter()
  const { addToCart } = useCart()
  const { formatPrice } = useCurrency()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const { token, isAuthenticated } = useAuthStore()

  const productId = String(product.id || '').trim()
  const isOutOfStock = Number(product.stock || 0) <= 0
  const imageSrc = product.image
    ? product.image.startsWith('/placeholder') || product.image.startsWith('data:image')
      ? product.image
      : getImageUrl(product.image)
    : getFallbackImage('No Image')
  const storeHref = product.storeHref || '/stores'
  const showVisitStore = product.showVisitStore !== false
  const ratingValue = Number(product.rating ?? 0)
  const ratingCount = Number(product.ratingCount ?? (product as any).reviewsCount ?? (product as any).reviewCount ?? 0)
  const storeSlug = String(product.storeSlug || '').trim()
  const storeId = String(product.storeId || '').trim()


  const renderStars = (rating: number) => {
    const safeRating = Math.max(0, Math.min(5, rating))
    return Array.from({ length: 5 }, (_, index) => {
      const filled = index + 1 <= Math.round(safeRating)
      return (
        <span key={index} className={filled ? 'text-yellow-500' : 'text-gray-300'}>
          ★
        </span>
      )
    })
  }

  const looksLikeId = (value: string) => {
    const v = String(value || '').trim()
    if (!v) return false
    return (
      /^[0-9]+$/.test(v) ||
      /^[0-9a-f]{24}$/i.test(v) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
    )
  }

  const resolveStorePath = async (): Promise<string> => {
    if (storeSlug) return `/store/${encodeURIComponent(storeSlug)}`

    if (storeHref.startsWith('/store/')) {
      const candidate = storeHref.replace('/store/', '').trim()
      if (candidate && !looksLikeId(candidate)) {
        return `/store/${encodeURIComponent(candidate)}`
      }
    }

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/stores`)
      if (!response.ok) return '/stores'

      const payload = await response.json()
      const stores = Array.isArray(payload) ? payload : payload?.data || payload?.stores || []
      const targetName = String(product.storeName || '').trim().toLowerCase()

      const matched = stores.find((store: any) => {
        const sid = String(store.id ?? store._id ?? store.storeId ?? '').trim()
        const sname = String(store.name ?? '').trim().toLowerCase()
        return (storeId && sid === storeId) || (targetName && sname === targetName)
      })

      const resolvedSlug = String(matched?.slug ?? matched?.storeSlug ?? '').trim()
      if (resolvedSlug) {
        return `/store/${encodeURIComponent(resolvedSlug)}`
      }
    } catch (error) {
      console.error('Failed to resolve store slug:', error)
    }

    return '/stores'
  }

  const handleAddToCart = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!productId || isOutOfStock) return

    const cartProduct: CatalogProduct = {
      id: productId,
      title: product.title || 'Product',
      price: Number(product.price || 0),
      image: product.image || '',
      category: product.category || 'General',
      stock: Number(product.stock || 0),
      description: product.description || '',
      storeName: product.storeName,
    }

    addToCart(cartProduct)
  }

  useEffect(() => {
    if (!productId) return

    const refresh = () => {
      const ids = getWishlistIds()
      setIsWishlisted(ids.includes(`product:${productId}`))
    }

    if (!token || !isAuthenticated) {
      setIsWishlisted(false)
      return
    }

    refresh()

    const handleWishlistUpdated = () => {
      refresh()
    }

    if (token) {
      ensureWishlistSync().then(refresh).catch(() => undefined)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('wishlistUpdated', handleWishlistUpdated)
      return () => {
        window.removeEventListener('wishlistUpdated', handleWishlistUpdated)
      }
    }
  }, [productId, token, isAuthenticated])


  const handleWishlistToggle = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!productId) return
    if (!token || !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/product/${productId}`)}`)
      return
    }
    try {
      if (isWishlisted) {
        await removeProductFromWishlist(productId)
      } else {
        await addProductToWishlist(productId)
      }
      const ids = getWishlistIds()
      setIsWishlisted(ids.includes(`product:${productId}`))
    } catch (error) {
      console.error('Failed to update wishlist:', error)
    }
  }

  const handleVisitStore = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const destination = await resolveStorePath()
    router.push(destination)
  }

  const handleOpenProduct = () => {
    if (!productId) return
    router.push(`/product/${productId}`)
  }

  return (
    <article
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-100 h-full flex flex-col cursor-pointer group"
      onClick={handleOpenProduct}
    >
      <div className="relative bg-[#f8f8f8] aspect-square p-5 flex items-center justify-center overflow-hidden">
        <img
          src={imageSrc}
          alt={product.title || 'Product'}
          className="max-w-full max-h-full object-contain"
          loading="lazy"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = getFallbackImage('No Image')
          }}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow gap-2">
        <h3 className="text-[15px] font-semibold leading-[1.4] text-gray-900 line-clamp-2">{product.title || 'Product'}</h3>
        {product.description && (
          <p className="text-xs text-gray-600 line-clamp-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
            {product.description}
          </p>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 text-green-600 font-bold leading-tight price-inline">
            {formatPrice(Number(product.price || 0))}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition flex-shrink-0 ${
              isOutOfStock
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-900 hover:bg-gray-50 hover:scale-105'
            }`}
            aria-label={isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          >
            🛒
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex">{renderStars(ratingValue)}</div>
            <span className="text-[13px] font-medium text-gray-700">{Number.isFinite(ratingCount) ? ratingCount : 0}</span>
          </div>
          <button
            type="button"
            aria-label="Add to wishlist"
            onClick={handleWishlistToggle}
            className={`h-8 w-8 rounded-full border flex items-center justify-center transition ${
              isWishlisted ? 'border-orange-200 text-orange-500' : 'border-gray-200 text-gray-400 hover:text-orange-500'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill={isWishlisted ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </button>
        </div>

        {showVisitStore && (
          <div className="flex justify-end">
            <button
              onClick={handleVisitStore}
              className="text-blue-950 hover:text-blue-950 hover:underline font-bold text-[13px]"
              style={{ color: '#172554', fontWeight: 700 }}
            >
              Visit Store
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

