import Head from 'next/head'
import { useState, useEffect, MouseEvent, useRef } from 'react'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import Link from 'next/link'
import type { CatalogProduct } from '../types'
import { productService } from '@/lib/services'
import { apiClient } from '@/lib/api-client'
import { useCurrency } from '../context/CurrencyContext'
import { useAuthStore } from '@/store/authStore'
import { useCart } from '../context/CartContext'
import { getWishlistIds } from '../lib/wishlist'
import { addProductToWishlist, ensureWishlistSync, removeProductFromWishlist } from '@/lib/wishlist-api'
import { getVideoMimeType, isVideoUrl } from '@/lib/imageUtils'
import { openVideoFullscreen } from '@/lib/videoFullscreen'

export default function DealsPage() {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { user } = useAuthStore()
  const { addToCart } = useCart()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const gridRef = useRef<HTMLDivElement>(null)
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(24)
  const shuffleList = <T,>(items: T[]) => {
    const array = [...items]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const getRatingData = (item: any) => {
    const ratingValue = Number(item?.rating ?? item?.averageRating ?? item?.avgRating ?? item?.storeRating ?? 0)
    const safeRating = Number.isFinite(ratingValue) ? Math.max(0, Math.min(5, ratingValue)) : 0
    const reviewsCount = Number(item?.reviewCount ?? item?.reviews?.length ?? item?.comments?.length ?? 0) || 0
    const latestComment =
      item?.latestComment ||
      item?.comments?.[0]?.comment ||
      item?.reviews?.[0]?.comment ||
      item?.reviews?.[0]?.review ||
      ''
    return { rating: safeRating, reviewsCount, latestComment: String(latestComment || '').trim() }
  }

  const renderStars = (rating: number) => {
    const filled = Math.round(rating)
    return Array.from({ length: 5 }).map((_, idx) => (
      <span key={idx} className={idx < filled ? 'text-amber-500' : 'text-gray-300'}>
        ★
      </span>
    ))
  }

  const getPackageStock = (pkg: any) => {
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

  const handleAddPackageToCart = (event: MouseEvent<HTMLButtonElement>, pkg: any) => {
    event.preventDefault()
    event.stopPropagation()
    if (!pkg?.id) return

    const stock = getPackageStock(pkg)
    if (stock.known && stock.value <= 0) return

    const cartProduct: CatalogProduct = {
      id: String(pkg.id),
      title: pkg.name || 'Flash Deal Package',
      price: Number(pkg.vendorPrice || 0),
      image: pkg.image || '',
      category: 'Flash Deal',
      stock: stock.known ? stock.value : 1,
      description: pkg.description || '',
      storeId: pkg.storeId ? String(pkg.storeId) : undefined,
      storeName: pkg.store?.name || pkg.storeName,
    }

    addToCart(cartProduct)
  }

  const handleWishlistClick = async (
    event: MouseEvent<HTMLButtonElement>,
    id: string,
    metadata?: { productName?: string; productPrice?: number; productImage?: string; productCategory?: string }
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    try {
      const current = getWishlistIds()
      const isWishlisted = current.includes(id)
      if (isWishlisted) {
        await removeProductFromWishlist(id)
      } else {
        await addProductToWishlist(id, metadata as any)
      }
      setWishlistIds(getWishlistIds())
      window.dispatchEvent(new Event('wishlistUpdated'))
    } catch (error) {
      console.error('Failed to update wishlist on deals page:', error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products with discounts
        const productData = await productService.getAll()
        setProducts(shuffleList(productData as any))
        console.log('[DEALS PAGE] Fetched regular products:', productData.length);
        
        // Fetch featured flash deals (only packages posted with actual vendorPrice)
        try {
          console.log('[DEALS PAGE] Fetching flash deals from /packages?featured=true');
          const packageResponse = await apiClient.get('/packages?featured=true')
          console.log('[DEALS PAGE] Flash deals response status:', packageResponse.status);
          console.log('[DEALS PAGE] Flash deals response data:', packageResponse.data);
          
          const packageData = Array.isArray(packageResponse.data)
            ? packageResponse.data
            : (packageResponse.data?.data || [])

          // Only show flash deals that have stock available
          const inStockPackages = packageData.filter((pkg: any) => {
            const qty = Number(pkg?.quantity ?? pkg?.stock ?? pkg?.availableQuantity ?? 0)
            return qty > 0
          })

          console.log('[DEALS PAGE] Parsed flash deals count:', packageData.length, '| In stock:', inStockPackages.length);
          console.log('[DEALS PAGE] Fetched flash deals:', inStockPackages);
          setPackages(shuffleList(inStockPackages))
        } catch (error: any) {
          console.error('[DEALS PAGE] Failed to fetch flash deals:', error);
          console.error('[DEALS PAGE] Error response:', error.response?.data);
          setPackages([])
        }


      } catch (error) {
        console.error('[DEALS PAGE] Failed to fetch products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const initWishlist = async () => {
      if (!user) {
        setWishlistIds(getWishlistIds())
        return
      }
      try {
        await ensureWishlistSync()
      } catch (error) {
        console.error('Failed to sync wishlist on deals page:', error)
      } finally {
        setWishlistIds(getWishlistIds())
      }
    }
    initWishlist()
  }, [user])
  
  useEffect(() => {
    setVisibleCount(24)
  }, [products.length, packages.length])

  const dealsProducts = products.filter((p) => {
    const stock = Number(p.stock ?? 0)
    return (p.originalPrice && p.originalPrice > p.price) && stock > 0
  })
  const hasDeals = dealsProducts.length > 0 || packages.length > 0
  const totalItems = dealsProducts.length + packages.length
  const visibleProducts = dealsProducts.slice(0, visibleCount)
  const remainingSlots = Math.max(visibleCount - visibleProducts.length, 0)
  const visiblePackages = packages.slice(0, remainingSlots)

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>Flash Deals - RenewableZmart</title>
        <meta name="description" content="Limited time deals on renewable energy products" />
      </Head>
      <Header />

      <main>
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-900 font-bold">
              <Link href="/" className="hover:text-orange-500 font-bold">Home</Link>
              <span>›</span>
              <span className="text-gray-900 font-bold">Flash Deals</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
                <select className="px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-600 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 text-gray-900 font-semibold">
                  <option className="text-gray-900 font-bold">Sort by: Best Discount</option>
                  <option className="text-gray-900 font-bold">Price: Low to High</option>
                  <option className="text-gray-900 font-bold">Price: High to Low</option>
                </select>
              </div>

          {/* Debug: Show loading and package count */}
          {loading && <div className="text-center text-gray-700 font-bold mb-4">Loading deals...</div>}
          {!loading && !hasDeals && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-center">
              <p className="text-yellow-800 font-semibold">No deals at the moment. Check back soon!</p>
            </div>
          )}
          <div ref={gridRef} className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
            {/* Products */}
            {visibleProducts.map((p) => (
              <ProductCard key={`product-${p.id}`} product={p} showDescription />
            ))}
            
            {/* Solar Packages */}
            {visiblePackages.map((pkg) => {
              const storeSlug = String(
                pkg?.store?.slug ||
                pkg?.storeSlug ||
                pkg?.store?.storeSlug ||
                pkg?.store?.store_slug ||
                ''
              ).trim()
              const storeRef = storeSlug || String(pkg?.storeId || '').trim()
              const storeHref = storeRef ? `/store/${encodeURIComponent(storeRef)}` : '/stores'
              const wishlistKey = `package:${pkg.id}`
              const isWishlisted = wishlistIds.includes(wishlistKey)

              return (
                <div
                  key={`package-${pkg.id}`}
                  className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-red-400 flex flex-col h-full group cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/package-details?id=${pkg.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/package-details?id=${pkg.id}`);
                    }
                  }}
                >
                  {/* Image Section */}
                  <div className="relative bg-[#f8f8f8] aspect-square p-4 flex items-center justify-center overflow-hidden">
                    {pkg.image ? (
                      isVideoUrl(pkg.image) ? (
                        <video
                          src={pkg.image}
                          className="max-w-full max-h-full object-contain bg-gray-100"
                          autoPlay
                          muted
                          playsInline
                          controls={false}
                          loop
                          preload="auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            openVideoFullscreen(event.currentTarget)
                          }}
                          onTouchStart={(event) => event.stopPropagation()}
                        >
                          <source src={pkg.image} type={getVideoMimeType(pkg.image)} />
                        </video>
                      ) : (
                        <img src={pkg.image} alt={pkg.name} className="max-w-full max-h-full object-contain" />
                      )
                    ) : (
                      <span className="text-7xl group-hover:scale-110 transition duration-300">⚡</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-[15px] font-semibold leading-[1.4] text-gray-900 line-clamp-2 mb-2">{pkg.name}</h3>

                    {(() => {
                      const ratingData = getRatingData(pkg)
                      return (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-[13px] font-medium">
                            <div className="flex">{renderStars(ratingData.rating)}</div>
                            <span className="text-gray-700">{ratingData.rating.toFixed(1)}</span>
                            <span className="text-gray-500">({ratingData.reviewsCount} reviews)</span>
                          </div>
                        {ratingData.latestComment ? (
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-500 line-clamp-1">"{ratingData.latestComment}"</p>
                            <button
                              type="button"
                              aria-label="Add to wishlist"
                              onClick={(event) =>
                                handleWishlistClick(event, wishlistKey, {
                                  productName: pkg?.name || 'Flash Deal Package',
                                  productPrice: Number(pkg?.vendorPrice || 0),
                                  productImage: String(pkg?.image || '').trim(),
                                  productCategory: 'Flash Deal',
                                })
                              }
                              className={`shrink-0 transition ${
                                isWishlisted ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
                              }`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4 sm:h-5 sm:w-5"
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
                        ) : (
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-xs text-gray-400">No comments yet</p>
                            <button
                              type="button"
                              aria-label="Add to wishlist"
                              onClick={(event) =>
                                handleWishlistClick(event, wishlistKey, {
                                  productName: pkg?.name || 'Flash Deal Package',
                                  productPrice: Number(pkg?.vendorPrice || 0),
                                  productImage: String(pkg?.image || '').trim(),
                                  productCategory: 'Flash Deal',
                                })
                              }
                              className={`shrink-0 transition ${
                                isWishlisted ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
                              }`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4 sm:h-5 sm:w-5"
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
                        )}
                        </div>
                      )
                    })()}
                    
                    {/* Price + Add to Cart */}
                    {(() => {
                      const stock = getPackageStock(pkg)
                      const isOutOfStock = stock.known && stock.value <= 0
                      return (
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[20px] font-bold text-red-600">{formatPrice(pkg.vendorPrice || 0)}</p>
                          <button
                            type="button"
                            aria-label={isOutOfStock ? 'Out of Stock' : 'Add to cart'}
                            onClick={(event) => handleAddPackageToCart(event, pkg)}
                            disabled={isOutOfStock}
                            className={`h-9 w-9 rounded-full border-2 flex items-center justify-center transition ${
                              isOutOfStock
                                ? 'border-gray-300 text-gray-300 cursor-not-allowed'
                                : 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="9" cy="20" r="1" />
                              <circle cx="18" cy="20" r="1" />
                              <path d="M3 4h2l2 10h11l2-7H6" />
                              <path d="M12 8v6" />
                              <path d="M9 11h6" />
                            </svg>
                          </button>
                        </div>
                      )
                    })()}
                    {Number(pkg.quantity ?? pkg.stock ?? pkg.availableQuantity ?? 0) > 0 && (
                      <p className="text-xs text-gray-600 font-semibold mb-4">
                        Stock: {Number(pkg.quantity ?? pkg.stock ?? pkg.availableQuantity ?? 0)}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-end">
                      <Link
                        href={storeHref}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          router.push(storeHref)
                        }}
                        className="text-xs font-bold text-blue-950 hover:text-blue-950"
                        style={{ color: '#172554', fontWeight: 700 }}
                      >
                        Visit Store
                      </Link>
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
          {totalItems > visibleCount && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => {
                  const nextCount = Math.min(visibleCount + 24, totalItems)
                  setVisibleCount(nextCount)
                  requestAnimationFrame(() => {
                    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
                  })
                }}
                className="px-6 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
              >
                See more
              </button>
            </div>
          )}

          
        </div>
      </main>

      <Footer />
    </div>
  )
}

