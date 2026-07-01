import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer'
import { getApiBaseUrl } from '@/lib/apiConfig'

type ProductItem = {
  id: string | number
  name?: string
  title?: string
  description?: string
  category?: string
  categoryName?: string
  price?: number | string
  storeName?: string
  storeId?: string | number
  city?: string
  state?: string
  country?: string
}

type StoreItem = {
  id: string | number
  slug?: string
  storeSlug?: string
  store_slug?: string
  name?: string
  description?: string
  city?: string
  state?: string
  country?: string
  categories?: Array<string | { name?: string }>
  category?: Array<string | { name?: string }> | string
  accountType?: string
  storeType?: string
  type?: string
}

type InstallerItem = {
  id: string | number
  firstName?: string
  lastName?: string
  companyName?: string
  certifications?: string
  serviceAreas?: string
  city?: string
  state?: string
  country?: string
}

type PlatformLink = {
  title: string
  href: string
  description: string
  keywords: string[]
}

const EV_CATEGORY_NAME = 'electric vehicles & parts'

const PLATFORM_LINKS: PlatformLink[] = [
  { title: 'All Products', href: '/products', description: 'Browse all marketplace products', keywords: ['products', 'shop', 'marketplace', 'solar', 'battery', 'inverter'] },
  { title: 'R E Stores', href: '/stores', description: 'Explore renewable energy stores', keywords: ['re stores', 'r e stores', 'dealer stores', 'stores', 'renewable stores'] },
  { title: 'E V Stores', href: '/ev-stores', description: 'Find electric vehicle stores and parts', keywords: ['ev stores', 'e v stores', 'electric vehicle', 'mobility'] },
  { title: 'Installers', href: '/installers', description: 'Find verified installers by location', keywords: ['installer', 'installation', 'service', 'technician'] },
  { title: 'Services', href: '/services', description: 'Request renewable energy services', keywords: ['services', 'repairs', 'maintenance'] },
  { title: 'Swap & Sell', href: '/swap-sell', description: 'Trade-in and resale marketplace', keywords: ['swap', 'sell', 'trade in', 'resale'] },
  { title: 'Flash Deals', href: '/deals', description: 'See active marketplace deals', keywords: ['deals', 'discount', 'offer', 'flash deal'] }
]

const toText = (value: unknown): string => String(value ?? '').trim().toLowerCase()

const getTokens = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)

const matchesAllTokens = (haystack: string, tokens: string[]): boolean =>
  tokens.every((token) => haystack.includes(token))

const formatAmountTokens = (amount: number): string[] => {
  const fixed = Number.isFinite(amount) ? amount : 0
  const formatted = new Intl.NumberFormat('en-NG').format(fixed)
  return [
    String(fixed),
    fixed.toFixed(2),
    formatted,
    `₦${formatted}`,
    `ngn ${formatted}`,
    `naira ${formatted}`
  ]
}

const isEvStore = (store: StoreItem): boolean => {
  const categories = Array.isArray(store?.categories)
    ? store.categories
    : Array.isArray(store?.category)
      ? store.category
      : (store?.category ? [store.category] : [])
  const categoryNames = categories.map((item) => toText(typeof item === 'object' ? item?.name : item))
  const accountType = toText(store?.accountType || store?.storeType || store?.type)
  return categoryNames.includes(EV_CATEGORY_NAME) || accountType === 'ev_vendor' || accountType === 'ev'
}

