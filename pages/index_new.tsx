import Head from 'next/head'
import { useState, useEffect, MouseEvent, useRef } from 'react'
import Header from "@/components/layout/Header";
import ProductCard from '@/components/product/ProductCard'
import { productService } from '@/lib/services'
import { useCurrency } from '@/context/CurrencyContext'
import { useCart } from '@/context/CartContext'
import { getWishlistIds, toggleWishlistId } from '@/lib/wishlist'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import type { CatalogProduct } from '@/types'
import ComingSoonToast from '@/components/ui/ComingSoonToast'

export default function Home() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [flashDeals, setFlashDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { formatPrice } = useCurrency()
  const { addToCart } = useCart()
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest' | 'best-selling'>('featured')
  const [visibleCount, setVisibleCount] = useState(24)
  const gridRef = useRef<HTMLDivElement>(null)
  const [showComingSoon, setShowComingSoon] = useState(false)

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

  const handleWishlistClick = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault()
    event.stopPropagation()
    const next = toggleWishlistId(id)
    setWishlistIds(next)
  }

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getAll()
        setProducts(data as any)
        
        // Fetch flash deals from packages endpoint
        try {
          const flashDealsResponse = await apiClient.get('/packages?featured=true')
          const deals = Array.isArray(flashDealsResponse.data)
            ? flashDealsResponse.data
            : (flashDealsResponse.data?.data || [])
          // Only show flash deals that have stock available
          const inStockDeals = deals.filter((pkg: any) => {
            const qty = Number(pkg?.quantity ?? pkg?.stock ?? pkg?.availableQuantity ?? 0)
            return qty > 0
          })
          setFlashDeals(inStockDeals)
        } catch (error) {
          console.error('Failed to fetch flash deals:', error)
          setFlashDeals([])
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    setWishlistIds(getWishlistIds())
  }, [])
  
  useEffect(() => {
    setVisibleCount(24)
  }, [products.length, flashDeals.length])

  const handlePaySmallSmallClick = () => {
    setShowComingSoon(true)
  }

  const getDateValue = (item: any) => {
    const raw = item?.createdAt || item?.updatedAt || item?.dateAdded || item?.created_at || item?.updated_at
    const parsed = raw ? Date.parse(raw) : NaN
    return Number.isFinite(parsed) ? parsed : 0
  }
  const getSalesValue = (item: any) =>
    Number(item?.sales ?? item?.sold ?? item?.orders ?? item?.purchaseCount ?? 0) || 0
  const list = (() => {
    const base = products.filter((item) => Number(item?.stock ?? 0) > 0)
    if (sortBy === 'price-low') {
      base.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    } else if (sortBy === 'price-high') {
      base.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    } else if (sortBy === 'newest') {
      base.sort((a, b) => getDateValue(b) - getDateValue(a))
    } else if (sortBy === 'best-selling') {
      base.sort((a, b) => getSalesValue(b) - getSalesValue(a))
    }
    return base
  })()
  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>RenewableZmart - Sustainable Energy Products</title>
        <meta name="description" content="Shop quality solar panels, batteries, inverters & accessories across Africa" />
      </Head>
      <Header />

      <main>
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-4">Power Your Future with Renewable Energy</h1>
              <p className="text-xl mb-8 text-white font-semibold">Quality solar panels, inverters, batteries & accessories delivered across Africa</p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/calculator" className="bg-white text-green-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg">Load Calculator</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-6">
            {/* Left Sidebar - Categories */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
                <h3 className="font-bold text-xl mb-4 text-gray-900 border-b pb-3">Categories</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/category/solar" className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 rounded-lg transition group">
                        <span className="text-2xl group-hover:scale-110 transition">☀</span>
                    </Link>
                  </li>
                  <li>
                      <Link href="/category/inverters" className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition group">
                        <span className="text-2xl group-hover:scale-110 transition">🔌</span>
                      </Link>
                  </li>
                  <li>
                    <Link href="/category/batteries" className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-lg transition group">
                        <span className="text-2xl group-hover:scale-110 transition">🔋</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/category/solarlights" className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 rounded-lg transition group">
                        <span className="text-2xl group-hover:scale-110 transition">💡</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/category/accessories" className="flex items-center gap-3 p-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 rounded-lg transition group">
                        <span className="text-2xl group-hover:scale-110 transition">🧰</span>
                    </Link>
                  </li>
                </ul>

                {/* Price Filters */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-bold text-sm mb-3 text-gray-900">Price Range</h4>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-green-600">
                      <input type="checkbox" className="rounded text-green-600" />
                      <span>{formatPrice(550000)} - {formatPrice(1000000)}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-green-600">
                      <input type="checkbox" className="rounded text-green-600" />
                      <span>{formatPrice(1000000)} - {formatPrice(2000000)}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-green-600">
                      <input type="checkbox" className="rounded text-green-600" />
                      <span>Above {formatPrice(2000000)}</span>
                    </label>
                  </div>
                </div>

                {/* Special Offers */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-bold text-sm mb-3 text-gray-900">Special Offers</h4>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-green-600">
                      <input type="checkbox" className="rounded text-green-600" />
                        <span>On Sale</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-green-600">
                      <input type="checkbox" className="rounded text-green-600" />
                        <span>In Stock</span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1">
            {/* Flash Deals Section - ENABLED */}
              {true && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-3xl">⚡</span>
                    Flash Deals
                    <span className="text-sm font-normal text-red-600 bg-red-50 px-3 py-1 rounded-full ml-2">Limited Time!</span>
                  </h2>
                  <Link href="/deals" className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-1">
                    See All <span>›</span>
                  </Link>
                </div>
                {loading ? (
                  <div className="text-center py-12 text-black">Loading deals...</div>
                ) : flashDeals.length > 0 ? (
                  <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                    {flashDeals.slice(0, 4).map((pkg) => {
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
                      <div key={pkg.id} className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-red-200 hover:border-red-400 flex flex-col h-full group">
                        <div className="relative h-56 bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center overflow-hidden p-4 group-hover:from-red-150 group-hover:to-orange-150">
                          {pkg.image ? (
                            <img src={pkg.image} alt={pkg.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-300" />
                            ) : (
                              <span className="text-7xl group-hover:scale-110 transition duration-300">⚡</span>
                            )}
                          <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">FLASH DEAL</div>
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-bold text-base text-gray-900 line-clamp-2 mb-3 leading-snug">{pkg.name}</h3>
                          {(() => {
                            const stock = getPackageStock(pkg)
                            const isOutOfStock = stock.known && stock.value <= 0
                            return (
                              <div className="flex items-center justify-between mb-4">
                            <p className="text-2xl font-bold text-red-600">{formatPrice(pkg.vendorPrice || 0)}</p>
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
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                            <span className="line-clamp-1">No comments yet</span>
                            <button
                              type="button"
                              aria-label="Add to wishlist"
                              onClick={(event) => handleWishlistClick(event, wishlistKey)}
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
                          <button 
                            onClick={(e) => {
                              e.preventDefault()
                              window.location.href = `/package-details?id=${pkg.id}`
                            }}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg transition font-bold text-base shadow-md hover:shadow-lg mt-auto"
                          >
                            View Deal
                          </button>
                          <div className="mt-3 flex justify-end">
                            <Link href={storeHref} className="text-xs font-bold text-blue-950 hover:text-blue-950" style={{ color: '#172554', fontWeight: 700 }}>
                              Visit Store
                            </Link>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">No flash deals available right now</div>
                )}
                </div>
              )}

              {/* Pay Small Small Banner */}
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Pay Small Small</h2>
                  </div>
                  <p className="text-center text-white/95 text-lg mb-6">Flexible payment plans - Own your equipment today!</p>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
                    <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 border-2 border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">3 MONTHS</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatPrice(450000)} - {formatPrice(1000000)}</p>
                    </div>
                    
                    <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">6 MONTHS</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">Other amounts</p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-white/20 rounded-lg px-4 py-2 inline-block mb-4">
                      <span className="text-sm text-white font-semibold">0% Interest • No Hidden Charges • Secure</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handlePaySmallSmallClick}
                        className="inline-block bg-white text-indigo-600 font-bold px-8 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition transform hover:scale-105"
                      >
                        Shop Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Products Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">All Products</h2>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-green-600 bg-white dark:bg-gray-800 text-black dark:text-white text-sm border-black dark:border-gray-600 font-semibold"
                  >
                    <option value="featured">Sort by: Featured</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                    <option value="best-selling">Best Selling</option>
                  </select>
                </div>
                {loading ? (
                  <div className="text-center py-12 text-black">Loading products...</div>
                ) : (
                  <div ref={gridRef} className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                    {list.slice(0, visibleCount).map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
                {list.length > visibleCount && (
                  <div className="flex justify-center mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        const nextCount = Math.min(visibleCount + 24, list.length)
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
            </div>
          </div>
        </div>
      </main>

      <ComingSoonToast visible={showComingSoon} onClose={() => setShowComingSoon(false)} />
    </div>
  )
}



