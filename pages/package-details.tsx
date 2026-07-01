import Head from 'next/head'
import { useState, useEffect, MouseEvent } from 'react'
import { useRouter } from 'next/router'
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { openLiveChatPopup } from '@/lib/liveChat'
import { useCurrency } from '@/context/CurrencyContext'
import { useCart } from '@/context/CartContext'
import { useAuthStore } from '@/store/authStore'
import { getWishlistIds } from '@/lib/wishlist'
import { addProductToWishlist, ensureWishlistSync, removeProductFromWishlist } from '@/lib/wishlist-api'
import { getVideoMimeType, isVideoUrl } from '@/lib/imageUtils'
import { openVideoFullscreen } from '@/lib/videoFullscreen'
import type { CatalogProduct } from '@/types'

interface Package {
  id: string
  name: string
  panelRange: string | null
  maxBatteryLithium: number
  maxBatteryTubular: number
  inverterType: 'standard' | 'hybrid'
  powers: string
  warranty: string
  vendorPrice: number | null
  image: string | null
  images: string[] | null
  quantity?: number | string | null
  stock?: number | string | null
  availableQuantity?: number | string | null
  description?: string | null
  storeId?: string | null
  storeName?: string | null
  category?: string | null
  store: {
    id: string
    name: string
    city: string
    country: string
  } | null
  createdAt: string
}

