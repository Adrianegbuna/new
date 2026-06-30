import { useEffect, useRef } from 'react'

interface ComingSoonToastProps {
  visible: boolean
  message?: string
  onClose: () => void
}

export default function ComingSoonToast({
  visible,
  message = 'Coming soon',
  onClose,
}: ComingSoonToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onClose()
    }, 2600)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[2147483645] flex items-center justify-center pointer-events-none p-4">
      <div className="w-auto max-w-[92vw] rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-xl pointer-events-auto">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
          i
        </span>
        <div>
          <p className="text-sm font-bold text-gray-900">Pay Small Small</p>
          <p className="text-sm font-semibold text-gray-700">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="ml-1 text-gray-500 hover:text-gray-700 font-bold"
        >
          x
        </button>
      </div>
      </div>
    </div>
  )
}
