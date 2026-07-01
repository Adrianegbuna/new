import type { CatalogProduct } from '@/types'
import StandardProductCard from './StandardProductCard'

interface ProductCardProps {
  product: CatalogProduct
  showVisitStore?: boolean
  showDescription?: boolean
}

export default function ProductCard({ product, showVisitStore = true, showDescription = false }: ProductCardProps) {
  const anyProduct = product as any
  const storeSlug = anyProduct.store?.slug || anyProduct.storeSlug
  const storeId = anyProduct.store?.id || anyProduct.store?.storeId || anyProduct.store_id || anyProduct.storeId

  return (
    <StandardProductCard
      product={{
        id: String(product.id || '').trim(),
        title: product.title || 'Product',
        price: Number(product.price || 0),
        image: product.image || '',
        storeName: product.storeName,
        storeHref: storeSlug ? `/store/${storeSlug}` : '/stores',
        storeSlug: storeSlug ? String(storeSlug) : undefined,
        storeId: storeId ? String(storeId) : undefined,
        category: product.category,
        stock: Number(product.stock || 0),
        description: product.description,
        rating: product.rating,
        ratingCount: (product as any).ratingCount ?? (product as any).reviewsCount ?? (product as any).reviewCount ?? 0,
        showVisitStore,
        showDescription,
      }}
    />
  )
}
