import '../styles/global.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ThemeProvider } from 'next-themes'
import { CartProvider } from '../context/CartContext'
import { CurrencyProvider } from '../context/CurrencyContext'
import { NotificationProvider } from '../context/NotificationContext'
import ErrorBoundary from '../components/ErrorBoundary'
import CalculatorButton from '../components/CalculatorButton'
import ChatWidget from '../components/ChatWidget'
import AdminLiveChatNotifier from '../components/AdminLiveChatNotifier'
import CookieConsent from '../components/CookieConsent'
import GlobalCartToast from '../components/GlobalCartToast'
import GlobalAppToast from '../components/GlobalAppToast'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { bugTracker } from '../lib/bugTracker'
import { performanceMonitor } from '../lib/performanceMonitor'

// Lazy load polyfills only on client side
const loadPolyfills = async () => {
  if (typeof window !== 'undefined') {
    const { setupCSSVariableFallbacks, setupPerformanceMonitoring, getBrowserInfo } = await import('../lib/polyfills')
    setupCSSVariableFallbacks()
    setupPerformanceMonitoring()
    
    if (process.env.NODE_ENV === 'development') {
      const browserInfo = getBrowserInfo()
      console.log('[Browser Info]', browserInfo)
    }
  }
}

function InitializeApp() {
  const [swRegistered, setSwRegistered] = useState(false)

  useEffect(() => {
    const originalAlert = typeof window !== 'undefined' ? window.alert : null

    if (typeof window !== 'undefined') {
      window.alert = (message?: any) => {
        const detail = { message: String(message ?? 'Notice'), variant: 'info' as const }
        window.dispatchEvent(new CustomEvent('app:toast', { detail }))
      }
    }

    // Initialize polyfills and compatibility features
    loadPolyfills().catch(err => console.error('[Polyfills]', err))

    // Paystack Inline API is loaded on-demand via paystackLoader.ts
    // No global script loading needed - prevents duplicate script conflicts

    const handleError = (event: ErrorEvent) => {
      if (event.message && (event.message.includes('payment') || event.message.includes('checkout'))) {
        console.error('[GLOBAL] Payment error:', event.message)
        // Don't crash the app, just log
      }
    }

    window.addEventListener('error', handleError)

    // Initialize bug tracking and performance monitoring
    if (bugTracker) {
      // Try to set user info if available
      try {
        const userCookie = document.cookie
          .split('; ')
          .find((row) => row.startsWith('user='))
        if (userCookie) {
          const user = JSON.parse(decodeURIComponent(userCookie.split('=')[1]))
          bugTracker.setUser(user.id, user.email, user.role)
        }
      } catch (e) {
        // User not logged in yet
      }
    }

    return () => {
      window.removeEventListener('error', handleError)
      if (typeof window !== 'undefined' && originalAlert) {
        window.alert = originalAlert
      }
    }

    // Initialize location to Nigeria/Lagos if not set
    if (typeof window !== 'undefined') {
      const savedLocation = localStorage.getItem('renewablezmart_location')
      if (!savedLocation) {
        localStorage.setItem('renewablezmart_location', JSON.stringify({ country: 'Nigeria', city: 'Lagos' }))
        // Dispatch custom event to notify components of location initialization
        window.dispatchEvent(new Event('locationChanged'))
      }
    }
  }, [])

  // Register Service Worker for PWA support (production only)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      // Add a small delay to allow page to fully load first
      const timeout = setTimeout(() => {
        navigator.serviceWorker
          .register('/service-worker.js', { scope: '/' })
          .then((registration) => {
            console.log('[PWA] Service Worker registered:', registration)
            setSwRegistered(true)
            
            // Check for updates periodically
            const updateInterval = setInterval(() => {
              registration.update().catch(err => {
                console.log('[PWA] Update check failed:', err)
              })
            }, 60000) // Check every minute
            
            // Cleanup interval on unmount
            return () => clearInterval(updateInterval)
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration failed:', {
              message: error.message,
              name: error.name,
              stack: error.stack
            })
            // Service Worker is not critical for app functionality
            // Continue without it if registration fails
          })
      }, 2000) // 2 second delay

      // Listen for controller change to notify user of updates
      const controllerChangeListener = () => {
        console.log('[PWA] New Service Worker activated')
        // Optionally show notification to user
      }
      navigator.serviceWorker.addEventListener('controllerchange', controllerChangeListener)

      // Cleanup
      return () => {
        clearTimeout(timeout)
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeListener)
      }
    }
  }, [])

  return null
}