const resolveStoreSlug = (store: StoreItem): string =>
  String(store?.slug || store?.storeSlug || store?.store_slug || store?.id || '').trim()

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<ProductItem[]>([])
  const [stores, setStores] = useState<StoreItem[]>([])
  const [installers, setInstallers] = useState<InstallerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    const q = typeof router.query.q === 'string' ? router.query.q : ''
    setQuery(q)
  }, [router.isReady, router.query.q])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError('')
      try {
        const apiBase = getApiBaseUrl()
        const [productsRes, storesRes, installersRes] = await Promise.all([
          fetch(`${apiBase}/products/all-vendor`, { cache: 'no-store' }),
          fetch(`${apiBase}/stores`, { cache: 'no-store' }),
          fetch(`${apiBase}/installers`, { cache: 'no-store' })
        ])

        const productsData = productsRes.ok ? await productsRes.json() : []
        const storesData = storesRes.ok ? await storesRes.json() : []
        const installersData = installersRes.ok ? await installersRes.json() : []

        setProducts(Array.isArray(productsData) ? productsData : (productsData?.data || []))
        setStores(Array.isArray(storesData) ? storesData : (storesData?.data || []))
        setInstallers(Array.isArray(installersData) ? installersData : (installersData?.data || []))
      } catch (fetchError) {
        setError('Unable to load search data right now.')
        setProducts([])
        setStores([])
        setInstallers([])
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const tokens = useMemo(() => getTokens(query), [query])
  const hasQuery = tokens.length > 0

  const filteredProducts = useMemo(() => {
    if (!hasQuery) return products.slice(0, 24)
    return products.filter((product) => {
      const amount = Number(product?.price || 0)
      const amountTokens = formatAmountTokens(amount).join(' ')
      const searchable = [
        toText(product?.name || product?.title),
        toText(product?.description),
        toText(product?.category || product?.categoryName),
        toText(product?.storeName),
        toText(product?.city),
        toText(product?.state),
        toText(product?.country),
        amountTokens
      ].join(' ')
      return matchesAllTokens(searchable, tokens)
    }).slice(0, 48)
  }, [products, tokens, hasQuery])

  const filteredStores = useMemo(() => {
    if (!hasQuery) return stores.slice(0, 24)
    return stores.filter((store) => {
      const categoryTokens = Array.isArray(store?.categories)
        ? store.categories.map((item) => toText(typeof item === 'object' ? item?.name : item)).join(' ')
        : ''
      const searchable = [
        toText(store?.name),
        toText(store?.description),
        toText(store?.city),
        toText(store?.state),
        toText(store?.country),
        toText(store?.accountType || store?.storeType || store?.type),
        categoryTokens,
        isEvStore(store) ? 'ev store e v store electric vehicle' : 're store r e store renewable store'
      ].join(' ')
      return matchesAllTokens(searchable, tokens)
    }).slice(0, 48)
  }, [stores, tokens, hasQuery])

  const filteredInstallers = useMemo(() => {
    if (!hasQuery) return installers.slice(0, 24)
    return installers.filter((installer) => {
      const searchable = [
        toText(installer?.firstName),
        toText(installer?.lastName),
        toText(installer?.companyName),
        toText(installer?.certifications),
        toText(installer?.serviceAreas),
        toText(installer?.city),
        toText(installer?.state),
        toText(installer?.country),
        'installer'
      ].join(' ')
      return matchesAllTokens(searchable, tokens)
    }).slice(0, 48)
  }, [installers, tokens, hasQuery])

  const filteredPlatformLinks = useMemo(() => {
    if (!hasQuery) return PLATFORM_LINKS
    return PLATFORM_LINKS.filter((link) => {
      const searchable = [toText(link.title), toText(link.description), link.keywords.map(toText).join(' ')].join(' ')
      return matchesAllTokens(searchable, tokens)
    })
  }, [tokens, hasQuery])

  const totalResults = filteredProducts.length + filteredStores.length + filteredInstallers.length + filteredPlatformLinks.length

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    router.push({
      pathname: '/search',
      query: query.trim() ? { q: query.trim() } : {}
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>{query ? `${query} - Search` : 'Search'} - RenewableZmart</title>
        <meta name="description" content="Search products, prices, locations, stores and installers on RenewableZmart" />
      </Head>

      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <form onSubmit={submitSearch} className="flex gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, amount, location, stores, installers..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-900 text-white px-5 py-3 font-semibold hover:bg-blue-950 transition"
            >
              Search
            </button>
          </form>
          <p className="mt-3 text-sm text-gray-600">
            {hasQuery ? `Showing results for "${query}"` : 'Showing platform-wide results. Add a keyword to narrow down.'}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-800 font-semibold">Loading search results...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 font-semibold">{error}</div>
        ) : (
          <>
            <div className="mb-6 text-gray-800 font-semibold">Total results: {totalResults}</div>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-blue-950 mb-3">Products</h2>
              {filteredProducts.length === 0 ? (
                <p className="text-gray-600">No matching products.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map((product) => {
                    const name = String(product?.name || product?.title || 'Product')
                    const price = Number(product?.price || 0)
                    return (
                      <Link
                        key={String(product.id)}
                        href={`/product/${encodeURIComponent(String(product.id))}`}
                        className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition"
                      >
                        <p className="font-bold text-blue-950 line-clamp-2">{name}</p>
                        <p className="text-sm text-gray-700 mt-1">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price)}</p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{product?.storeName || 'Marketplace Store'}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {[product?.city, product?.state, product?.country].filter(Boolean).join(', ') || 'Location not specified'}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-blue-950 mb-3">Stores (R E and E V)</h2>
              {filteredStores.length === 0 ? (
                <p className="text-gray-600">No matching stores.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredStores.map((store) => {
                    const slug = resolveStoreSlug(store)
                    const typeLabel = isEvStore(store) ? 'E V Store' : 'R E Store'
                    return (
                      <Link
                        key={String(store.id)}
                        href={slug ? `/store/${encodeURIComponent(slug)}` : '/stores'}
                        className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition"
                      >
                        <p className="font-bold text-blue-950 line-clamp-2">{store?.name || 'Store'}</p>
                        <p className="text-sm text-gray-700 mt-1">{typeLabel}</p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{store?.description || 'Verified marketplace store'}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {[store?.city, store?.state, store?.country].filter(Boolean).join(', ') || 'Location not specified'}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-blue-950 mb-3">Installers</h2>
              {filteredInstallers.length === 0 ? (
                <p className="text-gray-600">No matching installers.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredInstallers.map((installer) => {
                    const fullName = [installer?.firstName, installer?.lastName].filter(Boolean).join(' ').trim() || 'Installer'
                    return (
                      <Link
                        key={String(installer.id)}
                        href={`/installer/${encodeURIComponent(String(installer.id))}`}
                        className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition"
                      >
                        <p className="font-bold text-blue-950 line-clamp-2">{fullName}</p>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-1">{installer?.companyName || 'Certified Installer'}</p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{installer?.serviceAreas || installer?.certifications || 'Renewable energy installation services'}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {[installer?.city, installer?.state, installer?.country].filter(Boolean).join(', ') || 'Location not specified'}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-blue-950 mb-3">General Platform</h2>
              {filteredPlatformLinks.length === 0 ? (
                <p className="text-gray-600">No matching platform sections.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredPlatformLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition"
                    >
                      <p className="font-bold text-blue-950">{link.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{link.description}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
