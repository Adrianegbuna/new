import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import ProductGrid from '../components/ProductGrid'
import type { CatalogProduct } from '../types'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [subcategoryMap, setSubcategoryMap] = useState<Record<string, string>>({})
  const observerTarget = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(24)
  const shuffleList = <T,>(items: T[]) => {
    const array = [...items]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const queryCategoryId = typeof router.query.category === 'string' ? router.query.category : ''
  const querySubcategoryId = typeof router.query.subcategory === 'string' ? router.query.subcategory : ''
  const querySearch = typeof router.query.q === 'string'
    ? router.query.q
    : (typeof router.query.search === 'string' ? router.query.search : '')

  const resolvedCategoryName = (() => {
    if (!queryCategoryId) return ''
    if (categoryMap[queryCategoryId]) return categoryMap[queryCategoryId]
    const match = products.find((product: any) =>
      (product.categoryId && String(product.categoryId) === queryCategoryId) ||
      (product.category && String(product.category) === queryCategoryId)
    )
    const anyMatch = match as any
    return anyMatch?.categoryName || anyMatch?.categoryLabel || match?.category || ''
  })()

  const resolvedSubcategoryName = (() => {
    if (!querySubcategoryId) return ''
    if (subcategoryMap[querySubcategoryId]) return subcategoryMap[querySubcategoryId]
    const match = products.find((product: any) =>
      (product.subcategoryId && String(product.subcategoryId) === querySubcategoryId) ||
      (product.subcategory && String(product.subcategory) === querySubcategoryId)
    )
    const anyMatch = match as any
    return anyMatch?.subcategoryName || anyMatch?.subcategoryLabel || anyMatch?.subcategory || ''
  })()

  const pageTitle = resolvedSubcategoryName
    || resolvedCategoryName
    || querySearch
    || 'Search Results'
  const isSearchActive = Boolean(querySearch)
  const isCategoryActive = Boolean(queryCategoryId || querySubcategoryId)

  const fetchProducts = async () => {
    try {
      console.log('[PRODUCTS] ===== FETCH START =====')
      setIsLoading(true)
      setError(null)
      
      // Determine API URL
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      const apiBase = isLocalhost ? 'http://localhost:4000/api' : 'https://renewablezmart-backend.onrender.com/api'
      const apiUrl = `${apiBase}/products/all-vendor`
      
      console.log('[PRODUCTS] Using API URL:', apiUrl)
      console.log('[PRODUCTS] IsLocalhost:', isLocalhost)
      
      // Single fetch call with explicit error handling
      console.log('[PRODUCTS] Fetching from:', apiUrl)
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      })
      
      console.log('[PRODUCTS] HTTP Status:', response.status, response.statusText)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const responseText = await response.text()
      console.log('[PRODUCTS] Raw response length:', responseText.length)
      console.log('[PRODUCTS] Raw response (first 500 chars):', responseText.substring(0, 500))
      
      // Parse JSON
      let rawData: any
      try {
        rawData = JSON.parse(responseText)
      } catch (parseErr) {
        console.error('[PRODUCTS] JSON parse error:', parseErr)
        throw new Error('Invalid JSON response from server')
      }
      
      console.log('[PRODUCTS] Parsed data type:', typeof rawData)
      console.log('[PRODUCTS] Is array:', Array.isArray(rawData))
      console.log('[PRODUCTS] Data keys:', rawData ? Object.keys(rawData).slice(0, 10) : 'N/A')
      
      // Extract products array
      let productsArray: any[] = []
      if (Array.isArray(rawData)) {
        productsArray = rawData
        console.log('[PRODUCTS] Data is already an array, length:', productsArray.length)
      } else if (rawData?.data && Array.isArray(rawData.data)) {
        productsArray = rawData.data
        console.log('[PRODUCTS] Found data.data array, length:', productsArray.length)
      } else if (rawData?.products && Array.isArray(rawData.products)) {
        productsArray = rawData.products
        console.log('[PRODUCTS] Found data.products array, length:', productsArray.length)
      } else {
        console.warn('[PRODUCTS] Could not find products array in response')
        console.log('[PRODUCTS] Response structure:', rawData)
      }
      
      console.log('[PRODUCTS] Raw products count:', productsArray.length)
      
      const matchesQuery = (product: any) => {
        if (querySubcategoryId || queryCategoryId) {
          if (querySubcategoryId) {
            const subId = String(product?.subcategoryId ?? product?.subcategory?.id ?? product?.subcategory ?? '').trim()
            if (subId && subId === querySubcategoryId) return true
          }
          if (queryCategoryId) {
            const catId = String(product?.categoryId ?? product?.category?.id ?? product?.category ?? '').trim()
            if (catId && catId === queryCategoryId) return true
          }
          return false
        }

        if (querySearch) {
          const q = querySearch.toLowerCase().trim()
          if (!q) return true
          const name = String(product?.name ?? product?.title ?? '').toLowerCase()
          const description = String(product?.description ?? '').toLowerCase()
          const category = String(product?.category ?? product?.categoryName ?? '').toLowerCase()
          const storeName = String(product?.storeName ?? product?.store?.name ?? '').toLowerCase()
          return [name, description, category, storeName].some((field) => field.includes(q))
        }

        return true
      }

      const filteredProducts = productsArray.filter(matchesQuery)

      const transformedProducts: CatalogProduct[] = filteredProducts.map((product: any, idx: number) => {
        console.log(`[PRODUCTS] Transform product ${idx}:`, product?.name || product?.title || 'unknown')
        return {
          id: product.id || `product-${idx}`,
          title: product.name || product.title || 'Untitled Product',
          price: typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0),
          originalPrice: product.originalPrice ? (typeof product.originalPrice === 'string' ? parseFloat(product.originalPrice) : product.originalPrice) : undefined,
          image: product.image || '',
          category: product.category || 'General',
          eco: product.eco || false,
          stock: typeof product.stock === 'string' ? parseInt(product.stock) : (product.stock || 0),
          description: product.description || '',
          storeId: product.storeId,
          storeName: product.storeName || product.store?.name || 'Store',
          rating: product.rating || 0,
          sales: product.sales || 0,
          views: product.views || product.impressions || 0,
        }
      })
      
      console.log('[PRODUCTS] Transformed products count:', transformedProducts.length)
      console.log('[PRODUCTS] First transformed product:', transformedProducts[0])
      
      console.log('[PRODUCTS] Setting products state to:', transformedProducts.length, 'products')
      const dedupedProducts = transformedProducts.filter((product, index, arr) =>
        arr.findIndex((item) => item.id === product.id) === index
      )

      setProducts(shuffleList(dedupedProducts))
      
      console.log('[PRODUCTS] ===== FETCH COMPLETE =====')
    } catch (err: any) {
      const errorMsg = err?.message || String(err)
      console.error('[PRODUCTS] ERROR:', errorMsg)
      console.error('[PRODUCTS] Full error:', err)
      setError(`❌ Error: ${errorMsg}`)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!router.isReady) return
    console.log('[PRODUCTS] Query changed, calling fetchProducts')
    fetchProducts()
  }, [router.isReady, querySearch, queryCategoryId, querySubcategoryId])

  useEffect(() => {
    setVisibleCount(24)
  }, [querySearch, queryCategoryId, querySubcategoryId])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        const apiBase = isLocalhost ? 'http://localhost:4000/api' : 'https://renewablezmart-backend.onrender.com/api'
        const response = await fetch(`${apiBase}/categories`, { headers: { 'Accept': 'application/json' }, cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
        const nextCategoryMap: Record<string, string> = {}
        const nextSubcategoryMap: Record<string, string> = {}
        list.forEach((category: any) => {
          if (category?.id && category?.name) {
            nextCategoryMap[String(category.id)] = category.name
          }
          if (Array.isArray(category?.subcategories)) {
            category.subcategories.forEach((sub: any) => {
              if (sub?.id && sub?.name) {
                nextSubcategoryMap[String(sub.id)] = sub.name
              }
            })
          }
        })
        setCategoryMap(nextCategoryMap)
        setSubcategoryMap(nextSubcategoryMap)
      } catch (err) {
        console.warn('[PRODUCTS] Failed to fetch category names', err)
      }
    }

    fetchCategories()
  }, [])

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>{pageTitle} - RenewableZmart</title>
        <meta name="description" content="Browse our collection of sustainable energy products" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-8">

        {/* Page Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
          </div>
        </div>

        {/* Error Display */}
        {!isLoading && products.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🛍️</div>
            {isSearchActive ? (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  No results for "{querySearch}"
                </h3>
                <p className="text-gray-700 font-semibold mb-4">Try a different keyword or clear your search.</p>
                <button
                  type="button"
                  onClick={() => router.push('/products')}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  Clear search
                </button>
              </>
            ) : isCategoryActive ? (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No products in this category</h3>
                <p className="text-gray-700 font-semibold">Try another category or check back later.</p>
              </>
            ) : (
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No products available</h3>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && products.length === 0 && (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="inline-flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
              <p className="text-gray-900 font-bold mt-4">Loading products...</p>
            </div>
          </div>
        )}

        {/* Products Found */}
        {!isLoading && products.length > 0 && (
          <>
            <div ref={gridRef}>
              <ProductGrid 
                products={products.slice(0, visibleCount)}
                loading={false}
                hasMore={false}
                isLoadingMore={false}
              />
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
          </>
        )}
        
        {/* No Products */}
        {false}
        
        <div ref={observerTarget} style={{ height: '1px' }} />
      </main>

      <Footer />
    </div>
  )
}

