import Head from 'next/head'
import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useCurrency } from '@/context/CurrencyContext'
import { getImageUrl } from '@/lib/imageUtils'

interface Product {
  id: string | number
  name: string
  description: string
  price: number
  category: string
  subcategory?: string
  image: string
  stock: number
  storeId?: string
  storeName?: string
  storeLogo?: string
  rating?: number
  sales?: number
  views?: number
  specifications?: Record<string, any>
}

// Complete product taxonomy
const PRODUCT_CATEGORIES = {
  'Solar Power': [
    'Solar Panels',
    'Solar Inverters',
    'Solar Batteries & Storage',
    'Solar Charge Controllers',
    'Solar Generators & Power Stations',
    'Solar Lighting',
    'Solar Water & Pumping Solutions',
    'Solar Appliances & Cooling',
    'Solar Accessories & Components'
  ],
  'Wind & Hybrid Renewable Products': [
    'Small Wind Turbines',
    'Wind Turbine Generators',
    'Hybrid Wind-Solar Systems',
    'Wind Turbine Controllers & Mounts'
  ],
  'Bioenergy & Biomass Solutions': [
    'Biogas Digesters',
    'Biogas Stoves / Burners',
    'Biomass Generators',
    'Waste-to-Energy Equipment',
    'Biofuel Production Systems'
  ],
  'Micro-Hydropower Systems': [
    'Micro-Hydro Turbines',
    'Mini Stream Hydro Generators',
    'Hydro Controllers & Turbines',
    'Small Water Power Kits'
  ],
  'Hybrid & Mini-Grid Systems': [
    'Solar + Generator Hybrid Systems',
    'Solar + Wind Hybrid Power Systems',
    'Community Mini-Grid Power Solutions',
    'Smart Inverters for Hybrid Setups'
  ],
  'Energy Efficient & Home Renewable Appliances': [
    'Solar Cookers',
    'Solar Ovens',
    'Efficient Biomass Cookstoves',
    'Solar Dryers'
  ],
  'Installation, Tools & Support Products': [
    'Installation Tools & Hardware',
    'Protective Equipment',
    'Load Calculators & Measurement Tools',
    'Monitoring Systems & Smart Energy Meters'
  ],
  'Other Accessories': [
    'General Accessories',
    'Emergency & Backup',
    'Smart Integration',
    'Maintenance Products'
  ]
}

