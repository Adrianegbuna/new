import { useState, useEffect, useRef } from 'react'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { cachedFetch } from '@/lib/api-cache'
import StandardProductCard from './StandardProductCard'

interface SubCategory {
  id: string
  name: string
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

export default function RenewableEnergyMarketplace() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest'>('featured')
  const [visibleCount, setVisibleCount] = useState(24)
  const gridRef = useRef<HTMLDivElement>(null)
  const shuffleList = <T,>(items: T[]) => {
    const array = [...items]
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  useEffect(() => {
    fetchCategoriesAndProducts()
  }, [])
  
  useEffect(() => {
    setVisibleCount(24)
  }, [selectedCategory, selectedSubcategory, sortBy])

  const fetchCategoriesAndProducts = async () => {
    try {
      const apiBase = getApiBaseUrl()

      const fetchedCategories = await cachedFetch('categories', async () => {
        const response = await fetch(`${apiBase}/categories`)
        if (!response.ok) throw new Error('Failed to fetch categories')
        const catData = await response.json()
        return Array.isArray(catData) ? catData : catData.categories || catData.data || []
      })
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

      const fetchedProducts = await cachedFetch(
        'products:all-vendor',
        async () => {
          const response = await fetch(`${apiBase}/products/all-vendor`)
          if (!response.ok) throw new Error('Failed to fetch products')
          const prodData = await response.json()
          return Array.isArray(prodData) ? prodData : prodData.data || []
        },
        5 * 60 * 1000
      )
      setProducts(shuffleList(fetchedProducts))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredProducts = () => {
    let filtered = [...products]

    if (selectedSubcategory) {
      filtered = filtered.filter((p) => p.subcategoryId === selectedSubcategory)
    } else if (selectedCategory) {
      const categorySubcategoryIds =
        categories.find((c) => c.id === selectedCategory)?.subcategories.map((s) => s.id) || []
      filtered = filtered.filter((p) => categorySubcategoryIds.includes(p.subcategoryId || ''))
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
  }

  const filteredProducts = getFilteredProducts()
  const visibleProducts = filteredProducts.slice(0, visibleCount)
  const selectedCategoryData = categories.find((c) => c.id === selectedCategory)

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-end gap-4">
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-400 rounded-lg text-sm bg-white font-medium"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="w-full">
          {selectedCategory && selectedCategoryData && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className={`p-2 rounded-lg text-sm font-semibold transition ${
                    !selectedSubcategory ? 'bg-green-500 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  All Items
                </button>
                {selectedCategoryData.subcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => setSelectedSubcategory(selectedSubcategory === subcategory.id ? null : subcategory.id)}
                    className={`p-2 rounded-lg text-sm font-semibold transition ${
                      selectedSubcategory === subcategory.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}
                  >
                    {subcategory.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-black font-bold text-lg">No products found</p>
              <p className="text-black font-semibold text-sm mt-2">Try adjusting your filters or search</p>
            </div>
          ) : (
            <div ref={gridRef} className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
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
                    rating: Number((product as any).rating || 0),
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
        </div>
      </div>
    </div>
  )
}
