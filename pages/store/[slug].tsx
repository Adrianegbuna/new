import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../../components/Header'
import ProductCard from '../../components/ProductCard'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { getImageUrl } from '@/lib/imageUtils'
import { getCleanS3Url } from '@/lib/previewUtils'
import { useAuthStore } from '@/store/authStore'

interface Store {
  id: string
  name: string
  description: string
  logo?: string
  logoUrl?: string
  logoKey?: string
  storeLogo?: string
  logo_key?: string
  banner?: string
  rating?: number
  totalReviews?: number
  totalSales?: number
  categories?: string[]
  isVerified?: boolean
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  country?: string
  socialLinks?: {
    facebook?: string
    twitter?: string
    instagram?: string
    tiktok?: string
    whatsapp?: string
  }
  owner?: {
    id?: string
    firstName: string
    lastName: string
  }
  products?: any[]
}

interface Review {
  id: number
  userName: string
  rating: number
  comment: string
  date: string
}

export default function StorePage() {
  const router = useRouter()
  const { slug } = router.query
  const { user, token, isHydrated } = useAuthStore()
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [reviews, setReviews] = useState<Review[]>([])
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [reviewEligibility, setReviewEligibility] = useState<{ checked: boolean; allowed: boolean; reason?: string }>({
    checked: false,
    allowed: false,
  })
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: ''
  })
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [logoLoadError, setLogoLoadError] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const evCategoryName = 'Electric Vehicles & Parts'

  useEffect(() => {
    setLogoLoadError(false)
    if (slug) {
      fetchStore()
      fetchReviews()
    }
  }, [slug])

  useEffect(() => {
    if (!isHydrated || !user || !token || !store?.id) {
      return
    }
    setReviewEligibility({ checked: false, allowed: false })
  }, [isHydrated, user, token, store?.id])

  useEffect(() => {
    if (!isHydrated || !store?.id) return
    if (!user || !token) return
    if (!isEvStore(store)) return
    if (!reviewEligibility.checked) {
      ensureReviewEligibility()
    }
  }, [isHydrated, store?.id, user, token, reviewEligibility.checked])

  const matchesStore = (item: any, storeId: string, storeName: string) => {
    const candidates = [item?.storeId, item?.store?.id, item?.store_id, item?.vendorId, item?.vendor_id]
    if (candidates.some((candidate) => candidate && String(candidate) === storeId)) {
      return true
    }
    const itemStoreName = String(item?.storeName || item?.store?.name || '').trim().toLowerCase()
    return storeName && itemStoreName && itemStoreName === storeName
  }

  const isEvStore = (storeValue: Store | null) => {
    if (!storeValue) return false
    const categories = Array.isArray(storeValue.categories)
      ? storeValue.categories
      : (storeValue.categories ? [storeValue.categories] : [])
    const categoryNames = categories.map((c: any) => String(c?.name || c).toLowerCase())
    const accountType = String((storeValue as any)?.accountType || (storeValue as any)?.storeType || (storeValue as any)?.type || '').toLowerCase()
    return (
      categoryNames.includes(evCategoryName.toLowerCase()) ||
      accountType === 'ev_vendor' ||
      accountType === 'ev'
    )
  }

  const ensureReviewEligibility = async () => {
    if (!isHydrated) {
      return { allowed: false, reason: 'Checking login status. Please try again.' }
    }

    if (!user || !token) {
      return { allowed: false, reason: 'Please login to leave a review.' }
    }

    if (!store?.id) {
      return { allowed: false, reason: 'Unable to find this store.' }
    }

    if (reviewEligibility.checked) {
      return reviewEligibility
    }

    setCheckingEligibility(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to verify delivery status')
      }

      const data = await response.json()
      const orders = Array.isArray(data) ? data : []
      const storeId = String(store.id)
      const storeName = String(store.name || '').trim().toLowerCase()
      const hasDeliveredOrder = orders.some((order: any) => {
        const status = String(order?.orderStatus || '').toLowerCase()
        const delivered = status === 'delivered' || status === 'completed'
        if (!delivered) return false
        return Array.isArray(order?.items) && order.items.some((item: any) => matchesStore(item, storeId, storeName))
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

  const fetchStore = async () => {
    try {
      const encodedSlug = encodeURIComponent(slug as string)
      const apiBase = getApiBaseUrl()
      let response = await fetch(`${apiBase}/stores/slug/${encodedSlug}`)
      if (!response.ok) {
        response = await fetch(`${apiBase}/stores/${encodedSlug}`)
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const resolvedLogo = data.logoUrl || data.logo || data.storeLogo || data.logoKey || data.logo_key || ''
      if (resolvedLogo) {
        data.logoUrl = resolvedLogo
      }
      
      // Ensure products array exists even if empty
      if (!data.products) {
        data.products = []
      }
      
      setStore(data)
    } catch (error) {
      console.error('❌ Failed to fetch store:', error)
      setStore(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/reviews/stores/${slug}`)
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

    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/reviews/stores/${slug}`, {
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
            className={`text-2xl ${star <= rating ? 'text-orange-500' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'}`}
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

  const averageRating = reviews.length > 0
    ? Number(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : typeof store?.rating === 'number'
      ? store.rating.toFixed(1)
      : '0.0'
  const rawStoreLogo = store?.logoUrl || store?.logo || store?.storeLogo || store?.logoKey || store?.logo_key || ''
  const storeLogoSrc = rawStoreLogo
    ? getImageUrl(rawStoreLogo.startsWith('http') && rawStoreLogo.includes('X-Amz-') ? getCleanS3Url(rawStoreLogo) : rawStoreLogo)
    : ''
  const isStoreOwner = Boolean(user?.id && store?.owner?.id && String(user.id) === String(store.owner.id))

  const handleStoreLogoUpload = async (file: File | null) => {
    if (!file || !store?.id || !token) return
    setUploadingLogo(true)
    try {
      const { uploadImageToS3 } = await import('@/lib/s3ImageUploader')
      const s3Url = await uploadImageToS3(file, `store-logos/${store.id}`)
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/stores/${store.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logoUrl: s3Url }),
      })
      const raw = await response.text()
      let data: any = null
      try {
        data = raw ? JSON.parse(raw) : null
      } catch {
        data = null
      }
      if (!response.ok) {
        throw new Error(data?.message || raw || 'Failed to upload store logo')
      }

      setStore((prev) =>
        prev
          ? {
              ...prev,
              logo: data?.logo || data?.logoUrl || s3Url || prev.logo,
              logoUrl: data?.logoUrl || data?.logo || s3Url || prev.logoUrl,
              logoKey: data?.logoKey || prev.logoKey,
            }
          : prev
      )
      setLogoLoadError(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    } catch (error: any) {
      alert(error?.message || 'Failed to upload store logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">Loading store...</div>
      </div>
    )
  }

  if (!store) {
    return (
      <div>
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-black font-semibold mb-4">Store not found</p>
          <Link href="/vendors" className="text-green-600 hover:underline">Browse all stores</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Head>
        <title>{store.name} - RenewableZmart</title>
        <meta name="description" content={store.description} />
      </Head>
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {storeLogoSrc && !logoLoadError ? (
                <div 
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white cursor-pointer hover:opacity-90 transition flex-shrink-0"
                  onClick={() => {
                    if (storeLogoSrc) setViewingImage(storeLogoSrc)
                  }}
                  title="Click to view full size"
                >
                  <img
                    src={storeLogoSrc}
                    alt={store.name}
                    className="w-full h-full object-cover"
                    onError={() => setLogoLoadError(true)}
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
                  {store.name ? store.name.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
              {isStoreOwner && (
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleStoreLogoUpload(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Change Logo'}
                  </button>
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-blue-950" style={{ color: '#172554', fontWeight: 900, WebkitTextFillColor: 'currentColor' }}>{store.name}</h1>
                </div>
                
                <p className="text-black font-bold mb-4">{store.description}</p>

                <div className="flex flex-wrap gap-6 text-sm">
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(parseFloat(averageRating)))}
                      <span className="font-semibold">{averageRating}</span>
                      <span className="text-black font-bold">({reviews.length} reviews)</span>
                    </div>
                  )}
                  {store.city && store.country && (
                    <div className="text-black font-bold">
                      📍 {store.city}, {store.country}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('products')}
                className={`pb-4 font-semibold ${activeTab === 'products' ? 'border-b-2 border-green-600 text-green-600' : 'text-black font-bold'}`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`pb-4 font-semibold ${activeTab === 'about' ? 'border-b-2 border-green-600 text-green-600' : 'text-black font-bold'}`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-4 font-semibold ${activeTab === 'reviews' ? 'border-b-2 border-green-600 text-green-600' : 'text-black font-bold'}`}
              >
                Reviews ({reviews.length})
              </button>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'products' ? (
            <div>
              {store.products && store.products.length > 0 ? (
                <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch mb-12">
                  {store.products
                    .filter((product: any) => Number(product?.stock ?? 0) > 0)
                    .map(product => (
                    <ProductCard key={product.id} product={product} showVisitStore={false} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-black font-semibold">No products available yet</p>
                </div>
              )}
            </div>
          ) : activeTab === 'about' ? (
            <div className="bg-white rounded-lg shadow-md p-8 mb-12">
              <h2 className="text-2xl font-bold mb-4">About {store.name}</h2>
              <p className="text-black font-bold mb-6">{store.description}</p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-black text-lg sm:text-xl mb-3 text-black">Contact Information</h3>
                  {store.email && <p className="text-black font-bold mb-2">📧 {store.email}</p>}
                  {store.phone && <p className="text-black font-bold mb-2">📞 {store.phone}</p>}
                  {store.address && <p className="text-black font-bold">📍 {store.address}</p>}
                </div>

                <div>
                  <h3 className="font-black text-lg sm:text-xl mb-3 text-black">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {store.categories?.map((cat, idx) => (
                      <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Customer Reviews</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center">
                      {renderStars(Math.round(parseFloat(averageRating)))}
                    </div>
                    <span className="text-xl font-semibold">{averageRating}</span>
                    <span className="text-black font-bold">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
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
                  disabled={isEvStore(store) && reviewEligibility.checked && !reviewEligibility.allowed}
                  className={`px-6 py-2 rounded-lg font-semibold ${
                    isEvStore(store) && reviewEligibility.checked && !reviewEligibility.allowed
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {showReviewForm ? 'Cancel' : '✍️ Write Review'}
                </button>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-bold text-lg mb-4">Share Your Experience</h4>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-black font-semibold mb-2">Your Rating</label>
                    {renderStars(reviewForm.rating, true, (rating) => setReviewForm(prev => ({ ...prev, rating })))}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-black font-semibold mb-2">Your Review</label>
                    <textarea
                      required
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="Tell us about your experience with this store..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 font-semibold"
                  >
                    Submit Review
                  </button>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-base sm:text-lg font-black text-black">No reviews yet</p>
                    <p className="text-sm font-black text-black">Be the first to review this store!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div 
                      key={review.id} 
                      className="border-b pb-4 p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 border-gray-200 hover:shadow-md"
                      onClick={(e) => {
                        // Toggle review highlight on click - grey to green
                        const element = e.currentTarget as HTMLElement;
                        if (element) {
                          element.classList.toggle('border-green-500');
                          element.classList.toggle('bg-green-50');
                          element.classList.toggle('border-gray-200');
                        }
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-black">{review.userName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <span className="text-sm text-black font-semibold">{new Date(review.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-black mt-2">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-black dark:hover:text-gray-100"
            >
              ✕ Close
            </button>
            <img 
              src={viewingImage} 
              alt="Store logo" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  )
}