export default function PackageDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const { formatPrice } = useCurrency()
  const { user } = useAuthStore()
  const { addToCart } = useCart()
  const [packageData, setPackageData] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [wishlistIds, setWishlistIds] = useState<string[]>([])

  const supportPhoneNumber = '+2349022298109'
  const supportMessage = packageData?.name
    ? `Hi RenewableZmart Support, I need help with this Flash Deal: ${packageData.name}`
    : 'Hi RenewableZmart Support, I need help with a Flash Deal.'
  const callSupportLink = `tel:${supportPhoneNumber}`
  const emailSupportLink = `mailto:support@renewablezmart.com?subject=${encodeURIComponent('Flash Deal Support Request')}&body=${encodeURIComponent(supportMessage)}`

  useEffect(() => {
    if (!id) return

    const fetchPackageDetails = async () => {
      try {
        setLoading(true)
        console.log('[PACKAGE DETAILS] Fetching package:', id)
        const response = await apiClient.get(`/packages/${id}`)
        const data = response.data
        console.log('[PACKAGE DETAILS] Package data:', data)
        setPackageData(data)
      } catch (err: any) {
        console.error('[PACKAGE DETAILS] Error fetching package:', err)
        setError(err.response?.data?.message || 'Failed to load package details')
      } finally {
        setLoading(false)
      }
    }

    fetchPackageDetails()
  }, [id])

  useEffect(() => {
    const initWishlist = async () => {
      if (!user) {
        setWishlistIds(getWishlistIds())
        return
      }
      try {
        await ensureWishlistSync()
      } catch (syncError) {
        console.error('Failed to sync wishlist on package details page:', syncError)
      } finally {
        setWishlistIds(getWishlistIds())
      }
    }
    initWishlist()
  }, [user])

  if (loading) {
    return (
      <>
        <Head><title>Package Details - RenewableZmart</title></Head>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <p className="text-gray-600 font-semibold mt-4">Loading package details...</p>
          </div>
        </div>
      </>
    )
  }

  if (error || !packageData) {
    return (
      <>
        <Head><title>Package Not Found - RenewableZmart</title></Head>
        <Header />
        <main className="min-h-screen bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <div className="bg-white rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold mb-2 text-gray-900">{error || 'Package Not Found'}</h1>
              <p className="text-gray-600 font-semibold mb-6">The package you're looking for doesn't exist or has been removed.</p>
              <Link href="/deals" className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-semibold">
                ← Back to Flash Deals
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const displayImages = packageData.images && packageData.images.length > 0 
    ? packageData.images 
    : (packageData.image ? [packageData.image] : [])

  const evCategoryName = 'Electric Vehicles & Parts'
  const categoryValue = String(packageData.category || '').toLowerCase().trim()
  const nameValue = String(packageData.name || '').toLowerCase().trim()
  const evKeywordHint = ['ev', 'electric', 'bike', 'scooter', 'motorcycle', 'vehicle', 'car', 'tricycle']
  const isEvPackage =
    categoryValue.includes(evCategoryName.toLowerCase()) ||
    categoryValue.includes('electric') ||
    categoryValue.includes('ev') ||
    categoryValue.includes('vehicle') ||
    (!!packageData.description && categoryValue === 'flash-deal') ||
    evKeywordHint.some((keyword) => nameValue.includes(keyword))
  const rawBatteryType = categoryValue
  const hasLithium = Number(packageData.maxBatteryLithium || 0) > 0
  const hasTubular = Number(packageData.maxBatteryTubular || 0) > 0
  const resolvedBatteryType = rawBatteryType === 'lithium' || rawBatteryType === 'tubular'
    ? rawBatteryType
    : hasLithium && !hasTubular
      ? 'lithium'
      : hasTubular && !hasLithium
        ? 'tubular'
        : ''
  const evBatteryCapacity = Math.max(
    Number(packageData.maxBatteryLithium || 0),
    Number(packageData.maxBatteryTubular || 0)
  )
  const evBatteryLabel = evBatteryCapacity > 0 ? `${evBatteryCapacity}kWh` : 'Not specified'

  const getPackageStock = (pkg: Package) => {
    const rawStock = pkg?.quantity ?? pkg?.stock ?? pkg?.availableQuantity
    if (rawStock === undefined || rawStock === null || rawStock === '') {
      return { known: false, value: 0 }
    }
    const value = Number(rawStock)
    if (!Number.isFinite(value)) {
      return { known: false, value: 0 }
    }
    return { known: true, value: Math.max(0, value) }
  }

  const stock = getPackageStock(packageData)
  const isOutOfStock = stock.known && stock.value <= 0
  const wishlistKey = `package:${packageData.id}`
  const isWishlisted = wishlistIds.includes(wishlistKey)
  const evDescription = String(packageData.description || '').trim()
  const evFallbackDescription = 'No EV description provided for this deal yet.'

  const handleAddToCart = () => {
    if (!packageData?.id || isOutOfStock) return

    const cartProduct: CatalogProduct = {
      id: String(packageData.id),
      title: packageData.name || 'Flash Deal Package',
      price: Number(packageData.vendorPrice || 0),
      image: packageData.image || '',
      category: 'Flash Deal',
      stock: stock.known ? stock.value : 1,
      description: packageData.description || '',
      storeId: packageData.store?.id ? String(packageData.store.id) : undefined,
      storeName: packageData.store?.name || packageData.storeName || undefined,
    }

    addToCart(cartProduct)
  }

  const handleWishlistToggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    try {
      if (isWishlisted) {
        await removeProductFromWishlist(wishlistKey)
      } else {
        await addProductToWishlist(wishlistKey, {
          productName: packageData.name || 'Flash Deal Package',
          productPrice: Number(packageData.vendorPrice || 0),
          productImage: packageData.image || '',
          productCategory: 'Flash Deal',
        })
      }
      setWishlistIds(getWishlistIds())
      window.dispatchEvent(new Event('wishlistUpdated'))
    } catch (wishlistError) {
      console.error('Failed to update wishlist on package details page:', wishlistError)
    }
  }

  return (
    <>
      <Head>
        <title>{packageData.name} - {isEvPackage ? 'EV Deal' : 'Solar Package'} - RenewableZmart</title>
        <meta
          name="description"
          content={
            isEvPackage
              ? `${packageData.name} - Electric vehicle deal`
              : `${packageData.name} - ${packageData.maxBatteryLithium}kWh Solar Package`
          }
        />
      </Head>
      <Header />

      <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Link href="/" className="hover:text-teal-600 font-semibold">Home</Link>
            <span>/</span>
            <Link href="/deals" className="hover:text-teal-600 font-semibold">Flash Deals</Link>
            <span>/</span>
            <span className="text-gray-900 font-bold">{packageData.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Images Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Main Image */}
                <div className="relative h-96 bg-gray-50 flex items-center justify-center overflow-hidden p-6">
                  {displayImages.length > 0 ? (
                    isVideoUrl(displayImages[selectedImageIndex]) ? (
                      <video
                        src={displayImages[selectedImageIndex]}
                        className="max-w-full max-h-full object-contain bg-gray-100"
                        autoPlay
                        muted
                        playsInline
                        controls={false}
                        loop
                        preload="auto"
                        onClick={(event) => openVideoFullscreen(event.currentTarget)}
                      >
                        <source src={displayImages[selectedImageIndex]} type={getVideoMimeType(displayImages[selectedImageIndex])} />
                      </video>
                    ) : (
                      <img
                        src={displayImages[selectedImageIndex]}
                        alt={packageData.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement
                          img.src = '🔥'
                        }}
                      />
                    )
                  ) : (
                    <div className="text-6xl">🔥</div>
                  )}
                  {displayImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {displayImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-3 h-3 rounded-full transition ${
                            index === selectedImageIndex ? 'bg-teal-600' : 'bg-gray-300'
                          }`}
                          aria-label={`View image ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {displayImages.length > 1 && (
                  <div className="p-4 bg-white border-t">
                    <p className="text-xs text-gray-600 font-semibold mb-2">More Images</p>
                    <div className="grid grid-cols-4 gap-2">
                      {displayImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`h-20 rounded-lg border-2 overflow-hidden transition ${
                            index === selectedImageIndex ? 'border-teal-600' : 'border-gray-200'
                          }`}
                        >
                          {isVideoUrl(img) ? (
                            <video
                              src={img}
                              className="w-full h-full object-cover bg-gray-100"
                              autoPlay
                              muted
                              playsInline
                              loop
                              controls={false}
                              preload="auto"
                              onClick={(event) => openVideoFullscreen(event.currentTarget)}
                            />
                          ) : (
                            <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                {/* Price */}
                <div className="mb-6">
                  <p className="text-gray-600 text-sm font-semibold mb-1">FLASH DEAL PRICE</p>
                  <p className="text-4xl font-bold text-red-600">{formatPrice(packageData.vendorPrice || 0)}</p>
                </div>

                {/* Store Info */}
                {packageData.store && (
                  <div className="mb-6 pb-6 border-b">
                    <p className="text-gray-600 text-sm font-semibold mb-2">SOLD BY</p>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{packageData.store.name}</h3>
                    <p className="text-sm text-gray-600">{packageData.store.city}, {packageData.store.country}</p>
                  </div>
                )}

                {/* Package Specs */}
                {!isEvPackage && (
                  <div className="space-y-3 mb-6 pb-6 border-b">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-700 font-semibold">Solar Panels:</span>
                      <span className="text-gray-900 font-bold text-right">{packageData.panelRange || 'Custom'}</span>
                    </div>
                    {resolvedBatteryType === 'lithium' ? (
                      <div className="flex justify-between items-start">
                        <span className="text-gray-700 font-semibold">Battery (Lithium):</span>
                        <span className="text-gray-900 font-bold">{packageData.maxBatteryLithium}kWh</span>
                      </div>
                    ) : resolvedBatteryType === 'tubular' ? (
                      <div className="flex justify-between items-start">
                        <span className="text-gray-700 font-semibold">Battery (Tubular):</span>
                        <span className="text-gray-900 font-bold">{packageData.maxBatteryTubular}kWh</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-700 font-semibold">Battery (Lithium):</span>
                          <span className="text-gray-900 font-bold">{packageData.maxBatteryLithium}kWh</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-700 font-semibold">Battery (Tubular):</span>
                          <span className="text-gray-900 font-bold">{packageData.maxBatteryTubular}kWh</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="text-gray-700 font-semibold">Inverter:</span>
                      <span className="text-gray-900 font-bold">
                        {packageData.inverterType === 'hybrid' ? '⚡ Hybrid (Smart)' : '⚙️ Standard'}
                      </span>
                    </div>
                  </div>
                )}

                {isEvPackage ? (
                  <div className="mb-6">
                    <p className="text-gray-700 font-semibold mb-2">Description</p>
                    <p className="text-sm text-gray-600">{evDescription || evFallbackDescription}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 pb-6 border-b">
                      <p className="text-gray-700 font-semibold mb-2">Powers Included</p>
                      <p className="text-sm text-gray-600">{packageData.powers}</p>
                    </div>
                    <div className="mb-6">
                      <p className="text-gray-700 font-semibold mb-2">Warranty Coverage</p>
                      <p className="text-sm text-gray-600">{packageData.warranty}</p>
                    </div>
                  </>
                )}

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`w-full py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                      isOutOfStock
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    aria-label={isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                  >
                    <span aria-hidden="true">🛒</span>
                    <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleWishlistToggle}
                    className={`w-full py-3 rounded-lg font-bold transition ${
                      isWishlisted ? 'bg-pink-100 text-pink-700 hover:bg-pink-200' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    {isWishlisted ? '❤️ Added to Wishlist' : '❤️ Add to Wishlist'}
                  </button>
                </div>

                {/* Back Button */}
                <Link href="/deals">
                  <button className="w-full mt-4 text-teal-600 py-2 rounded-lg font-semibold hover:bg-teal-50 transition">
                    ← Back to Flash Deals
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{isEvPackage ? 'EV Details' : 'Package Details'}</h2>
              <div className="space-y-4 text-gray-600">
                {isEvPackage ? (
                  <>
                    <p>{evDescription || evFallbackDescription}</p>
                  </>
                ) : (
                  <>
                    <p>
                      This comprehensive solar package is designed to provide reliable renewable energy for your home or business.
                      With high-efficiency panels and quality battery storage, enjoy uninterrupted power supply.
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">What's Included</h3>
                    <ul className="list-disc list-inside space-y-2">
                      <li>High-efficiency solar panels</li>
                      <li>Professional inverter system</li>
                      <li>Battery storage solution</li>
                      <li>Installation kit and accessories</li>
                      <li>Professional installation service</li>
                      <li>Warranty coverage as specified</li>
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Need Help?</h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={openLiveChatPopup}
                  className="w-full text-left px-4 py-3 rounded-lg bg-teal-50 text-teal-600 font-semibold hover:bg-teal-100 transition"
                >
                  💬 Chat with Us
                </button>
                <a
                  href={callSupportLink}
                  className="block w-full text-left px-4 py-3 rounded-lg bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100 transition"
                >
                  📞 Call Support
                </a>
                <a
                  href={emailSupportLink}
                  className="block w-full text-left px-4 py-3 rounded-lg bg-green-50 text-green-600 font-semibold hover:bg-green-100 transition"
                >
                  📧 Email Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}