export default function RenewableProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMainCategory, setSelectedMainCategory] = useState('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState('all')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 999999 })
  const [inStockOnly, setInStockOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'price-low' | 'price-high' | 'newest' | 'popular'>('newest')
  const [priceInputMin, setPriceInputMin] = useState('0')
  const [priceInputMax, setPriceInputMax] = useState('999999')
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

  const mainCategories = Object.keys(PRODUCT_CATEGORIES)

  // Get subcategories for selected main category
  const availableSubcategories = selectedMainCategory !== 'all' 
    ? PRODUCT_CATEGORIES[selectedMainCategory as keyof typeof PRODUCT_CATEGORIES] || []
    : []

  // Reset subcategory when main category changes
  useEffect(() => {
    fetchAllProducts()
  }, [])

  const fetchAllProducts = async () => {
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/products/all-vendor`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Filter products with category/subcategory hierarchy
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.storeName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesMainCategory = selectedMainCategory === 'all' || product.category === selectedMainCategory
    const matchesSubcategory = selectedSubcategory === 'all' || product.subcategory === selectedSubcategory

    const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max
    const matchesStock = !inStockOnly || product.stock > 0

    return matchesSearch && matchesMainCategory && matchesSubcategory && matchesPrice && matchesStock
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

  const handleClearFilters = () => {
    setSelectedMainCategory('all')
    setSelectedSubcategory('all')
    setPriceRange({ min: 0, max: 999999 })
    setInStockOnly(false)
    setSearchQuery('')
    setPriceInputMin('0')
    setPriceInputMax('999999')
  }

  const isFiltered = selectedMainCategory !== 'all' ||
    selectedSubcategory !== 'all' ||
    priceRange.min !== 0 ||
    priceRange.max !== 999999 ||
    inStockOnly ||
    searchQuery !== ''

  const ImagePreview = ({ src, alt }: { src: string; alt: string }) => {
    const [imageError, setImageError] = useState(false)
    const fullImageUrl = getImageUrl(src)

    if (!src || imageError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 text-4xl">
          ?
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

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Head>
        <title>Renewable Energy Products - RenewableZmart</title>
        <meta
          name="description"
          content="Browse quality renewable energy products - Solar panels, inverters, wind turbines, batteries, and more from verified vendors"
        />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">? Renewable Energy Products</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90">
              Discover high-quality solar panels, inverters, batteries, and more from verified vendors
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar Filters */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 sticky top-4 space-y-6">
                {/* Main Category Filter */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Main Category</h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {mainCategories.map((cat) => (
                      <label key={cat} className={`flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition ${selectedMainCategory === cat ? 'bg-slate-900 border-l-4 border-orange-600' : ''}`}>
                        <input
                          type="radio"
                          name="main-category"
                          value={cat}
                          checked={selectedMainCategory === cat}
                          onChange={(e) => setSelectedMainCategory(e.target.value)}
                          className="rounded"
                        />
                        <span className={`text-sm font-bold ${selectedMainCategory === cat ? 'text-orange-700' : 'text-gray-900'}`}>{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subcategory Filter */}
                {selectedMainCategory !== 'all' && availableSubcategories.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Subcategory</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {availableSubcategories.map((subcat) => (
                        <label key={subcat} className={`flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition ${selectedSubcategory === subcat ? 'bg-blue-100 border-l-4 border-blue-600' : ''}`}>
                          <input
                            type="radio"
                            name="subcategory"
                            value={subcat}
                            checked={selectedSubcategory === subcat}
                            onChange={(e) => setSelectedSubcategory(e.target.value)}
                            className="rounded"
                          />
                          <span className={`text-xs font-bold ${selectedSubcategory === subcat ? 'text-blue-700' : 'text-gray-900'}`}>{subcat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range Filter */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Price Range</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-900 font-bold mb-1 block">Min Price (?)</label>
                      <input
                        type="number"
                        value={priceInputMin}
                        onChange={(e) => setPriceInputMin(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-900 font-bold mb-1 block">Max Price (?)</label>
                      <input
                        type="number"
                        value={priceInputMax}
                        onChange={(e) => setPriceInputMax(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="999999"
                      />
                    </div>
                    <button
                      onClick={handlePriceFilter}
                      className="w-full bg-emerald-600 text-white py-2 rounded text-sm font-semibold hover:bg-emerald-700 transition"
                    >
                      Apply Price Filter
                    </button>
                  </div>
                </div>

                {/* In Stock Filter */}
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-900 font-bold">In Stock Only</span>
                  </label>
                </div>

                {/* Clear Filters */}
                {isFiltered && (
                  <button
                    onClick={handleClearFilters}
                    className="w-full border-2 border-emerald-600 text-emerald-600 py-2 rounded text-sm font-semibold hover:bg-emerald-50 transition"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">
              {/* Search and View Options */}
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Search */}
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Search products by name, specs, or vendor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 rounded text-sm font-medium transition ${
                        viewMode === 'grid'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-300 text-gray-900 font-bold hover:bg-gray-400'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 rounded text-sm font-medium transition ${
                        viewMode === 'list'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-300 text-gray-900 font-bold hover:bg-gray-400'
                      }`}
                    >
                      List
                    </button>
                  </div>
                </div>

                {/* Sort and Results Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-900">
                    {selectedMainCategory !== 'all' ? selectedMainCategory : 'Products'}
                    {selectedSubcategory !== 'all' && ` • ${selectedSubcategory}`}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-900 font-bold">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="popular">Most Popular</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin">
                    <div className="text-4xl">?</div>
                  </div>
                </div>
              )}

              {/* Products Grid/List */}
              {!loading && sortedProducts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <div className="text-5xl mb-4">?</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Products Found</h3>
                  <p className="text-black mb-4">
                    {searchQuery && 'No products match your search. Try different keywords.'}
                    {!searchQuery && 'No products available in this category.'}
                  </p>
                  {isFiltered && (
                    <button
                      onClick={handleClearFilters}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={
                    viewMode === 'grid'
                      ? 'max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch'
                      : 'space-y-4'
                  }
                >
                  {sortedProducts.map((product) => (
                    <Link key={product.id} href={`/product/${product.id}`}>
                      <a className="block h-full">
                        {viewMode === 'grid' ? (
                          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition h-full flex flex-col cursor-pointer group">
                            {/* Image */}
                            <div className="relative bg-[#f8f8f8] aspect-square p-5 flex items-center justify-center overflow-hidden">
                              <ImagePreview src={product.image} alt={product.name} />
                              {product.stock === 0 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">Out of Stock</span>
                                </div>
                              )}
                              {product.stock > 0 && product.stock < 5 && (
                                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                                  Low Stock
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-4 flex-1 flex flex-col">
                              {/* Category Badges */}
                              <h3 className="text-[15px] font-semibold leading-[1.4] text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600">
                                {product.name}
                              </h3>

                              <p className="text-xs sm:text-sm text-gray-900 font-bold mb-3 line-clamp-2 flex-grow">
                                {product.description}
                              </p>

                              {/* Specifications */}
                              {product.specifications && Object.keys(product.specifications).length > 0 && (
                                <div className="mb-3 text-xs text-gray-900 font-bold">
                                  {Object.entries(product.specifications).slice(0, 2).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="font-semibold">{key}:</span> {String(value)}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="border-t pt-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-[20px] font-bold text-emerald-600">
                                    {formatPrice(product.price)}
                                  </div>
                                  <button
                                    onClick={(event) => event.preventDefault()}
                                    className="h-10 w-10 rounded-full border border-gray-300 text-gray-900 flex items-center justify-center transition hover:bg-gray-50 hover:scale-105"
                                    aria-label="Add to Cart"
                                  >
                                    🛒
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex">{renderStars(product.rating || 0)}</div>
                                  <span className="text-[13px] font-medium text-gray-700">
                                    {Number((product as any).ratingCount ?? (product as any).reviewsCount ?? (product as any).reviewCount ?? 0)}
                                  </span>
                                </div>
                                {product.storeName && (
                                  <span className="mt-1 inline-block text-blue-950 font-bold text-[13px]">
                                    Visit Store
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // List View
                          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-xl transition flex gap-4 cursor-pointer">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                              <ImagePreview src={product.image} alt={product.name} />
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-[15px] font-semibold leading-[1.4] text-gray-900 mb-2 hover:text-emerald-600 line-clamp-2">
                                  {product.name}
                                </h3>

                                <p className="text-sm text-gray-900 font-bold mb-3 line-clamp-2">
                                  {product.description}
                                </p>

                                {/* Specs */}
                                {product.specifications && Object.keys(product.specifications).length > 0 && (
                                  <div className="text-xs text-gray-900 font-bold space-y-1">
                                    {Object.entries(product.specifications).slice(0, 3).map(([key, value]) => (
                                      <div key={key}>
                                        <span className="font-semibold">{key}:</span> {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="pt-3 border-t">
                                <div className="flex items-center justify-between">
                                  <div className="text-[20px] font-bold text-emerald-600">
                                    {formatPrice(product.price)}
                                  </div>
                                  <button
                                    onClick={(event) => event.preventDefault()}
                                    className={`h-10 w-10 rounded-full border flex items-center justify-center transition ${
                                      product.stock === 0
                                        ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                        : 'border-gray-300 text-gray-900 hover:bg-gray-50 hover:scale-105'
                                    }`}
                                    aria-label={product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                                  >
                                    🛒
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex">{renderStars(product.rating || 0)}</div>
                                  <span className="text-[13px] font-medium text-gray-700">
                                    {Number((product as any).ratingCount ?? (product as any).reviewsCount ?? (product as any).reviewCount ?? 0)}
                                  </span>
                                </div>
                                {product.storeName && (
                                  <span className="mt-1 inline-block text-blue-950 font-bold text-[13px]">
                                    Visit Store
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </a>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}





