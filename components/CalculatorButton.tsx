import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface CalculatorButtonProps {
  visible?: boolean
}

export default function CalculatorButton({ visible = true }: CalculatorButtonProps) {
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const onScrollActivity = () => {
      setIsScrolling(true)
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false)
      }, 220)
    }

    window.addEventListener('scroll', onScrollActivity, { passive: true })
    window.addEventListener('touchmove', onScrollActivity, { passive: true })
    window.addEventListener('wheel', onScrollActivity, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScrollActivity)
      window.removeEventListener('touchmove', onScrollActivity)
      window.removeEventListener('wheel', onScrollActivity)
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Link
      href="/calculator"
      className={`fixed bottom-6 left-6 w-14 h-14 rounded-full bg-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] hover:shadow-[0_14px_36px_rgba(15,23,42,0.24)] flex items-center justify-center transition transform hover:scale-105 z-[2147483647] border border-orange-200/70 ${
        !visible || isScrolling ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100'
      }`}
      aria-label="Open load calculator"
      title="Open load calculator"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
          <rect x="8" y="6.5" width="8" height="3.5" rx="0.8" />
          <circle cx="9" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="12" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="9" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="15" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      </span>
    </Link>
  )
}
