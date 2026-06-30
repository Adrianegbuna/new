import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useCart } from '../context/CartContext'

export default function GlobalCartToast() {
  const { toast, dismissToast, undoLastAdd } = useCart()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!toast.visible) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      dismissToast()
    }, 3200)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [toast.visible, toast.message, dismissToast])

  if (!toast.visible || !toast.message) return null

  return (
    <div className="fixed inset-0 z-[2147483645] flex items-center justify-center pointer-events-none p-4">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 max-w-[92vw] pointer-events-auto">
      <span className="text-sm font-semibold whitespace-nowrap">{toast.message}</span>
      {toast.itemId && (
        <button
          type="button"
          onClick={undoLastAdd}
          className="text-xs font-bold text-amber-300 hover:text-amber-200"
        >
          Undo
        </button>
      )}
      <Link href="/cart" className="text-xs font-bold text-amber-300 hover:text-amber-200">
        View Cart
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismissToast}
        className="text-white/70 hover:text-white text-sm"
      >
        ✕
      </button>
      </div>
    </div>
  )
}
