import { createContext, useState, useContext, useEffect, ReactNode } from 'react'
import type { CatalogCartItem, CatalogProduct } from '../types'
import { triggerHaptic } from '../lib/haptics'

interface CartToastState {
  visible: boolean
  message: string
  itemId: string | null
  previousQty: number
}

interface CartContextValue {
  cart: CatalogCartItem[]
  addToCart: (product: CatalogProduct) => void
  removeFromCart: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  toast: CartToastState
  dismissToast: () => void
  undoLastAdd: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CatalogCartItem[]>([])
  const [isClient, setIsClient] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [hasInitializedCart, setHasInitializedCart] = useState(false)
  const [toast, setToast] = useState<CartToastState>({
    visible: false,
    message: '',
    itemId: null,
    previousQty: 0,
  })
  const normalizeStock = (value: unknown) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 0
    return Math.max(0, Math.floor(parsed))
  }

  useEffect(() => {
    setIsClient(true)
    const saved = typeof window !== 'undefined' ? localStorage.getItem('renewablezmart_cart') : null
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const sanitized = Array.isArray(parsed)
          ? parsed
              .map((item: any) => {
                const stock = normalizeStock(item?.stock)
                if (stock <= 0) return null
                const qty = Math.max(1, Math.min(Number(item?.qty || 1), stock))
                return { ...item, stock, qty }
              })
              .filter(Boolean)
          : []
        setCart(sanitized as CatalogCartItem[])
      } catch (e) {
        console.error('Error parsing cart from localStorage:', e)
        setCart([])
      }
    }
    setHasInitializedCart(true)
  }, [])

  useEffect(() => {
    if (isClient && hasInitializedCart && typeof window !== 'undefined' && !isClearing) {
      localStorage.setItem('renewablezmart_cart', JSON.stringify(cart))
    }
  }, [cart, isClient, hasInitializedCart, isClearing])

  function addToCart(product: CatalogProduct) {
    let added = false
    let previousQty = 0
    let nextItemId = ''
    setCart((prev) => {
      const stock = normalizeStock(product?.stock)
      if (stock <= 0) return prev
      const existing = prev.find((p) => p.id === product.id)
      nextItemId = String(product.id)
      previousQty = existing?.qty ?? 0
      if (existing) {
        if (existing.qty >= stock) return prev
        added = true
        return prev.map((p) => (p.id === product.id ? { ...p, stock, qty: Math.min(p.qty + 1, stock) } : p))
      }
      added = true
      return [...prev, { ...product, stock, qty: 1 }]
    })
    if (added) {
      triggerHaptic(25)
      setToast({
        visible: true,
        message: 'Added to cart',
        itemId: nextItemId,
        previousQty,
      })
    }
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((p) => p.id !== id))
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) return removeFromCart(id)
    setCart((prev) => {
      const next = prev
        .map((p) => {
          if (p.id !== id) return p
          const stock = normalizeStock(p.stock)
          if (stock <= 0) return null
          return { ...p, stock, qty: Math.max(1, Math.min(Math.floor(qty), stock)) }
        })
        .filter(Boolean)
      return next as CatalogCartItem[]
    })
  }

  function clearCart() {
    console.log('[CART] Clearing cart from all storage...')
    setIsClearing(true)
    // Clear React state FIRST
    setCart([])
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('renewablezmart_cart')
        sessionStorage.removeItem('renewablezmart_cart')
        console.log('[CART] ✓ Storage cleared')
      }
    } catch (e) {
      console.error('[CART] Error clearing storage:', e)
    }
    console.log('[CART] ✓ State cleared')
    // Reset clearing flag after a short delay to allow state updates
    setTimeout(() => setIsClearing(false), 500)
  }

  function dismissToast() {
    setToast((prev) => ({ ...prev, visible: false }))
  }

  function undoLastAdd() {
    if (!toast.itemId) return
    updateQty(toast.itemId, toast.previousQty)
    setToast({
      visible: true,
      message: 'Removed from cart',
      itemId: null,
      previousQty: 0,
    })
  }

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQty, clearCart, toast, dismissToast, undoLastAdd }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