export default function App({ Component, pageProps }: AppProps) {
  const { token, user, isHydrated } = useAuthStore()
  const [showQuickActions, setShowQuickActions] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const splashSeen = window.sessionStorage.getItem('rz_splash_seen') === '1'
    if (splashSeen) {
      setShowSplash(false)
      return
    }

    window.sessionStorage.setItem('rz_splash_seen', '1')
    const showMs = 3000
    const fadeMs = 350

    const fadeTimer = window.setTimeout(() => {
      setSplashFading(true)
    }, showMs)

    const hideTimer = window.setTimeout(() => {
      setShowSplash(false)
    }, showMs + fadeMs)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    let timeoutId: number | null = null

    // Guests always see quick actions.
    if (!token) {
      setShowQuickActions(true)
      return
    }

    // Logged-in users see quick actions for 60 seconds on app launch/login.
    setShowQuickActions(true)
    timeoutId = window.setTimeout(() => {
      setShowQuickActions(false)
    }, 60000)

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [token, isHydrated])

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ErrorBoundary>
        <CurrencyProvider>
          <CartProvider>
            <NotificationProvider>
              <InitializeApp />
              <Component {...pageProps} />
              <GlobalCartToast />
              <GlobalAppToast />
              <CalculatorButton visible={showQuickActions} />
              {!isAdmin && <ChatWidget />}
              {isAdmin && <AdminLiveChatNotifier />}
              <CookieConsent />
              {showSplash && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2147483647,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle at 20% 20%, rgba(76, 201, 240, 0.16), transparent 34%), radial-gradient(circle at 80% 10%, rgba(45, 212, 191, 0.20), transparent 36%), linear-gradient(135deg, #0b1f3a 0%, #0a3a4d 48%, #0f766e 100%)',
                    backgroundSize: '180% 180%',
                    animation: 'rzSplashBg 8s ease-in-out infinite',
                    transition: 'opacity 350ms ease',
                    opacity: splashFading ? 0 : 1,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      padding: '20px 24px',
                      borderRadius: '24px',
                      background: 'rgba(8, 51, 71, 0.42)',
                      border: '1px solid rgba(173, 216, 230, 0.45)',
                      boxShadow: '0 14px 34px rgba(2, 8, 23, 0.28)',
                    }}
                  >
                    <div
                      style={{
                        width: 'min(92vw, 1120px)',
                        maxWidth: '100%',
                        textAlign: 'center',
                        fontFamily: "'Segoe UI', Arial, sans-serif",
                        textRendering: 'optimizeLegibility',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'baseline',
                          gap: '0.02em',
                          fontWeight: 800,
                          fontSize: 'clamp(42px, 7.6vw, 132px)',
                          lineHeight: 1,
                          letterSpacing: '-0.03em',
                          color: '#e8f3ff',
                          textShadow: '0 2px 14px rgba(3, 12, 30, 0.55)',
                        }}
                      >
                        <span style={{ color: '#dcecff' }}>Renewable</span>
                        <span style={{ color: '#4fd9c4', textShadow: '0 2px 14px rgba(8, 70, 66, 0.35)' }}>Zmart</span>
                      </div>
                      <div
                        style={{
                          marginTop: '8px',
                          fontWeight: 700,
                          fontSize: 'clamp(14px, 1.75vw, 44px)',
                          lineHeight: 1.2,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: '#d6f4ff',
                        }}
                      >
                        Simplifying The Clean Energy Market
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </NotificationProvider>
          </CartProvider>
        </CurrencyProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}



