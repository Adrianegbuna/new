import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useRouter } from 'next/router'
import type { CatalogProduct } from '../types'
import { getFallbackImage, getImageUrl } from '@/lib/imageUtils'
import { getCleanS3Url } from '@/lib/previewUtils'

interface Store {
  id: string
  name: string
  slug: string
  description: string
  logo?: string
  logoUrl?: string
  logoKey?: string
  storeLogo?: string
  logo_key?: string
  banner?: string
  rating?: number
  totalProducts?: number
  city?: string
  country?: string
  isVerified?: boolean
  owner?: {
    id?: string
    firstName?: string
    lastName?: string
    email?: string
    isVerified?: boolean
  } | null
}

export default function Stores() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [flashDeals, setFlashDeals] = useState<any[]>([])
  const [resaleItems, setResaleItems] = useState<any[]>([])
  const [tradeInItems, setTradeInItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('Nigeria')
  const [selectedCity, setSelectedCity] = useState('Lagos')
  const [resetToAllView, setResetToAllView] = useState(false)
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest' | 'best-selling'>('featured')
  const productsGridRef = useRef<HTMLDivElement>(null)
  const [visibleProductCount, setVisibleProductCount] = useState(24)
  const storesPreviewCount = 10
  const querySearch = typeof router.query.q === 'string' ? router.query.q.trim() : ''
  const queryTokens = querySearch.toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean)
  const matchesQuery = (parts: Array<string | number | undefined | null>) => {
    if (queryTokens.length === 0) return true
    const haystack = parts.map((part) => String(part || '').toLowerCase()).join(' ')
    return queryTokens.every((token) => haystack.includes(token))
  }
  const shuffleList = <T,>(items: T[]) => {
    const array = [...items]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const isEvStore = (store: any) => {
    const categories = Array.isArray(store?.categories)
      ? store.categories
      : Array.isArray(store?.category)
        ? store.category
        : (store?.category ? [store.category] : [])
    const categoryNames = categories.map((c: any) => String(c?.name || c).toLowerCase())
    const accountType = String(store?.accountType || store?.storeType || store?.type || '').toLowerCase()
    return (
      categoryNames.includes('electric vehicles & parts') ||
      accountType === 'ev_vendor' ||
      accountType === 'ev'
    )
  }

  useEffect(() => {
    const syncLocation = () => {
      const forceAllMarketplace = typeof window !== 'undefined'
        ? sessionStorage.getItem('renewablezmart_force_all_marketplace') === '1'
        : false
      const navEntry = typeof window !== 'undefined'
        ? (window.performance.getEntriesByType('navigation')[0] as any)
        : null
      const isReload = navEntry?.type === 'reload'
      const shouldResetToAll = forceAllMarketplace || isReload

      setResetToAllView(shouldResetToAll)
      if (shouldResetToAll) {
        setSelectedCountry('')
        setSelectedCity('')
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('renewablezmart_force_all_marketplace')
        }
        return
      }

      const savedLocation = typeof window !== 'undefined' ? localStorage.getItem('renewablezmart_location') : null
      if (!savedLocation) return
      try {
        const { country, city } = JSON.parse(savedLocation)
        setSelectedCountry(String(country || 'Nigeria'))
        setSelectedCity(String(city || 'Lagos'))
      } catch (locationError) {
        setSelectedCountry('Nigeria')
        setSelectedCity('Lagos')
      }
    }
    syncLocation()
    window.addEventListener('locationChanged', syncLocation)

    const fetchStoresAndProducts = async () => {
      try {
        const apiBase = getApiBaseUrl()
        
        // Fetch stores
        const storesResponse = await fetch(`${apiBase}/stores`)
        if (storesResponse.ok) {
          const storesData = await storesResponse.json()
          const list = Array.isArray(storesData) ? storesData : (storesData?.data || [])
          const dealerStores = list.filter((store: any) => !isEvStore(store))
          setStores(shuffleList(dealerStores))
        } else {
          setStores([])
        }

        // Fetch all vendor products (without approval filter)
        const productsResponse = await fetch(`${apiBase}/products/all-vendor`)
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          setProducts(shuffleList(productsData))
        } else {
          setProducts([])
        }

        const [flashDealsResponse, resaleResponse, tradeInResponse] = await Promise.allSettled([
          fetch(`${apiBase}/packages?featured=true`),
          fetch(`${apiBase}/resales/approved?limit=100`),
          fetch(`${apiBase}/trade-ins/approved?limit=100`)
        ])

        if (flashDealsResponse.status === 'fulfilled' && flashDealsResponse.value.ok) {
          const flashData = await flashDealsResponse.value.json()
          const flashList = Array.isArray(flashData) ? flashData : (flashData?.data || [])
          const activeFlashDeals = flashList.filter((item: any) =>
            Number(item?.quantity ?? item?.stock ?? item?.availableQuantity ?? 0) > 0
          )
          setFlashDeals(shuffleList(activeFlashDeals))
        } else {
          setFlashDeals([])
        }

        if (resaleResponse.status === 'fulfilled' && resaleResponse.value.ok) {
          const resaleData = await resaleResponse.value.json()
          const resaleList = Array.isArray(resaleData) ? resaleData : (resaleData?.data || [])
          const activeResales = resaleList.filter((item: any) =>
            Number(item?.quantity ?? item?.stock ?? item?.availableQuantity ?? 0) > 0
          )
          setResaleItems(shuffleList(activeResales))
        } else {
          setResaleItems([])
        }

        if (tradeInResponse.status === 'fulfilled' && tradeInResponse.value.ok) {
          const tradeInData = await tradeInResponse.value.json()
          const tradeInList = Array.isArray(tradeInData) ? tradeInData : (tradeInData?.data || [])
          const activeTradeIns = tradeInList.filter((item: any) =>
            Number(item?.quantity ?? item?.stock ?? item?.availableQuantity ?? 0) > 0
          )
          setTradeInItems(shuffleList(activeTradeIns))
        } else {
          setTradeInItems([])
        }
      } catch (error) {
        // Error fetching data handled silently
        setStores([])
        setProducts([])
        setFlashDeals([])
        setResaleItems([])
        setTradeInItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchStoresAndProducts()
    return () => {
      window.removeEventListener('locationChanged', syncLocation)
    }
  }, [])

  useEffect(() => {
    if (!router.isReady || !resetToAllView) return
    const hasQuery = typeof router.query.q === 'string' && router.query.q.trim().length > 0
    if (hasQuery) {
      router.replace('/stores', undefined, { shallow: true })
    }
  }, [router.isReady, router.query.q, resetToAllView])
  
  useEffect(() => {
    setVisibleProductCount(24)
  }, [products.length, stores.length])

  const locationFilteredStores = stores.filter((store) => {
    if (resetToAllView) return true
    const storeCountry = String(store.country || '').toLowerCase().trim()
    const storeCity = String(store.city || '').toLowerCase().trim()
    const selectedCountryValue = String(selectedCountry || '').toLowerCase().trim()
    const selectedCityValue = String(selectedCity || '').toLowerCase().trim()
    const matchesCountry = !selectedCountryValue || !storeCountry || storeCountry === selectedCountryValue
    const matchesCity = !selectedCityValue || !storeCity || storeCity === selectedCityValue
    return matchesCountry && matchesCity
  })
  const filteredStores = locationFilteredStores.filter((store) =>
    matchesQuery([
      store.name,
      store.description,
      store.city,
      store.country,
      're store renewable energy store'
    ])
  )
  const visibleStores = filteredStores.slice(0, storesPreviewCount)

  const resolveStoreLogo = (store: Store) => {
    const raw = store.logoUrl || store.logo || store.storeLogo || store.logoKey || store.logo_key || ''
    if (!raw) return ''
    if (raw.startsWith('http')) {
      return raw.includes('X-Amz-') ? getCleanS3Url(raw) : raw
    }
    return raw
  }

  const resolveStoreSlug = (store: Store) =>
    String((store as any).slug || (store as any).storeSlug || (store as any).store_slug || store.id || '').trim()
  const isStoreVerificationBadgeVisible = (store: Store) => store?.owner?.isVerified === true
  const dealerStoreIdSet = new Set(stores.map((store) => String(store.id)))
  const dealerStoreSlugSet = new Set(
    stores.map((store) => resolveStoreSlug(store)).filter(Boolean)
  )
  const dealerProducts = products.filter((item: any) => {
    const storeId = String(item?.storeId || item?.store?.id || item?.store_id || '')
    const storeSlug = String(item?.storeSlug || item?.store?.slug || item?.store_slug || '').trim()
    const categoryValue = String(item?.category || item?.categoryName || item?.category_name || '').toLowerCase()
    if (categoryValue === 'electric vehicles & parts') return false
    if (dealerStoreIdSet.size || dealerStoreSlugSet.size) {
      if (storeId && dealerStoreIdSet.has(storeId)) return true
      if (storeSlug && dealerStoreSlugSet.has(storeSlug)) return true
      return false
    }
    return true
  })
  const getDateValue = (item: any) => {
    const raw = item?.createdAt || item?.updatedAt || item?.dateAdded || item?.created_at || item?.updated_at
    const parsed = raw ? Date.parse(raw) : NaN
    return Number.isFinite(parsed) ? parsed : 0
  }
  const getSalesValue = (item: any) =>
    Number(item?.sales ?? item?.sold ?? item?.orders ?? item?.purchaseCount ?? 0) || 0
  const activeLocationStores = resetToAllView ? stores : locationFilteredStores
  const locationStoreIdSet = new Set(activeLocationStores.map((store) => String(store.id)))
  const locationStoreSlugSet = new Set(activeLocationStores.map((store) => resolveStoreSlug(store)).filter(Boolean))
  const locationScopedDealerProducts = dealerProducts.filter((item: any) => {
    const storeId = String(item?.storeId || item?.store?.id || item?.store_id || '')
    const storeSlug = String(item?.storeSlug || item?.store?.slug || item?.store_slug || '').trim()
    const inLocation =
      (storeId && locationStoreIdSet.has(storeId)) ||
      (storeSlug && locationStoreSlugSet.has(storeSlug))
    if (!inLocation) return false
    return matchesQuery([
      item?.title,
      item?.name,
      item?.description,
      item?.category,
      item?.categoryName,
      item?.storeName,
      item?.city,
      item?.country,
      item?.price,
      `₦${Number(item?.price || 0).toLocaleString('en-NG')}`
    ])
  })
  const sortedProducts = (() => {
    const base = [...locationScopedDealerProducts].filter((item) => Number(item?.stock ?? 0) > 0)
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
  const matchedFlashDeals = flashDeals.filter((item: any) =>
    matchesQuery([
      item?.name,
      item?.description,
      item?.store?.name,
      item?.category,
      item?.city,
      item?.country,
      item?.vendorPrice,
      'flash deal deals package'
    ])
  )
  const matchedResaleItems = resaleItems.filter((item: any) =>
    matchesQuery([
      item?.productName,
      item?.description,
      item?.condition,
      item?.location,
      item?.city,
      item?.country,
      item?.price,
      'swap resale'
    ])
  )
  const matchedTradeInItems = tradeInItems.filter((item: any) =>
    matchesQuery([
      item?.productName,
      item?.description,
      item?.condition,
      item?.location,
      item?.city,
      item?.country,
      item?.estimatedValue,
      'swap trade in trade-in'
    ])
  )

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
      <Head>
        <title>Authorized R E Stores - RenewableZmart</title>
        <meta name="description" content="Browse trusted authorized R E stores on RenewableZmart - Quality renewable energy products from verified sellers" />
      </Head>
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {querySearch ? (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm sm:text-base font-bold text-blue-950">Showing results for "{querySearch}"</p>
            </div>
          ) : null}
          {/* Store Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-900 dark:text-white font-bold">Loading stores...</div>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-900 dark:text-white font-bold">No stores available right now.</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Renewable Energy Stores</h2>
                {filteredStores.length > storesPreviewCount && (
                  <Link
                    href="/stores/all"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    See more →
                  </Link>
                )}
              </div>
              <div
                className="flex overflow-x-auto overflow-y-hidden quick-tabs-scroll scroll-smooth touch-pan-x snap-x snap-mandatory gap-3 sm:gap-4 pb-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {visibleStores.map((store) => {
                const storeSlug = resolveStoreSlug(store)
                return (
                  <Link href={storeSlug ? `/store/${encodeURIComponent(storeSlug)}` : '/stores'} key={store.id}>
                  <div className="group flex flex-col items-center text-center rounded-xl p-2 sm:p-3 hover:bg-white transition shrink-0 min-w-[96px] snap-start">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-600 shadow-sm">
                          <div className="w-full h-full rounded-full bg-white p-[2px]">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                              {resolveStoreLogo(store) ? (
                                <img
                                  src={getImageUrl(resolveStoreLogo(store))}
                                  alt={store.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = getFallbackImage((store.name || 'S').charAt(0).toUpperCase())
                                  }}
                                />
                              ) : (
                                <span className="text-lg font-bold text-emerald-700">
                                  {(store.name || 'S').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isStoreVerificationBadgeVisible(store) && (
                          <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center shadow">
                            <svg
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 10l4 4 8-8" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-xs sm:text-sm font-bold text-blue-950 group-hover:text-blue-950 transition line-clamp-1 w-full" style={{ color: '#172554', fontWeight: 700 }}>
                        {store.name}
                      </h3>
                  </div>
                </Link>
                )})}
              </div>
            </>
          )}

          {/* All Products from All Stores */}
          <div className="mt-12">
            <div className="flex items-center justify-end mb-6">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-green-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold text-sm"
              >
                <option value="featured">Sort by: Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="best-selling">Best Selling</option>
              </select>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-900 dark:text-white font-bold">Loading products...</div>
              </div>
            ) : locationScopedDealerProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-900 dark:text-white font-bold">No products available yet.</div>
              </div>
            ) : (
              <div ref={productsGridRef} className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch w-full">
                {sortedProducts.slice(0, visibleProductCount).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
            {sortedProducts.length > visibleProductCount && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={() => {
                    const nextCount = Math.min(visibleProductCount + 24, sortedProducts.length)
                    setVisibleProductCount(nextCount)
                    requestAnimationFrame(() => {
                      productsGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
                    })
                  }}
                  className="px-6 py-3 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  See more
                </button>
              </div>
            )}
            

          </div>

          {querySearch ? (
            <div className="mt-12 space-y-10">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Flash Deals</h2>
                  <Link href="/deals" className="text-sm font-semibold text-blue-900 hover:underline">See all</Link>
                </div>
                {matchedFlashDeals.length === 0 ? (
                  <div className="text-sm text-gray-600 font-semibold">No matching flash deals.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchedFlashDeals.slice(0, 6).map((deal: any) => (
                      <Link
                        key={String(deal?.id)}
                        href={`/package-details?id=${encodeURIComponent(String(deal?.id || ''))}`}
                        className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition"
                      >
                        <p className="font-bold text-blue-950 line-clamp-1">{deal?.name || 'Flash Deal'}</p>
                        <p className="text-sm font-semibold text-emerald-700 mt-1">
                          ₦{Number(deal?.vendorPrice || 0).toLocaleString('en-NG')}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{deal?.store?.name || 'Marketplace Store'}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Swap & Resale</h2>
                  <Link href="/swap-sell" className="text-sm font-semibold text-blue-900 hover:underline">See all</Link>
                </div>
                {matchedResaleItems.length === 0 && matchedTradeInItems.length === 0 ? (
                  <div className="text-sm text-gray-600 font-semibold">No matching trade-in or resale items.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchedResaleItems.slice(0, 3).map((item: any) => (
                      <Link
                        key={`resale-${String(item?.id)}`}
                        href={`/resale-details?id=${encodeURIComponent(String(item?.id || ''))}`}
                        className="rounded-xl border border-emerald-200 bg-white p-4 hover:shadow-md transition"
                      >
                        <p className="font-bold text-blue-950 line-clamp-1">{item?.productName || 'Resale Item'}</p>
                        <p className="text-sm font-semibold text-emerald-700 mt-1">
                          ₦{Number(item?.price || 0).toLocaleString('en-NG')}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">Resale • {item?.condition || 'Good'}</p>
                      </Link>
                    ))}
                    {matchedTradeInItems.slice(0, 3).map((item: any) => (
                      <Link
                        key={`tradein-${String(item?.id)}`}
                        href={`/trade-in-details?id=${encodeURIComponent(String(item?.id || ''))}`}
                        className="rounded-xl border border-blue-200 bg-white p-4 hover:shadow-md transition"
                      >
                        <p className="font-bold text-blue-950 line-clamp-1">{item?.productName || 'Trade-In Item'}</p>
                        <p className="text-sm font-semibold text-blue-700 mt-1">
                          ₦{Number(item?.estimatedValue || 0).toLocaleString('en-NG')}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">Trade-In • {item?.condition || 'Good'}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </main>

      <Footer />    </div>
  )
}



