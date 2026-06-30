import { useEffect, useRef, useState } from 'react'
import { openLiveChatPopup } from '@/lib/liveChat'

interface LiveChatButtonProps {
  visible?: boolean
}

export default function LiveChatButton({ visible = true }: LiveChatButtonProps) {
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
    <button
      type="button"
      onClick={openLiveChatPopup}
      className={`fixed bottom-6 right-6 w-16 h-16 rounded-full bg-emerald-500 shadow-[0_14px_34px_rgba(5,150,105,0.35)] hover:shadow-[0_18px_40px_rgba(5,150,105,0.45)] flex items-center justify-center transition transform hover:scale-105 z-[2147483647] border-2 border-emerald-200 ${
        !visible || isScrolling ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100'
      }`}
      aria-label="Open live chat"
      title="Open live chat"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 14a7 7 0 0 1-7 7H8l-5 3V7a4 4 0 0 1 4-4h7a7 7 0 0 1 7 7z" />
      </svg>
    </button>
  )
}
