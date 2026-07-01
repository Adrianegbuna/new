import { useState, useEffect, useRef } from 'react'
import { getApiBaseUrl } from '@/lib/apiConfig'
import StandardProductCard from '@/components/product/StandardProductCard'

interface SubCategory {
  id: string
  name: string
  icon?: string
}

interface Category {
  id: string
  name: string
  icon: string
  displayOrder: number
  subcategories: SubCategory[]
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  stock: number
  storeName?: string
  subcategoryId?: string
  rating?: number
  ratingCount?: number
  reviewsCount?: number
  reviewCount?: number
}

export default function JumiaProductsDisplay() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest'>('featured')
  const [visibleCount, setVisibleCount] = useState(24)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCategoriesAndProducts()
  }, [])
  
  useEffect(() => {
    setVisibleCount(24)
  }, [searchQuery, selectedCategory, selectedSubcategory, sortBy, viewMode])

  const fetchCategoriesAndProducts = async () => {
    try {
      const apiBase = getApiBaseUrl()

      const catResponse = await fetch(`${apiBase}/categories`)
      if (catResponse.ok) {
        const catData = await catResponse.json()
        const fetchedCategories = Array.isArray(catData) ? catData : catData.categories || catData.data || []
        const getCategoryRank = (name: string) => {
          const normalized = name.trim().toLowerCase()
          if (normalized === 'miscellaneous') return 2
          if (normalized === 'electric vehicles & parts') return 1
          return 0
        }
        const sortedCategories = fetchedCategories
          .map((cat: any) => ({
            ...cat,
            subcategories: Array.isArray(cat?.subcategories)
              ? [...cat.subcategories].sort((a: any, b: any) =>
                  String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
                )
              : cat?.subcategories,
          }))
          .sort((a: any, b: any) => {
            const aName = String(a?.name || '')
            const bName = String(b?.name || '')
            const rankDiff = getCategoryRank(aName) - getCategoryRank(bName)
            if (rankDiff !== 0) return rankDiff
            return aName.localeCompare(bName, undefined, { sensitivity: 'base' })
          })
        setCategories(sortedCategories)
      }

      const prodResponse = await fetch(`${apiBase}/products/all-vendor`)
      if (prodResponse.ok) {
        const prodData = await prodResponse.json()
        setProducts(Array.isArray(prodData) ? prodData : prodData.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = (() => {
    let filtered = [...products].filter((p) => Number(p?.stock ?? 0) > 0)

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory) {
      const selectedCat = categories.find((c) => c.id === selectedCategory)
      const subIds = selectedCat?.subcategories.map((s) => s.id) || []
      if (subIds.length > 0) {
        filtered = filtered.filter((p) => (p.subcategoryId ? subIds.includes(p.subcategoryId) : true))
      }
    }

    if (selectedSubcategory) {
      filtered = filtered.filter((p) => p.subcategoryId === selectedSubcategory)
    }

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price)
        break
      default:
        break
    }

    return filtered
  })()

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory)
  const visibleProducts = filteredProducts.slice(0, visibleCount)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-green-500 text-black font-medium placeholder:text-gray-800"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <aside className="w-80 flex-shrink-0 hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sticky top-24">
              <h2 className="text-lg font-bold mb-4 text-black">Categories</h2>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSelectedCategory(null)
                    setSelectedSubcategory(null)
                  }}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    !selectedCategory ? 'bg-slate-900 text-white font-semibold' : 'text-black font-bold hover:bg-gray-100'
                  }`}
                >
                  All Products
                </button>
                {categories.map((category) => (
                  <div key={category.id}>
                    <button
                      onClick={() => {
                        setSelectedCategory(selectedCategory === category.id ? null : category.id)
                        setSelectedSubcategory(null)
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition flex items-center gap-2 font-semibold ${
                        selectedCategory === category.id ? 'bg-slate-900 text-white' : 'text-black font-bold hover:bg-gray-100'
                      }`}
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </button>

                    {selectedCategory === category.id && category.subcategories?.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1 border-l-2 border-orange-200 pl-0">
                        {category.subcategories.map((subcategory) => (
                          <button
                            key={subcategory.id}
                            onClick={() =>
                              setSelectedSubcategory(selectedSubcategory === subcategory.id ? null : subcategory.id)
                            }
                            className={`w-full text-left px-4 py-2 text-sm rounded-lg transition ${
                              selectedSubcategory === subcategory.id
                                ? 'bg-blue-100 text-blue-700 font-semibold'
                                : 'text-black font-bold hover:bg-gray-50'
                            }`}
                          >
                            {subcategory.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1">
            <div className="flex gap-4 mb-6 justify-between items-center">
              <h1 className="text-3xl font-bold text-black">
                {selectedCategoryData ? `${selectedCategoryData.icon} ${selectedCategoryData.name}` : 'All Products'}
              </h1>

              <div className="flex gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-800"
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'bg-gray-200 text-black font-bold'}`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-gray-200 text-black font-bold'}`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-black font-bold text-lg">No products found</p>
                <p className="text-black font-bold text-sm mt-2">Try adjusting your filters or search</p>
              </div>
            ) : (
              <div ref={gridRef} className={viewMode === 'grid' ? 'max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch' : 'grid grid-cols-1 gap-4 sm:gap-6'}>
                {visibleProducts.map((product) => (
                  <StandardProductCard
                    key={product.id}
                    product={{
                      id: String(product.id || '').trim(),
                      title: product.name || 'Untitled Product',
                      price: Number(product.price || 0),
                      image: product.image || '',
                      storeName: product.storeName,
                      storeHref: (product as any).store?.slug || (product as any).storeSlug
                        ? `/store/${(product as any).store?.slug || (product as any).storeSlug}`
                        : '/stores',
                      storeSlug: (product as any).store?.slug || (product as any).storeSlug || undefined,
                      storeId:
                        (product as any).store?.id ||
                        (product as any).store?.storeId ||
                        (product as any).storeId ||
                        (product as any).store_id ||
                        undefined,
                      category: 'General',
                      stock: Number(product.stock || 0),
                      description: product.description || '',
                      rating: Number(product.rating || 0),
                      ratingCount: Number((product as any).ratingCount ?? (product as any).reviewsCount ?? (product as any).reviewCount ?? 0),
                    }}
                  />
                ))}
              </div>
            )}
            {filteredProducts.length > visibleCount && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={() => {
                    const nextCount = Math.min(visibleCount + 24, filteredProducts.length)
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
          </main>
        </div>
      </div>
    </div>
  )
}
