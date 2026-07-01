import Head from 'next/head'
import Header from '@/components/layout/Header'
import ProductCard from '@/components/product/ProductCard'
import { useRouter } from 'next/router'
import { useCurrency } from '@/context/CurrencyContext'
import Link from 'next/link'
import type { CatalogProduct } from '@/types'
import { useState, useEffect } from 'react'
import { productService } from '@/lib/services'

type CategoryKey = 'solar' | 'inverters' | 'batteries' | 'accessories' | 'lighting' | 'wind' | 'water' | 'ev' | 'appliances' | string

export default function CategoryPage() {
  const router = useRouter()
  const { category } = router.query as { category?: CategoryKey }
  const { formatPrice } = useCurrency()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [allCategories, setAllCategories] = useState<Array<{id: string; name: string; icon: string; subcategories: Array<{id: string; name: string}>}>>([])
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest'>('featured')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getAll()
        setProducts(data as any)
      } catch (error) {
        console.error('Failed to fetch products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const categoryNames: Record<string, string> = {
    solar: 'Solar Panels',
    inverters: 'Inverters',
    batteries: 'Batteries & Energy Storage',
    solarlights: 'Solar Lights',
    accessories: 'Accessories & Components',
    ev: 'Electric Vehicles & Parts',
  }

  const categoryIcons: Record<string, string> = {
    solar: '☀️',
    inverters: '⚡',
    batteries: '🔋',
    accessories: '🔧',
    lighting: '💡',
    wind: '🌬️',
    water: '💧',
    ev: '🚗',
    appliances: '🏠',
  }

  const getDateValue = (item: any) => {
    const raw = item?.createdAt || item?.updatedAt || item?.dateAdded || item?.created_at || item?.updated_at
    const parsed = raw ? Date.parse(raw) : NaN
    return Number.isFinite(parsed) ? parsed : 0
  }
  const normalizeCategory = (value?: string) => {
    if (!value) return ''
    return value
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
  const normalizedCategory = normalizeCategory(category)
  const filteredProducts = category
    ? products.filter((p) => {
        const rawCategory =
          (p as any)?.category ||
          (p as any)?.categoryName ||
          (p as any)?.category_title ||
          (p as any)?.categoryLabel ||
          ''
        const normalizedProductCategory = normalizeCategory(rawCategory)
        if (normalizedProductCategory === normalizedCategory) return true
        if (normalizedCategory === 'ev' && normalizedProductCategory === 'electric-vehicles-and-parts') return true
        if (normalizedCategory === 'electric-vehicles-parts' && normalizedProductCategory === 'electric-vehicles-and-parts') return true
        return false
      })
    : []
  const sortedProducts = (() => {
    const base = [...filteredProducts]
    if (sortBy === 'price-low') {
      base.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    } else if (sortBy === 'price-high') {
      base.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    } else if (sortBy === 'newest') {
      base.sort((a, b) => getDateValue(b) - getDateValue(a))
    }
    return base
  })()
  const categoryName = (category && categoryNames[category]) ||
    (normalizedCategory === 'electric-vehicles-and-parts' || normalizedCategory === 'electric-vehicles-parts' ? 'Electric Vehicles & Parts' : 'Products')
  const categoryIcon = (category && categoryIcons[category]) ||
    (normalizedCategory === 'electric-vehicles-and-parts' || normalizedCategory === 'electric-vehicles-parts' ? '🚗' : '📦')

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>{categoryName} - RenewableZmart</title>
        <meta name="description" content={`Shop ${categoryName} at RenewableZmart`} />
      </Head>
      <Header />

      <main>
        {/* Back Button */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-bold transition"
            >
              ← Go Back
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-600 to-green-500 text-white py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold mb-2">{categoryIcon} {categoryName}</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-6">
            {/* Products Section */}
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Products</h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:border-teal-600 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 font-semibold"
                >
                  <option value="featured">Sort by: Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {sortedProducts.length > 0 ? (
                <div className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                  {sortedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-12 text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-bold mb-2">No products found</h3>
                  <p className="text-gray-900 font-bold mb-4">Try browsing other categories</p>
                  <Link href="/" className="inline-block bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-800">Back to Home</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}

// Force Vercel redeploy - Feb 12 2026

