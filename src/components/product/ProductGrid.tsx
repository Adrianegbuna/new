import React from 'react'
import type { CatalogProduct } from '@/types'
import ProductCard from './ProductCard'

interface ProductGridProps {
  products: CatalogProduct[]
  loading?: boolean
  hasMore?: boolean
  observerTarget?: React.RefObject<HTMLDivElement>
  isLoadingMore?: boolean
}

export default function ProductGrid({
  products,
  loading = false,
  hasMore = false,
  observerTarget,
  isLoadingMore = false,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600 ml-3">Loading products...</p>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return <div className="text-center py-12 text-gray-900 font-bold">No products found</div>
  }

  return (
    <>
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      <div ref={observerTarget} className="py-8 text-center">
        {isLoadingMore && products.length > 0 && (
          <div className="inline-flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-gray-600 ml-3">Loading more products...</p>
          </div>
        )}

        {null}
      </div>
    </>
  )
}
