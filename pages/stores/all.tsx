import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useCurrency } from '@/context/CurrencyContext'
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

export default function AllStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('Nigeria')
  const [selectedCity, setSelectedCity] = useState('all')
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const isStoreVerificationBadgeVisible = (store: Store) => store?.owner?.isVerified === true
  const { formatPrice } = useCurrency()

  useEffect(() => {
    const savedLocation = typeof window !== 'undefined' ? localStorage.getItem('renewablezmart_location') : null
    if (savedLocation) {
      const { country } = JSON.parse(savedLocation)
      setSelectedCountry(country)
    }

    const fetchStores = async () => {
      try {
        const apiBase = getApiBaseUrl()
        const storesResponse = await fetch(`${apiBase}/stores`)
        if (storesResponse.ok) {
          const storesData = await storesResponse.json()
          setStores(storesData)
        } else {
          setStores([])
        }
      } catch (error) {
        setStores([])
      } finally {
        setLoading(false)
      }
    }
    fetchStores()
  }, [])

  const availableCities = stores
    .filter(store => !selectedCountry || store.country === selectedCountry)
    .map(store => store.city)
    .filter((city, index, self) => city && self.indexOf(city) === index)
    .sort()

  const filteredStores = stores.filter(store => {
    const matchesSearch = 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (store.description && store.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (store.city && store.city.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCountry = !selectedCountry || store.country === selectedCountry
    const matchesCity = selectedCity === 'all' || store.city === selectedCity
    return matchesSearch && matchesCountry && matchesCity
  })

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

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
      <Head>
        <title>All R E Stores - RenewableZmart</title>
        <meta name="description" content="Browse all authorized R E stores on RenewableZmart" />
      </Head>
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">🏪 All R E Stores</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90">Discover trusted sellers across RenewableZmart</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Search stores by name..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-green-600 text-sm sm:text-base font-bold text-gray-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 md:flex">
                <select 
                  className="px-3 sm:px-4 py-2 sm:py-3 border-2 border-emerald-600 rounded-lg focus:outline-none focus:border-emerald-700 bg-white dark:bg-gray-800 text-black dark:text-white font-bold text-sm sm:text-base"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="all">All Locations</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <Link href="/stores" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-center">
                  Back to stores
                </Link>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-900 dark:text-white font-bold">Loading stores...</div>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-900 dark:text-white font-bold">No stores found matching your search.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
              {filteredStores.map((store) => {
                const storeSlug = resolveStoreSlug(store)
                return (
                  <Link href={storeSlug ? `/store/${encodeURIComponent(storeSlug)}` : '/stores'} key={store.id}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden group">
                      <div className="h-12 bg-gradient-to-br from-emerald-500 to-teal-500 relative flex items-center justify-start pl-2">
                        <div 
                          className="w-10 h-10 rounded-full bg-white/90 ring-2 ring-white/60 shadow-md flex items-center justify-center overflow-hidden"
                          onClick={(e) => {
                            const logoToUse = resolveStoreLogo(store)
                            if (logoToUse) {
                              e.preventDefault()
                              e.stopPropagation()
                              setViewingImage(getImageUrl(logoToUse))
                            }
                          }}
                        >
                          {resolveStoreLogo(store) ? (
                            <img 
                              src={getImageUrl(resolveStoreLogo(store))} 
                              alt={store.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = getFallbackImage((store.name || 'S').charAt(0).toUpperCase())
                              }}
                            />
                          ) : (
                            <span className="text-sm font-bold text-emerald-700">
                              {(store.name || 'S').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-2 py-2">
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <h3 className="text-xs sm:text-sm font-bold text-blue-950 mb-0 group-hover:text-blue-950 transition line-clamp-1 flex-1" style={{ color: '#172554', fontWeight: 700 }}>
                            {store.name}
                          </h3>
                          {isStoreVerificationBadgeVisible(store) && (
                            <span className="text-lg flex-shrink-0" title="Verified Dealer">✅</span>
                          )}
                        </div>

                        <div className="text-[9px] sm:text-xs text-black dark:text-white font-semibold mb-0.5">
                          <div>📦 {store.totalProducts || 0}</div>
                          <div>📍 {store.city || store.country || 'Nigeria'}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-900 dark:hover:text-gray-100"
            >
              ? Close
            </button>
            <img 
              src={viewingImage} 
              alt="Store photo" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getFallbackImage('Store')
              }}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
