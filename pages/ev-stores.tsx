import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/product/ProductCard'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import type { CatalogProduct } from '@/types'
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

const evCategoryName = 'Electric Vehicles & Parts'

export default function EvStores() {
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('Nigeria')
  const [selectedCity, setSelectedCity] = useState('Lagos')
  const [resetToAllView, setResetToAllView] = useState(false)
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest' | 'best-selling'>('featured')
  const productsGridRef = useRef<HTMLDivElement>(null)
  const [visibleProductCount, setVisibleProductCount] = useState(24)
  const storesPreviewCount = 10

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
      categoryNames.includes(evCategoryName.toLowerCase()) ||
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
        const storesResponse = await fetch(`${apiBase}/stores`)
        if (storesResponse.ok) {
          const storesData = await storesResponse.json()
          const list = Array.isArray(storesData) ? storesData : (storesData?.data || [])
          const evStores = list.filter((store: any) => isEvStore(store))
          setStores(shuffleList(evStores))
        } else {
          setStores([])
        }

        const productsResponse = await fetch(`${apiBase}/products/all-vendor`)
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          setProducts(shuffleList(Array.isArray(productsData) ? productsData : (productsData?.data || [])))
        } else {
          setProducts([])
        }
      } catch (error) {
        setStores([])
        setProducts([])
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
    setVisibleProductCount(24)
  }, [products.length])

  const filteredStores = stores.filter((store) => {
    if (resetToAllView) return true
    const storeCountry = String(store.country || '').toLowerCase().trim()
    const storeCity = String(store.city || '').toLowerCase().trim()
    const selectedCountryValue = String(selectedCountry || '').toLowerCase().trim()
    const selectedCityValue = String(selectedCity || '').toLowerCase().trim()
    const matchesCountry = !selectedCountryValue || !storeCountry || storeCountry === selectedCountryValue
    const matchesCity = !selectedCityValue || !storeCity || storeCity === selectedCityValue
    return matchesCountry && matchesCity
  })
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

  const storeIdSet = new Set(stores.map((store) => String(store.id)))
  const storeSlugSet = new Set(stores.map((store) => resolveStoreSlug(store)).filter(Boolean))
  const scopedProducts = products.filter((item: any) => {
    const storeId = String(item?.storeId || item?.store?.id || '')
    const storeSlug = String(item?.storeSlug || item?.store?.slug || item?.store_slug || '').trim()
    const categoryValue = String(item?.category || item?.categoryName || item?.category_name || '').trim()
    return (
      (storeId && storeIdSet.has(storeId)) ||
      (storeSlug && storeSlugSet.has(storeSlug)) ||
      categoryValue.toLowerCase() === evCategoryName.toLowerCase()
    )
  })

  const getDateValue = (item: any) => {
    const raw = item?.createdAt || item?.updatedAt || item?.dateAdded || item?.created_at || item?.updated_at
    const parsed = raw ? Date.parse(raw) : NaN
    return Number.isFinite(parsed) ? parsed : 0
  }
  const getSalesValue = (item: any) =>
    Number(item?.sales ?? item?.sold ?? item?.orders ?? item?.purchaseCount ?? 0) || 0
  const activeLocationStores = resetToAllView ? stores : filteredStores
  const filteredStoreIdSet = new Set(activeLocationStores.map((store) => String(store.id)))
  const filteredStoreSlugSet = new Set(activeLocationStores.map((store) => resolveStoreSlug(store)).filter(Boolean))
  const locationScopedProducts = scopedProducts.filter((item: any) => {
    const storeId = String(item?.storeId || item?.store?.id || '')
    const storeSlug = String(item?.storeSlug || item?.store?.slug || item?.store_slug || '').trim()
    const categoryValue = String(item?.category || item?.categoryName || item?.category_name || '').trim().toLowerCase()
    if (categoryValue === evCategoryName.toLowerCase()) {
      return true
    }
    return (
      (storeId && filteredStoreIdSet.has(storeId)) ||
      (storeSlug && filteredStoreSlugSet.has(storeSlug))
    )
  })
  const sortedProducts = (() => {
    const base = [...locationScopedProducts].filter((item) => Number(item?.stock ?? 0) > 0)
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
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
      <Head>
        <title>Authorized E V Stores - RenewableZmart</title>
        <meta name="description" content="Browse verified electric vehicle and parts stores on RenewableZmart" />
      </Head>
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-700 font-semibold">Loading E V stores...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-900 dark:text-white font-bold">No E V stores available right now.</div>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Electric Vehicle Stores</h2>
              <div
                className="flex overflow-x-auto overflow-y-hidden quick-tabs-scroll scroll-smooth touch-pan-x snap-x snap-mandatory gap-3 sm:gap-4 mb-10 pb-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {visibleStores.map((store) => {
                  const logoSrc = resolveStoreLogo(store)
                  const slug = resolveStoreSlug(store)
                  return (
                    <Link href={slug ? `/store/${encodeURIComponent(slug)}` : '/ev-stores'} key={store.id}>
                      <div className="group flex flex-col items-center text-center rounded-xl p-2 sm:p-3 hover:bg-white transition shrink-0 min-w-[96px] snap-start">
                        <div className="relative">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-600 shadow-sm">
                            <div className="w-full h-full rounded-full bg-white p-[2px]">
                              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                {logoSrc ? (
                                  <img
                                    src={getImageUrl(logoSrc)}
                                    alt={store.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = getFallbackImage((store.name || 'S').charAt(0).toUpperCase())
                                    }}
                                  />
                                ) : (
                                  <span className="text-lg font-bold text-emerald-700">{(store.name || 'S').charAt(0).toUpperCase()}</span>
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
                  )
                })}
              </div>

              <div className="flex items-center justify-between mb-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="best-selling">Best Selling</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              <div ref={productsGridRef} className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch w-full">
                {sortedProducts.slice(0, visibleProductCount).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
