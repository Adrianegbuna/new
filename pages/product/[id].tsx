import { useRouter } from 'next/router'
import { useState, useEffect, useMemo } from 'react'
import Header from '@/components/layout/Header'
import MediaCarousel from '@/components/product/MediaCarousel'
import { useCart } from '@/context/CartContext'
import { useCurrency } from '@/context/CurrencyContext'
import type { CatalogProduct } from '@/types'
import { productService } from '@/lib/services'
import { getApiBaseUrl, getBackendBaseUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'
import { getWishlistIds } from '@/lib/wishlist'
import { addProductToWishlist, ensureWishlistSync, removeProductFromWishlist } from '@/lib/wishlist-api'

interface Review {
  id: number
  userName: string
  rating: number
  comment: string
  date: string
}

export default function ProductPage() {
  const router = useRouter()
  const { id } = router.query
  const { addToCart } = useCart()
  const { formatPrice } = useCurrency()
  const { user, token, isHydrated, isAuthenticated, setToken } = useAuthStore()
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [categoryName, setCategoryName] = useState<string>('')
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [reviewEligibility, setReviewEligibility] = useState<{ checked: boolean; allowed: boolean; reason?: string }>({
    checked: false,
    allowed: false,
  })
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: ''
  })
  const evCategoryName = 'Electric Vehicles & Parts'

  const getCategoryLabel = () => {
    const storeCategories = (product as any)?.store?.categories
    const storeCategoryList = Array.isArray(storeCategories) ? storeCategories.join(' ') : String(storeCategories || '')
    const raw =
      (product as any)?.categoryName ||
      (product as any)?.category ||
      (product as any)?.subcategory ||
      (product as any)?.store?.category ||
      (product as any)?.store?.categoryName ||
      storeCategoryList ||
      categoryName ||
      ''
    return String(raw).toLowerCase()
  }

  const isEvProduct = () => {
    const label = getCategoryLabel()
    const storeAccountType = String((product as any)?.store?.accountType || (product as any)?.store?.storeType || (product as any)?.store?.type || '').toLowerCase()
    if (storeAccountType === 'ev_vendor' || storeAccountType === 'ev') {
      return true
    }
    if (label.includes(evCategoryName.toLowerCase()) || label.includes('electric vehicle') || label.includes('electric vehicles') || label.includes('ev')) {
      return true
    }
    const name = String(product?.title || (product as any)?.name || '').toLowerCase()
    const evKeywords = ['ev', 'electric', 'bike', 'scooter', 'motorcycle', 'vehicle', 'car', 'tricycle']
    return evKeywords.some((keyword) => name.includes(keyword))
  }

  const normalizeText = (value: unknown) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const isPaySmallSmallEligibleProduct = () => {
    if (!product) return false
    const haystack = normalizeText(
      `${(product as any)?.category || ''} ${(product as any)?.categoryName || ''} ${product.title || ''}`
    )
    const hasSolarPanelPhrase = haystack.includes('solar panel') || haystack.includes('solar panels')
    const hasInverterPhrase = haystack.includes('inverter') || haystack.includes('inverters')
    const hasBatteryPhrase = haystack.includes('battery') || haystack.includes('batteries')
    return hasSolarPanelPhrase || hasInverterPhrase || hasBatteryPhrase
  }

  useEffect(() => {
    if (id) {
      fetchProduct()
      fetchReviews()
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    const productId = String(id)

    const refresh = () => {
      const ids = getWishlistIds()
      setIsWishlisted(ids.includes(`product:${productId}`))
    }

    refresh()

    if (token) {
      ensureWishlistSync().then(refresh).catch(() => undefined)
    }

    if (typeof window !== 'undefined') {
      const handleWishlistUpdated = () => refresh()
      window.addEventListener('wishlistUpdated', handleWishlistUpdated)
      return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdated)
    }
  }, [id, token])

  useEffect(() => {
    if (!isHydrated || !user || !token || !id) {
      return
    }
    setReviewEligibility({ checked: false, allowed: false })
  }, [isHydrated, user, token, id])

  useEffect(() => {
    if (!isHydrated) return
    if (token) return
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (storedToken) {
      setToken(storedToken)
    }
  }, [isHydrated, token, setToken])

  const matchesProduct = (item: any, productId: string) => {
    const candidates = [item?.productId, item?.product?.id, item?.product_id, item?.id]
    return candidates.some((candidate) => candidate && String(candidate) === productId)
  }

  const ensureReviewEligibility = async () => {
    if (!isHydrated) {
      return { allowed: false, reason: 'Checking login status. Please try again.' }
    }

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const effectiveToken = token || storedToken

    if (!user || !effectiveToken) {
      return { allowed: false, reason: 'Please login to leave a review.' }
    }

    if (!id) {
      return { allowed: false, reason: 'Unable to find this product.' }
    }

    if (reviewEligibility.checked) {
      return reviewEligibility
    }

    setCheckingEligibility(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to verify delivery status')
      }

      const data = await response.json()
      const orders = Array.isArray(data) ? data : []
      const productId = String(id)
      const hasDeliveredOrder = orders.some((order: any) => {
        const status = String(order?.orderStatus || '').toLowerCase()
        const delivered = status === 'delivered' || status === 'completed'
        if (!delivered) return false
        return Array.isArray(order?.items) && order.items.some((item: any) => matchesProduct(item, productId))
      })

      const eligibility = {
        checked: true,
        allowed: hasDeliveredOrder,
        reason: hasDeliveredOrder ? undefined : 'Reviews are available after successful delivery.',
      }
      setReviewEligibility(eligibility)
      return eligibility
    } catch (error) {
      const eligibility = {
        checked: true,
        allowed: false,
        reason: 'Unable to verify delivery yet. Please try again shortly.',
      }
      setReviewEligibility(eligibility)
      return eligibility
    } finally {
      setCheckingEligibility(false)
    }
  }

  const fetchProduct = async () => {
    try {
      const data = await productService.getById(String(id))
      setProduct(data as any)
      
      // Fetch category name if categoryId exists
      if ((data as any).categoryId) {
        try {
          const apiBase = getApiBaseUrl()
          const catResponse = await fetch(`${apiBase}/categories/${(data as any).categoryId}`)
          if (catResponse.ok) {
            const catData = await catResponse.json()
            setCategoryName(catData.name || '')
          }
        } catch (catError) {
          console.error('Failed to fetch category name:', catError)
        }
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/reviews/products/${id}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const eligibility = await ensureReviewEligibility()
    if (!eligibility.allowed) {
      alert(eligibility.reason || 'Please login to leave a review')
      if (!user || !token) {
        router.push('/login')
      }
      return
    }

    if (reviewForm.rating === 0) {
      alert('Please select a rating (1-5 stars)')
      return
    }

    if (!reviewForm.comment.trim()) {
      alert('Please write a comment')
      return
    }

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/reviews/products/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        alert('Review submitted successfully!')
        setShowReviewForm(false)
        setReviewForm({ rating: 0, comment: '' })
        fetchReviews()
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        alert(`Failed to submit review: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert(`Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const renderStars = (rating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl ${
              star <= rating ? 'text-emerald-600' : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'}`}
            onClick={(e) => {
              e.preventDefault()
              if (interactive && onChange) {
                onChange(star)
              }
            }}
            disabled={!interactive}
          >
            ★
          </button>
        ))}
      </div>
    )
  }

  const renderEmptyStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-2xl" style={{ color: '#d1d5db' }}>
            ★
          </span>
        ))}
      </div>
    )
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  // Calculate installment details
  const getInstallmentDetails = (price: number) => {
    const firstPayment = price * 0.5
    const balance = price - firstPayment
    
    if (price >= 750000 && price <= 1500000) {
      // 3 months for 750k - 1.5M
      const monthlyPayment = balance / 3
      return {
        firstPayment,
        monthlyPayment,
        months: 3,
        totalMonths: 4 // 1 upfront + 3 installments
      }
    } else {
      // 6 months for amounts outside the 3-month bracket
      const monthlyPayment = balance / 6
      return {
        firstPayment,
        monthlyPayment,
        months: 6,
        totalMonths: 7 // 1 upfront + 6 installments
      }
    }
  }

  const installment = product ? getInstallmentDetails(product.price) : null

  const shareUrl = useMemo(() => {
    if (!id) return ''
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/product/${id}`
  }, [id])

  const shareText = product?.title
    ? `Check out ${product.title} on RenewableZmart`
    : 'Check out this product on RenewableZmart'

  const shareTargets = [
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
  ]

  // Get full image URL
  const primaryImageUrl = (() => {
    const baseUrl = typeof window !== 'undefined' 
      ? getBackendBaseUrl()
      : getBackendBaseUrl()
    return product?.image?.startsWith('http') 
      ? product.image 
      : `${baseUrl}${product?.image || ''}`
  })()

  useEffect(() => {
    if (!showShareMenu) return
    const handleClose = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('[data-share-menu="product-detail"]')) return
      setShowShareMenu(false)
    }
    document.addEventListener('mousedown', handleClose as any)
    return () => document.removeEventListener('mousedown', handleClose as any)
  }, [showShareMenu])

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-900 font-bold">Loading product...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!product) {
    return <div><Header /><main className="container mx-auto px-4 py-8"><p>Product not found</p></main></div>
  }

  const handleWishlistToggle = async () => {
    if (!id) return
    if (!isAuthenticated || !token) {
      router.push(`/login?redirect=${encodeURIComponent(`/product/${id}`)}`)
      return
    }
    try {
      if (isWishlisted) {
        await removeProductFromWishlist(String(id))
      } else {
        await addProductToWishlist(String(id))
      }
      const ids = getWishlistIds()
      setIsWishlisted(ids.includes(`product:${String(id)}`))
    } catch (error) {
      console.error('Failed to update wishlist:', error)
    }
  }

  const handleShare = async () => {
    if (!shareUrl) return
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.title || 'RenewableZmart Product', text: shareText, url: shareUrl })
        return
      }
    } catch (error) {
      // fallback to menu
    }
    setShowShareMenu((prev) => !prev)
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShowShareMenu(false)
      alert('Link copied to clipboard')
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-900 font-bold mb-4">
          <span className="hover:underline cursor-pointer" onClick={() => router.push('/')}>Home</span>
          <span className="mx-2">›</span>
          <span className="hover:underline cursor-pointer">{categoryName || 'Category'}</span>
          <span className="mx-2">›</span>
          <span className="text-gray-900">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr_300px] gap-4">
          {/* Left: Image/Video Gallery with Carousel */}
          <MediaCarousel 
            mainImage={primaryImageUrl}
            images={(product as any).images || []}
            videos={(product as any).videos || []}
            title={product.title}
          />

          {/* Middle: Product Details */}
          <div className="bg-white rounded-lg p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3 mb-3" data-share-menu="product-detail">
              <h1 className="text-lg sm:text-xl font-bold text-black leading-snug">{product.title}</h1>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleShare}
                  className="h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-800 hover:bg-gray-50 transition"
                  aria-label="Share product"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <path d="M16 6l-4-4-4 4" />
                    <path d="M12 2v14" />
                  </svg>
                </button>
                {showShareMenu && shareUrl && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                    {shareTargets.map((target) => (
                      <a
                        key={target.label}
                        href={target.href}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {target.label}
                      </a>
                    ))}
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Copy Link
                    </button>
                    <a
                      href="https://www.instagram.com"
                      target="_blank"
                      rel="noreferrer"
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Instagram (copy link)
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Rating - Only show if there are reviews */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                <div className="flex items-center">
                  {renderStars(parseFloat(averageRating))}
                </div>
                <span className="text-sm">({reviews.length} verified ratings)</span>
              </div>
            )}

            {/* Price */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-bold text-black price-inline-lg">{formatPrice(Number(product.price))}</p>
              {isAuthenticated && token && (
                <button
                  type="button"
                  onClick={handleWishlistToggle}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isWishlisted
                      ? 'border-rose-200 text-rose-600 bg-rose-50'
                      : 'border-gray-200 text-gray-600 hover:text-rose-600 hover:border-rose-200'
                  }`}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <span className="text-sm">{isWishlisted ? '❤️' : '🤍'}</span>
                  {isWishlisted ? 'Saved' : 'Save'}
                </button>
              )}
            </div>

            {/* Pay Small Small */}
            {installment && !isEvProduct() && isPaySmallSmallEligibleProduct() && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                <p className="font-bold text-sm text-black mb-1">💳 Pay Small Small</p>
                <p className="text-sm text-black font-bold">
                  <span className="font-bold price-inline">{formatPrice(Number(installment.firstPayment))}</span> upfront, 
                  then <span className="font-bold price-inline">{formatPrice(Number(installment.monthlyPayment))}/month</span> for {installment.months} months
                </p>
                <p className="text-xs text-black font-bold mt-1">0% interest • No hidden charges</p>
              </div>
            )}

            {/* Key Features */}
            <div className="mb-4">
              <h3 className="font-bold text-black mb-2">Key Features</h3>
              <ul className="text-sm space-y-1 text-black font-bold">
                <li>✓ High Quality {categoryName || 'Product'}</li>
                <li>✓ {product.stock} units in stock</li>
                {product.eco && <li>✓ Eco-Friendly & Sustainable</li>}
                <li>✓ Fast Delivery Available</li>
                <li>✓ Official Warranty</li>
              </ul>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="font-bold text-black mb-2">Product Description</h3>
              <p className="text-sm text-black font-semibold leading-relaxed">
                {(product as any).description && (product as any).description.trim().length > 0 && (product as any).description !== 'fix' 
                  ? (product as any).description 
                  : `High-quality ${categoryName || 'Product'} designed for reliable performance. This renewable energy product offers excellent value and durability, perfect for residential and commercial applications. Comes with manufacturer warranty and technical support.`}
              </p>
            </div>
          </div>

          {/* Right: Purchase Card (3rd column) */}
          <div>
            <div className="bg-white rounded-lg p-4 mb-4 sticky top-4">
              <h3 className="font-bold text-black mb-3">DELIVERY & RETURNS</h3>

              <div className="mb-4">
                <p className="text-sm font-bold text-black mb-1">🚚 Delivery</p>
                <p className="text-sm text-black font-bold">Estimated delivery: 3-7 days</p>
              </div>

              {!isEvProduct() && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm font-bold text-black mb-1">🔧 Installation</p>
                  <p className="text-sm text-black font-bold">Installation within 7 working days</p>
                </div>
              )}

              <div className="space-y-2">
                <button 
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition"
                  onClick={() => { addToCart(product); router.push('/cart') }}
                >
                  ADD TO CART
                </button>
              </div>

              {/* Seller Info */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-black font-bold mb-1">SOLD BY</p>
                {(product as any).store?.slug ? (
                  <button 
                    onClick={() => router.push(`/store/${(product as any).store.slug}`)}
                    className="font-semibold text-sm text-emerald-600 hover:underline cursor-pointer"
                  >
                    {(product as any).store.name}
                  </button>
                ) : (
                  <p className="font-semibold text-sm">{(product as any).store?.name || 'Business Day'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews */}
        <div className="mt-4 bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-black">Customer Feedback</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center text-sm">
                  {renderStars(parseFloat(averageRating))}
                </div>
                <span className="font-bold text-black">{averageRating}/5</span>
                <span className="text-sm text-black font-bold">({reviews.length} verified ratings)</span>
              </div>
            </div>
            <button
              onClick={async () => {
                if (checkingEligibility) {
                  alert('Checking delivery status. Please wait.')
                  return
                }
                const eligibility = await ensureReviewEligibility()
                if (!eligibility.allowed) {
                  alert(eligibility.reason || 'Please login to write a review')
                  if (!user || !token) {
                    router.push('/login')
                  }
                  return
                }
                setShowReviewForm(!showReviewForm)
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold"
            >
              {showReviewForm ? 'Cancel' : '⭐ Write Review'}
            </button>
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Rating</label>
                {renderStars(reviewForm.rating, true, (rating) => setReviewForm(prev => ({ ...prev, rating })))}
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Review</label>
                <textarea
                  required
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Share your experience..."
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold"
              >
                Submit Review
              </button>
            </form>
          )}

          {/* Reviews List - Compact */}
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-6 text-black text-sm font-bold">
                <p>No reviews yet. Be the first!</p>
              </div>
            ) : (
              reviews.slice(0, 5).map((review) => (
                <div 
                  key={review.id} 
                  className="border-2 border-gray-200 pb-3 last:border-0 cursor-pointer transition-all duration-200 p-3 rounded-lg hover:shadow-md bg-white"
                  onClick={(e) => {
                    // Toggle review highlight on click - grey to green
                    const element = e.currentTarget as HTMLElement;
                    if (element) {
                      element.classList.toggle('border-green-500');
                      element.classList.toggle('bg-green-50');
                      element.classList.toggle('border-gray-200');
                      element.classList.toggle('bg-white');
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-black">{review.userName}</p>
                        <div className="flex items-center gap-1 text-xs">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-black font-bold">{new Date(review.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-black font-semibold ml-10">{review.comment}</p>
                </div>
              ))
            )}
            {reviews.length > 5 && (
              <button className="text-emerald-600 text-sm font-bold hover:underline">
                See all {reviews.length} reviews
              </button>
            )}
          </div>
        </div>
      </main>

    </div>
  )
}

