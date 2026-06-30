import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../../components/Header'
import { useCurrency } from '../../context/CurrencyContext'
import { useCart } from '../../context/CartContext'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'
import { buildOrderSuccessEmail, sendEmailNotification } from '@/lib/notify'
import { useNotifications } from '@/context/NotificationContext'

export default function PaymentCallback() {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { clearCart } = useCart()
  const { user } = useAuthStore()
  const { addNotification } = useNotifications()
  const { reference } = router.query
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [paymentData, setPaymentData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [autoRedirectSeconds, setAutoRedirectSeconds] = useState<number>(5)
  const [emailQueued, setEmailQueued] = useState(false)

  useEffect(() => {
    if (reference) {
      verifyPayment(reference as string)
    }
  }, [reference])

  useEffect(() => {
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        setStatus('failed')
        setErrorMessage('Payment verification timeout. Please check your order status.')
      }
    }, 30000) // 30 second timeout

    return () => clearTimeout(timeout)
  }, [status])

  useEffect(() => {
    if (status !== 'success' || !paymentData || emailQueued) return

    const email = user?.email || paymentData?.customer?.email || paymentData?.email
    if (!email) {
      setEmailQueued(true)
      return
    }

    const orderId = paymentData?.orderId || paymentData?.reference || ''
    const emailPayload = buildOrderSuccessEmail({
      customerName: user?.firstName || paymentData?.customer?.firstName,
      orderId,
      orderTotal: formatPrice(paymentData?.amount || 0),
      reviewUrl: `${window.location.origin}/orders`,
      refundUrl: `${window.location.origin}/returns`,
    })

    sendEmailNotification({
      ...emailPayload,
      to: email,
    }).finally(() => {
      addNotification({
        userId: user?.id || 'guest',
        type: 'review',
        title: 'Thanks for your purchase!',
        message: 'Your order is confirmed. Leave a review or request a refund anytime.',
        read: false,
        actionUrl: '/orders',
        icon: '⭐',
        color: 'purple',
      })
      setEmailQueued(true)
    })
  }, [status, paymentData, emailQueued, user, formatPrice, addNotification])

  // Auto-redirect to orders page after successful payment
  useEffect(() => {
    if (status === 'success') {
      const redirectTimer = setInterval(() => {
        setAutoRedirectSeconds(prev => {
          if (prev <= 1) {
            clearInterval(redirectTimer)
            router.push('/orders')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(redirectTimer)
    }
  }, [status, router])

  const verifyPayment = async (ref: string) => {
    try {
      const apiBase = getApiBaseUrl()
      console.log('[CALLBACK] Verifying payment with reference:', ref)
      console.log('[CALLBACK] API Base URL:', apiBase)
      
      // Call the verify endpoint - this is now a public endpoint (no auth required)
      const response = await fetch(`${apiBase}/payments/verify/${ref}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const data = await response.json()

      console.log('[CALLBACK] Payment verification response status:', response.status)
      console.log('[CALLBACK] Payment verification response:', data)

      // Check if response is successful
      if (!response.ok) {
        console.log('[CALLBACK] ✗ HTTP error:', response.status)
        setStatus('failed')
        setErrorMessage(data.message || `HTTP ${response.status}: ${response.statusText}`)
        return
      }

      // Check if payment verification succeeded
      // IMPORTANT: Backend returns data.status (not data.data.status)
      if (data.status === true && data.data && data.data.status === 'success') {
        console.log('[CALLBACK] ✓ Payment verified successfully')
        console.log('[CALLBACK] Payment status from backend:', data.data.status)
        setStatus('success')
        setPaymentData(data.data)
        
        // Professional cart clearing with verification
        await clearCartSecurely()
      } else {
        // Payment was not successful
        console.log('[CALLBACK] ✗ Payment verification indicated non-success status')
        console.log('[CALLBACK] Backend response status:', data.status)
        console.log('[CALLBACK] Payment data status:', data.data?.status)
        setStatus('failed')
        setErrorMessage(data.message || 'Payment verification returned non-success status')
      }
    } catch (error) {
      console.error('[CALLBACK] ✗ Verification error:', error)
      setStatus('failed')
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred during verification')
    }
  }

  /**
   * Clear cart from all storage mechanisms with verification
   * Uses multiple strategies to ensure complete clearance
   */
  const clearCartSecurely = async () => {
    try {
      console.log('[CALLBACK] 🛒 Cart clearing started...')
      
      // Step 1: Clear all storage keys immediately
      if (typeof window !== 'undefined') {
        localStorage.removeItem('renewablezmart_cart')
        sessionStorage.removeItem('renewablezmart_cart')
        clearCart() // React context
        
        // Step 2: Wait for state processing
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Step 3: Verify clearing was successful
        const lsCart = localStorage.getItem('renewablezmart_cart')
        const ssCart = sessionStorage.getItem('renewablezmart_cart')
        
        if (lsCart === null && ssCart === null) {
          console.log('[CALLBACK] ✅ CART FULLY CLEARED')
        } else {
          // Fallback: Force clear all storage
          console.warn('[CALLBACK] ⚠️ Forcing complete storage clear...')
          Object.keys(localStorage).forEach(key => {
            if (key.includes('cart') || key.includes('Cart')) {
              localStorage.removeItem(key)
            }
          })
          Object.keys(sessionStorage).forEach(key => {
            if (key.includes('cart') || key.includes('Cart')) {
              sessionStorage.removeItem(key)
            }
          })
          console.log('[CALLBACK] ✅ CART FULLY CLEARED (forced)')
        }
      }
    } catch (error) {
      console.error('[CALLBACK] ✗ Error clearing cart:', error)
      // Don't block success - payment was verified successfully
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Payment Status - RenewableZmart</title>
      </Head>
      <Header />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {status === 'loading' && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
              <p className="text-gray-900 font-bold">Please wait while we confirm your payment</p>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-green-600 mb-4">Payment Successful!</h2>
              <p className="text-black mb-6">Thank you for your purchase</p>
              
              {paymentData && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-semibold mb-3">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-black">Reference:</span>
                      <span className="font-medium">{paymentData.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Amount:</span>
                      <span className="font-medium">{formatPrice(paymentData.amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Channel:</span>
                      <span className="font-medium capitalize">{paymentData.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Date:</span>
                      <span className="font-medium">{new Date(paymentData.paidAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-semibold">
                  ✓ Redirecting to your orders in {autoRedirectSeconds} seconds...
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => router.push('/orders')}
                  className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700"
                >
                  View Orders Now
                </button>
                <Link href="/" className="bg-gray-400 text-gray-900 font-bold px-6 py-3 rounded-lg hover:bg-gray-500">
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-3xl font-bold text-red-600 mb-4">Payment Verification Failed</h2>
              <p className="text-black mb-2">
                We couldn't verify your payment. Please try again or contact support if you were charged.
              </p>
              {errorMessage && (
                <p className="text-sm text-black bg-gray-50 p-3 rounded mb-6 font-mono">
                  Error: {errorMessage}
                </p>
              )}
              
              <div className="flex gap-3 justify-center">
                <Link href="/cart" className="bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-900">
                  Back to Cart
                </Link>
                <Link href="/orders" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600">
                  Check Orders
                </Link>
                <Link href="/" className="bg-gray-400 text-gray-900 font-bold px-6 py-3 rounded-lg hover:bg-gray-500">
                  Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




