import Head from 'next/head'
import { useState, useEffect, useMemo } from 'react'
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useCurrency } from '@/context/CurrencyContext'
import { getImageUrl } from '@/lib/imageUtils'
import { useRouter } from 'next/router'
import { FilterBox } from '@/components/ui/FilterBox'
import styles from '@/styles/products.module.css'
import { useAuthStore } from '@/store/authStore'

interface Product {
  id: string | number
  name: string
  description: string
  price: number
  category: string
  categoryName?: string
  subcategory?: string
  image: string
  stock: number
  storeId?: string
  storeName?: string
  storeLogo?: string
  rating?: number
  sales?: number
  views?: number
}

export default function VendorProducts() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSubcategory, setSelectedSubcategory] = useState('all')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 999999 })
  const [selectedPriceRange, setSelectedPriceRange] = useState<string[]>([])
  const [selectedRating, setSelectedRating] = useState<string[]>([])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'newest' | 'popular'>('newest')
  const [priceInputMin, setPriceInputMin] = useState('0')
  const [priceInputMax, setPriceInputMax] = useState('999999')
  const [categories, setCategories] = useState<any[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const { formatPrice } = useCurrency()

  const renderStars = (rating: number) => {
    const safeRating = Math.max(0, Math.min(5, rating))
    return Array.from({ length: 5 }, (_, index) => {
      const filled = index + 1 <= Math.round(safeRating)
      return (
        <span key={index} className={filled ? 'text-yellow-500' : 'text-gray-300'}>
          ★
        </span>
      )
    })
  }

  // Set initial filters from URL query params and fetch categories
  useEffect(() => {
    if (!router.isReady) return

    const { category, subcategory, search } = router.query
    if (category) setSelectedCategory(category as string)
    if (subcategory) setSelectedSubcategory(subcategory as string)
    if (search) setSearchQuery(search as string)

    fetchCategories()
  }, [router.isReady])

  // Fetch products when category or subcategory changes
  useEffect(() => {
    if (!router.isReady) return
    fetchAllProducts()
  }, [selectedCategory, selectedSubcategory, router.isReady])

  const fetchCategories = async () => {
    try {
      const apiBase = getApiBaseUrl()
      console.log(`[PRODUCTS PAGE] Fetching categories from: ${apiBase}/categories`)
      const response = await fetch(`${apiBase}/categories`)
      console.log(`[PRODUCTS PAGE] Categories response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[PRODUCTS PAGE] Categories data:`, data)
        const catArray = Array.isArray(data) ? data : data.data || data.categories || []
        
        console.log(`[PRODUCTS PAGE] Categories array length: ${catArray.length}`)
        
        // Build category ID to name map
        const map: Record<string, string> = {}
        catArray.forEach((cat: any) => {
          map[cat.id] = cat.name
        })
        setCategoryMap(map)
        
        const categoryData = catArray.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          description: cat.description,
          subcategoryCount: cat.subcategoryCount,
          subcategories: cat.subcategories || []
        })) || []
        setCategories(categoryData)
        console.log(`[PRODUCTS PAGE] Categories set to ${categoryData.length} items`)
      } else {
        console.error(`[PRODUCTS PAGE] Failed to fetch categories. Status: ${response.status}`)
        setCategories([])
      }
    } catch (error) {
      console.error('[PRODUCTS PAGE] Error fetching categories:', error)
      setCategories([])
    }
  }

  const fetchAllProducts = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const params = new URLSearchParams()
      
      if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory)
      }
      if (selectedSubcategory !== 'all') {
        params.append('subcategoryId', selectedSubcategory)
      }

      const url = `${apiBase}/products/all-vendor${params.toString() ? '?' + params.toString() : ''}`
      console.log(`[PRODUCTS PAGE] Fetching products from: ${url}`)
      const response = await fetch(url)
      console.log(`[PRODUCTS PAGE] Products response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[PRODUCTS PAGE] Received ${data.length} products`)
        setProducts(Array.isArray(data) ? data : [])
      } else {
        console.error(`[PRODUCTS PAGE] Failed to fetch products. Status: ${response.status}`)
        const errorText = await response.text()
        console.error(`[PRODUCTS PAGE] Error response: ${errorText}`)
        setProducts([])
      }
    } catch (error) {
      console.error('[PRODUCTS PAGE] Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Filter products (client-side search only, backend handles category/subcategory filtering)
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.storeName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max

    const matchesStock = !inStockOnly || product.stock > 0

    return matchesSearch && matchesPrice && matchesStock
  })

  // Sort products
  let sortedProducts = [...filteredProducts]
  if (sortBy === 'price-low') {
    sortedProducts.sort((a, b) => a.price - b.price)
  } else if (sortBy === 'price-high') {
    sortedProducts.sort((a, b) => b.price - a.price)
  } else if (sortBy === 'popular') {
    sortedProducts.sort((a, b) => (b.sales || 0) - (a.sales || 0))
  }

  const handlePriceFilter = () => {
    const min = parseInt(priceInputMin) || 0
    const max = parseInt(priceInputMax) || 999999
    setPriceRange({ min, max })
  }

  const ImagePreview = ({ src, alt }: { src: string; alt: string }) => {
    const [imageError, setImageError] = useState(false)
    const fullImageUrl = getImageUrl(src)

    if (!src || imageError) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-black text-sm font-semibold">
            No Image
          </div>
        )
    }

    return (
      <img
        src={fullImageUrl}
        alt={alt}
        className="max-w-full max-h-full object-contain"
        onError={() => setImageError(true)}
        loading="lazy"
      />
    )
  }

  const categoryOptions = [
    { id: 'solar-panels', label: 'Solar Panels', count: 45 },
    { id: 'batteries', label: 'Batteries', count: 32 },
    { id: 'inverters', label: 'Inverters', count: 28 },
    { id: 'accessories', label: 'Accessories', count: 67 },
  ]

  const priceOptions = [
    { id: 'under-500k', label: 'Under NGN 500,000', count: 42 },
    { id: '500k-1m', label: 'NGN 500,000 - NGN 1,000,000', count: 31 },
    { id: '1m-5m', label: 'NGN 1,000,000 - NGN 5,000,000', count: 55 },
    { id: 'above-5m', label: 'Above NGN 5,000,000', count: 44 },
  ]

  const ratingOptions = [
    { id: '5-stars', label: '5 Stars', count: 18 },
    { id: '4-stars', label: '4+ Stars', count: 35 },
    { id: '3-stars', label: '3+ Stars', count: 52 },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Back Button */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold transition"
            >
              ? Back
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
            {/* LEFT SIDEBAR - Subcategories */}
            {selectedCategory !== 'all' && categories.length > 0 && (
              <div className="md:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-20 space-y-6">
                  {/* Category Title - Dropdown */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Category</h3>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        const newCategory = e.target.value
                        setSelectedCategory(newCategory)
                        setSelectedSubcategory('all')
                        // Update URL with new category
                        router.push({
                          pathname: '/products',
                          query: newCategory !== 'all' ? { category: newCategory } : {}
                        }, undefined, { shallow: true })
                      }}
                      className="w-full bg-slate-900 border-l-4 border-orange-500 rounded-lg px-4 py-3 text-sm font-bold text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer hover:bg-slate-900 transition"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category: any) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategories - Vertical List */}
                  {categories.find((c: any) => c.id === selectedCategory)?.subcategories && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Subcategories</h4>
                      <div className="space-y-2.5">
                        {categories
                          .find((c: any) => c.id === selectedCategory)
                          ?.subcategories.map((subcategory: any, idx: number) => {
                            const subcategoryId = typeof subcategory === 'string' ? subcategory : subcategory.id
                            const subcategoryName = typeof subcategory === 'string' ? subcategory : subcategory.name
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedSubcategory(subcategoryId)
                                  // Update URL with subcategory parameter
                                  router.push({
                                    pathname: '/products',
                                    query: {
                                      category: selectedCategory,
                                      subcategory: subcategoryId
                                    }
                                  }, undefined, { shallow: true })
                                }}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                                  selectedSubcategory === subcategoryId
                                    ? 'bg-emerald-600 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
                                }`}
                              >
                                {subcategoryName}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MAIN CONTENT */}
            <div className={selectedCategory !== 'all' && categories.length > 0 ? 'md:col-span-3' : 'w-full'}>

              {/* Search and View Options */}
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="mb-4 sm:mb-6">
                  <input
                    type="text"
                    placeholder="Search products, stores..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 text-sm sm:text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <select
                    className="px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-emerald-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm sm:text-base font-bold"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                  </select>

                  <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                    <button
                      className={`flex-1 px-3 sm:px-4 py-2 rounded text-sm font-medium transition ${
                        viewMode === 'grid'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-transparent text-gray-900 font-bold hover:bg-white'
                      }`}
                      onClick={() => setViewMode('grid')}
                    >
                      Grid
                    </button>
                    <button
                      className={`flex-1 px-3 sm:px-4 py-2 rounded text-sm font-medium transition ${
                        viewMode === 'list'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-transparent text-gray-900 font-bold hover:bg-white'
                      }`}
                      onClick={() => setViewMode('list')}
                    >
                      List
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-900 font-bold mt-4">
                  {loading ? 'Loading...' : ''}
                </div>
              </div>

              {/* Products Display */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                  </div>
                  <p className="text-gray-900 font-bold mt-4">Loading products...</p>
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="text-6xl mb-4">?</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-900 font-bold mb-6">
                    {searchQuery || selectedCategory !== 'all' || inStockOnly || priceRange.min !== 0
                      ? 'Try adjusting your search or filters'
                      : 'No products available yet'}
                  </p>
                  {(searchQuery || selectedCategory !== 'all' || inStockOnly || priceRange.min !== 0) && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory('all')
                        setSelectedSubcategory('all')
                        setInStockOnly(false)
                        setPriceRange({ min: 0, max: 999999 })
                        setPriceInputMin('0')
                        setPriceInputMax('999999')
                      }}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                // Grid View - Expanded Product Cards
                <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                  {sortedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-emerald-400 h-full flex flex-col"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {/* Image Container */}
                      <div className="relative bg-[#f8f8f8] aspect-square p-5 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImagePreview src={product.image} alt={product.name} />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold">No Image</div>
                        )}
                        {!product.stock && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                            <span className="text-white font-bold text-lg">Out of Stock</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 md:p-5 flex flex-col flex-grow">
                        {/* Title */}
                        <h3 className="text-[15px] font-semibold leading-[1.4] text-gray-900 line-clamp-2 mb-2 min-h-[3rem]">
                          {product.name}
                        </h3>

                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[20px] font-bold text-gray-900">
                            {formatPrice(product.price)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                            disabled={!product.stock}
                            className={`h-10 w-10 rounded-full border flex items-center justify-center transition ${
                              product.stock
                                ? 'border-gray-300 text-gray-900 hover:bg-gray-50 hover:scale-105'
                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                            }`}
                            aria-label={product.stock ? 'Add to Cart' : 'Out of Stock'}
                          >
                            🛒
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">{renderStars(product.rating || 0)}</div>
                          <span className="text-[13px] font-medium text-gray-700">
                            {Number((product as any).ratingCount ?? (product as any).reviewsCount ?? (product as any).reviewCount ?? 0)}
                          </span>
                        </div>

                        {product.storeName && (
                          <a
                            href={`/store/${product.storeId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-950 font-bold text-[13px] hover:text-blue-950 hover:underline transition"
                          >
                            Visit Store
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="space-y-4">
                  {sortedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg shadow-md hover:shadow-xl transition cursor-pointer p-4 sm:p-6 flex gap-4"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {/* Thumbnail */}
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 relative">
                        {product.image ? (
                          <ImagePreview src={product.image} alt={product.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-semibold">No Image</div>
                        )}
                        {!product.stock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">Out of Stock</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                            <div>
                              <h3 className="text-[15px] font-semibold leading-[1.4] text-gray-900 line-clamp-2">{product.name}</h3>
                            </div>
                            <div className="text-[20px] font-bold text-blue-600 whitespace-nowrap">
                              {formatPrice(product.price)}
                            </div>
                          </div>

                          <p className="text-sm text-gray-900 font-bold mb-3 line-clamp-2">{product.description}</p>
                        </div>

                        {/* Store Info and Rating */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3">
                          <div className="flex items-center gap-2">
                            {product.storeLogo ? (
                              <img
                                src={product.storeLogo}
                                alt={product.storeName}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">
                                {product.storeName?.charAt(0) || '?'}
                              </div>
                            )}
                            <p className="text-sm font-bold text-blue-950">{product.storeName || 'Unknown Store'}</p>
                          </div>
                          {product.rating && (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">?</span>
                              <span className="text-[13px] font-medium">{product.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 sm:p-6 flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold line-clamp-2">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-2xl sm:text-3xl text-black hover:text-gray-900 flex-shrink-0"
              >
                ?
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Image */}
              {selectedProduct.image && (
                <div className="rounded-lg overflow-hidden bg-gray-200 h-64 sm:h-96">
                  <ImagePreview src={selectedProduct.image} alt={selectedProduct.name} />
                </div>
              )}

              {/* Product Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Category</p>
                  <p className="text-lg font-bold text-gray-900">
                    {categoryMap[selectedProduct.category] || selectedProduct.category}
                  </p>
                </div>

                <div>
                    <p className="text-xs font-bold text-gray-900 uppercase mb-2">Price</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatPrice(selectedProduct.price)}
                  </p>
                </div>

                <div>
                    <p className="text-xs font-bold text-gray-900 uppercase mb-2">Description</p>
                  <p className="text-gray-900 whitespace-pre-wrap font-semibold">{selectedProduct.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-900 uppercase mb-2">Stock Available</p>
                    <p className={`text-lg font-bold ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedProduct.stock > 0 ? `${selectedProduct.stock} units` : 'Out of Stock'}
                    </p>
                  </div>
                  {selectedProduct.rating && (
                    <div>
                      <p className="text-xs font-bold text-gray-900 uppercase mb-2">Rating</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl text-yellow-500">?</span>
                        <span className="text-lg font-bold">{selectedProduct.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Store Info */}
                {selectedProduct.storeName && (
                  <div className="border-t pt-4">
                    <p className="text-xs font-bold text-gray-900 uppercase mb-3">Sold By</p>
                    <Link href="/stores">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        {selectedProduct.storeLogo ? (
                          <img
                            src={selectedProduct.storeLogo}
                            alt={selectedProduct.storeName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-600">
                            {selectedProduct.storeName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{selectedProduct.storeName}</p>
                          <p className="text-sm text-emerald-600 hover:underline">View Store ?</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    disabled={!selectedProduct.stock}
                    className={`flex-1 ${
                      selectedProduct.stock
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-gray-300 text-black cursor-not-allowed'
                    } px-4 py-3 rounded-lg transition font-semibold text-center`}
                    aria-label={selectedProduct.stock ? 'Add to Cart' : 'Out of Stock'}
                  >
                    {selectedProduct.stock ? '🛒' : 'Out of Stock'}
                  </button>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="flex-1 bg-gray-200 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}



