import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductGrid from '../components/ProductGrid'
import HeroAdCarousel from '../components/HeroAdCarousel'
import type { CatalogProduct } from '../types'
import { getApiBaseUrl } from '@/lib/apiConfig'
import type { GetStaticProps } from 'next'

interface HomeProps {
  initialProducts: CatalogProduct[]
}

const isProductApprovedForMarketplace = (product: any): boolean => {
  if (typeof product?.isApproved === 'boolean') return product.isApproved
  const status = String(product?.approvalStatus || product?.status || '').toLowerCase()
  if (!status) return true
  return status === 'approved' || status === 'active' || status === 'published'
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://renewablezmart-backend.onrender.com/api'
    const response = await fetch(`${apiBase}/products/all-vendor`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    let initialProducts: CatalogProduct[] = []
    if (response.ok) {
      const data = await response.json()
      // Normalize data to ensure all required properties exist and no undefined values
      initialProducts = (data || [])
        .filter((product: any) => isProductApprovedForMarketplace(product))
        .map((product: any) => {
        const productId = String(product.id ?? product._id ?? product.productId ?? '').trim()
        const normalized: any = {
          id: productId,
          title: product.title || product.name || 'Product',
          price: product.price || 0,
          image: product.image || '',
          category: product.category || '',
          stock: product.stock || 0,
        };
        // Only add optional fields if they exist (not undefined)
        if (product.rating !== undefined && product.rating !== null) normalized.rating = product.rating;
        if (product.storeName) normalized.storeName = product.storeName;
        if (product.storeId) normalized.storeId = product.storeId;
        if (product.description) normalized.description = product.description;
        return normalized;
      });
    }

    // Shuffle products so the homepage is not static
    initialProducts = initialProducts
      .map((item) => item)
      .sort(() => Math.random() - 0.5)
    
    return {
      props: { initialProducts },
      revalidate: 60, // Revalidate every 60 seconds (ISR)
    }
  } catch (error) {
    console.error('Failed to fetch products at build time:', error)
    return {
      props: { initialProducts: [] },
      revalidate: 10, // Retry faster if there's an error
    }
  }
}

export default function Home({ initialProducts }: HomeProps) {
  const router = useRouter()
  const { search } = router.query
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts || [])
  const [allProducts, setAllProducts] = useState<CatalogProduct[]>(initialProducts || [])
  const [loading, setLoading] = useState((initialProducts || []).length === 0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('Nigeria')
  const [selectedCity, setSelectedCity] = useState('Lagos')
  const [visibleCount, setVisibleCount] = useState(24)
  const gridRef = useRef<HTMLDivElement>(null)
  const shuffleProducts = (items: CatalogProduct[]) => {
    const array = [...items]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }
  // Handle search from URL query
  useEffect(() => {
    if (search && typeof search === 'string') {
      setSearchQuery(search)
    }
  }, [search])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncLocation = () => {
      const savedLocation = localStorage.getItem('renewablezmart_location')
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
    return () => window.removeEventListener('locationChanged', syncLocation)
  }, [])

  // Runtime fetch to avoid empty/stale ISR payloads and always show latest approved products.
  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        setLoading(true)
        const apiBase = getApiBaseUrl()
        const response = await fetch(`${apiBase}/products/all-vendor`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
          return
        }

        const data = await response.json()
        const normalized: CatalogProduct[] = (data || [])
          .filter((product: any) => isProductApprovedForMarketplace(product))
          .map((product: any) => {
          const productId = String(product.id ?? product._id ?? product.productId ?? '').trim()
          const item: any = {
            id: productId,
            title: product.title || product.name || 'Product',
            price: product.price || 0,
            image: product.image || '',
            category: product.category || '',
            stock: product.stock || 0,
          }

          if (product.rating !== undefined && product.rating !== null) item.rating = product.rating
          if (product.storeName) item.storeName = product.storeName
          if (product.storeId) item.storeId = product.storeId
          if (product.description) item.description = product.description
          if (product.country) item.country = product.country
          if (product.city) item.city = product.city

          return item
        })

        setAllProducts(shuffleProducts(normalized))
      } catch (error) {
        console.error('Failed to refresh products at runtime:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestProducts()
  }, [])

  // Filter products when country, city, or search query changes
  useEffect(() => {
    let filtered = allProducts

    const selectedCountryValue = String(selectedCountry || '').toLowerCase().trim()
    const selectedCityValue = String(selectedCity || '').toLowerCase().trim()
    filtered = filtered.filter((product: any) => {
      const productCountry = String(product?.country || '').toLowerCase().trim()
      const productCity = String(product?.city || '').toLowerCase().trim()
      const matchesCountry = !selectedCountryValue || !productCountry || productCountry === selectedCountryValue
      const matchesCity = !selectedCityValue || !productCity || productCity === selectedCityValue
      return matchesCountry && matchesCity
    })

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        (p as any).description?.toLowerCase().includes(query)
      )
    }
    setProducts(filtered)
  }, [allProducts, searchQuery, selectedCountry, selectedCity])
  
  useEffect(() => {
    setVisibleCount(24)
  }, [searchQuery, products.length])

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Head>
        <title>RenewableZmart - Renewable Energy Products | Sell, Swap, & More...</title>
        <meta name="description" content="Shop sustainable energy products - Solar panels, batteries, inverters, and more." />
      </Head>
      <Header />

      <main>
        <div className="container mx-auto px-4 py-8">
          <div className="-mt-1">
            <HeroAdCarousel />
          </div>

          {/* All Products */}
          <div className="relative z-30">
            <div className="flex flex-col gap-3 mb-4">
              {searchQuery && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white">
                    {`Search Results for "${searchQuery}"`}
                  </h2>
                  <button 
                    onClick={() => { setSearchQuery(''); router.push('/') }}
                    className="text-sm text-blue-600 hover:underline mt-1"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
            <div ref={gridRef}>
              <ProductGrid products={products.slice(0, visibleCount)} loading={loading} />
            </div>
            {products.length > visibleCount && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={() => {
                    const nextCount = Math.min(visibleCount + 24, products.length)
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
      </main>

      <Footer />
    </div>
  )
}



