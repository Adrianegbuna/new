import { useState, useEffect } from 'react'
import { setCookie, getCookie } from '@/lib/clientCookies'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already given consent
    const cookieConsent = getCookie('cookieConsent')
    if (!cookieConsent) {
      setShowBanner(true)
    }
  }, [])

  const handleAcceptAll = () => {
    // Set consent cookie for 1 year
    setCookie('cookieConsent', 'all', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    setCookie('analyticsConsent', 'true', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    setCookie('marketingConsent', 'true', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    setShowBanner(false)
  }

  const handleAcceptEssential = () => {
    // Set consent cookie for essential cookies only
    setCookie('cookieConsent', 'essential', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    setShowBanner(false)
  }

  const handleRejectAll = () => {
    // Explicitly reject non-essential cookies
    setCookie('cookieConsent', 'rejected', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    setCookie('analyticsConsent', 'false', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    setCookie('marketingConsent', 'false', {
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
    })
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 sm:p-6 shadow-lg z-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h3 className="text-lg sm:text-xl font-bold mb-2">🍪 Cookie Settings</h3>
          <p className="text-sm sm:text-base text-white font-semibold mb-3">
            We use cookies to enhance your experience, analyze traffic, and deliver personalized content. 
            Essential cookies are always enabled for security and functionality.
          </p>
          <ul className="text-xs sm:text-sm text-white space-y-1 mb-4 font-semibold">
            <li>✅ <strong>Essential Cookies:</strong> Authentication, security, and basic site functionality (always enabled)</li>
            <li>📊 <strong>Analytics Cookies:</strong> Help us understand how you use our site to improve your experience</li>
            <li>🎯 <strong>Marketing Cookies:</strong> Enable personalized content and targeted promotions</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <button
            onClick={handleRejectAll}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded transition text-sm sm:text-base"
          >
            Reject All
          </button>
          <button
            onClick={handleAcceptEssential}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded transition text-sm sm:text-base"
          >
            Essential Only
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition text-sm sm:text-base"
          >
            Accept All Cookies
          </button>
          <a
            href="/privacy-policy"
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 text-center text-emerald-400 hover:text-emerald-300 font-semibold underline text-sm sm:text-base"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  )
}
