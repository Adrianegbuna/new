import { useEffect, useRef, useState } from 'react'

type ToastVariant = 'info' | 'success' | 'error'

interface ToastPayload {
  message: string
  variant?: ToastVariant
}

export default function GlobalAppToast() {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [variant, setVariant] = useState<ToastVariant>('info')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ToastPayload>
      const payload = customEvent.detail
      if (!payload?.message) return

      setMessage(String(payload.message))
      setVariant(payload.variant || 'info')
      setVisible(true)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        setVisible(false)
      }, 3200)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('app:toast', handler as EventListener)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:toast', handler as EventListener)
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  if (!visible || !message) return null

  const variantStyles =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : variant === 'error'
        ? 'border-red-200 bg-red-50 text-red-900'
        : 'border-slate-200 bg-white text-slate-900'

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center pointer-events-none p-4">
      <div className={`max-w-[92vw] rounded-xl border px-4 py-3 shadow-xl pointer-events-auto ${variantStyles}`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-sm font-bold">Notice</span>
          <p className="text-sm font-semibold leading-relaxed">{message}</p>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Dismiss notification"
            className="ml-1 text-sm font-bold opacity-70 hover:opacity-100"
          >
            x
          </button>
        </div>
      </div>
    </div>
  )
}
