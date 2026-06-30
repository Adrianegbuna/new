import Header from '../components/Header'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getApiBaseUrl, getBackendBaseUrl } from '@/lib/apiConfig'
import { PaystackPaymentService } from '@/lib/paystackService'
import { loadPaystack } from '@/lib/paystackLoader'
import ComingSoonToast from '../components/ComingSoonToast'

export default function Cart() {
  const router = useRouter()
  const { cart, removeFromCart, clearCart, updateQty } = useCart()
  const { formatPrice } = useCurrency()
  const { user, token, isHydrated } = useAuthStore()
  const [processingPayment, setProcessingPayment] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [showComingSoon, setShowComingSoon] = useState(false)
  
  // Installment payment states
  const [paymentOption, setPaymentOption] = useState<'full' | 'installment'>('full')
  const [showInstallmentForm, setShowInstallmentForm] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    employmentStatus: '',
    monthlyIncome: '',
    organization: '',
    bvn: '',
    nin: '',
    autoDebitConsent: true,
  })
  const needsAddressUpdate = Boolean(isHydrated && user && (!user.address || !user.address.trim()))

  // Preload Paystack when page opens (fire and forget)
  useEffect(() => {
    loadPaystack().catch(() => {
      console.warn('[CART] Paystack preload failed, will retry on payment')
    })
  }, [])

  // CartContext is the single source of truth for cart persistence.
  
  const total = cart.reduce((s, p) => s + p.price * p.qty, 0)
  // FREE shipping within user's location
  const shipping = 0
  const finalTotal = Math.max(0, total + shipping)

  const resolveCartImage = (item: any) => {
    const raw =
      item?.image ||
      item?.images?.[0] ||
      item?.mediaUrl ||
      item?.thumbnail ||
      item?.photoUrl ||
      ''
    if (!raw) return null
    if (raw.startsWith('http') || raw.startsWith('data:')) return raw
    const base = getBackendBaseUrl()
    return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`
  }

  /**
   * Safe cart clearing - clear storage first, then React state
   * Protected from autosave race conditions
   */
  const clearCartSecurely = () => {
    console.log('[CART] 📎 Clearing cart securely...')
    setIsClearing(true)

    // Clear storage first
    try {
      localStorage.removeItem('renewablezmart_cart')
      sessionStorage.removeItem('renewablezmart_cart')
      console.log('[CART] Storage cleared')
    } catch (e) {
      console.warn('[CART] 📎 Storage clear failed:', e)
    }

    // Then clear React state
    clearCart()
    console.log('[CART] Cart state cleared')

    // Unblock autosave
    setTimeout(() => {
      setIsClearing(false)
    }, 100)
  }


  const handlePayment = async () => {
    // Validation checks
    if (!isHydrated) {
      alert('Please wait while the page loads...')
      return
    }

    if (!user) {
      alert('Please login to complete your purchase')
      router.push('/login')
      return
    }

    if (!token) {
      alert('Session expired. Please login again.')
      router.push('/login')
      return
    }

    if (cart.length === 0) {
      alert('Your cart is empty')
      return
    }

    if (!user.email || !user.email.includes('@')) {
      alert('Invalid email address. Please update your profile.')
      return
    }

    if (finalTotal <= 0) {
      alert('Invalid cart total')
      return
    }

    setProcessingPayment(true)

    try {
      console.log('[CART-PAYMENT] 🚚 Starting payment process...')

      // Prepare payment data
      const paymentData = {
        amount: finalTotal,
        email: user.email,
        metadata: {
          cart_items: cart.map(item => ({
            productId: item.id,
            name: item.title,
            quantity: item.qty,
            price: item.price,
            image: item.image
          })),
          customer_name: `${user.firstName} ${user.lastName}`,
          shipping_amount: shipping,
          shipping_address: user.address || 'Not provided',
          referralCode: referralCode.trim().toUpperCase() || undefined
        }
      }

      const apiBase = getApiBaseUrl()
      console.log('[CART-PAYMENT] 🔐 Initializing payment with backend...')

      // Initialize payment with backend
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${apiBase}/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Server error: ${response.status}`)
      }

      const initData = await response.json()
      console.log('[CART-PAYMENT] Backend initialized payment')

      // ✅ NEW FLOW: Only reference required (NOT orderId - created after payment)
      if (!initData.status || !initData.data?.reference) {
        throw new Error('Invalid payment initialization response from server')
      }

      const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
      if (!publicKey) {
        throw new Error('Paystack public key not configured')
      }

      console.log('[CART-PAYMENT] 💳 Opening Paystack payment dialog...')

      // Open Paystack payment dialog
      await PaystackPaymentService.initializePayment({
        publicKey,
        amount: finalTotal,
        email: user.email,
        reference: initData.data.reference,
        // orderId: will be received from verify endpoint after payment succeeds
        customerName: `${user.firstName} ${user.lastName}`,
        onSuccess: async (reference: string) => {
          console.log('[CART-PAYMENT] Payment successful, reference:', reference)
          
          try {
            // Verify payment with backend
            console.log('[CART-PAYMENT] ✅ Verifying payment...')
            const verifyResponse = await fetch(`${apiBase}/payments/verify/${reference}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            })

            const verifyData = await verifyResponse.json()
            console.log('[CART-PAYMENT] Backend response:', verifyData)

            if (!verifyResponse.ok || !verifyData.status) {
              throw new Error(verifyData.message || 'Payment verification failed')
            }

            console.log('[CART-PAYMENT] Payment verified successfully')

            // Clear cart ONLY after backend verification succeeds
            console.log('[CART-PAYMENT] 📎 Clearing cart...')
            clearCartSecurely()

            console.log('[CART-PAYMENT] Cart cleared, redirecting...')
            // ✅ NEW: Get orderId from verify response (created after payment)
            const orderId = verifyData.data?.orderId || reference
            router.push(`/payment/callback?reference=${reference}&orderId=${orderId}&status=success`)
          } catch (verifyError: any) {
            console.error('[CART-PAYMENT] Verification error:', verifyError)
            setProcessingPayment(false)
            alert('Payment verification failed: ' + (verifyError.message || 'Unknown error'))
          }
        },
        onError: (error: any) => {
          console.error('[CART-PAYMENT] Payment error:', error)
          setProcessingPayment(false)
          
          if (error.type === 'PAYMENT_CANCELLED') {
            alert('Payment was cancelled')
          } else {
            alert(`Payment error: ${error.message}`)
          }
        }
      })
    } catch (error: any) {
      console.error('[CART-PAYMENT] Payment initialization error:', error)
      setProcessingPayment(false)
      
      // Handle specific errors
      if (error.name === 'AbortError') {
        alert('Payment initialization is taking too long. Please check your internet connection and try again.')
      } else if (error.message?.includes('Invalid or expired token') || error.message?.includes('401')) {
        alert('Your session has expired. Please login again.')
        router.push('/login')
      } else {
        alert(error.message || 'Failed to process payment. Please try again.')
      }
    }
  }
  
  // Check if cart contains installment-eligible products
  const normalizeText = (value: unknown) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const installmentKeywords = [
    'solar panel',
    'solar panels',
    'inverter',
    'inverters',
    'battery',
    'batteries'
  ]

  const evKeywords = [
    'electric vehicle',
    'electric vehicles',
    'ev',
    'vehicle',
    'vehicles',
    'car',
    'cars',
    'bike',
    'bikes',
    'scooter',
    'scooters',
    'motorcycle',
    'motorcycles',
    'tricycle',
    'tricycles'
  ]

  const isInstallmentEligibleItem = (item: any) => {
    const category = normalizeText(item?.category || '')
    const title = normalizeText(item?.title || '')
    const haystack = `${category} ${title}`
    const hasSolarPanelPhrase = haystack.includes('solar panel') || haystack.includes('solar panels')
    const hasInverterPhrase = haystack.includes('inverter') || haystack.includes('inverters')
    const hasBatteryPhrase = haystack.includes('battery') || haystack.includes('batteries')
    return installmentKeywords.some((keyword) => haystack.includes(keyword)) && (hasSolarPanelPhrase || hasInverterPhrase || hasBatteryPhrase)
  }

  const isEvItem = (item: any) => {
    const haystack = normalizeText(`${item?.category || ''} ${item?.title || ''} ${item?.description || ''}`)
    return evKeywords.some((keyword) => haystack.includes(keyword))
  }

  const isSwapOrTradeInItem = (item: any) => {
    const id = String(item?.id || '').toLowerCase()
    if (id.startsWith('resale-') || id.startsWith('tradein-')) return true
    const haystack = normalizeText(`${item?.category || ''} ${item?.title || ''} ${item?.description || ''}`)
    return haystack.includes('resale') || haystack.includes('trade in') || haystack.includes('tradein')
  }

  const isFlashDealItem = (item: any) => {
    if (item?.isFlashDeal || item?.packageType || item?.packageId) return true
    const haystack = normalizeText(`${item?.category || ''} ${item?.title || ''} ${item?.description || ''}`)
    return haystack.includes('flash deal') || haystack.includes('flash')
  }

  const hasEvItems = cart.some((item) => isEvItem(item))
  const hasSwapTradeInItems = cart.some((item) => isSwapOrTradeInItem(item))
  const hasFlashDealItems = cart.some((item) => isFlashDealItem(item))
  const hasRestrictedItems = hasEvItems || hasSwapTradeInItems || hasFlashDealItems
  const hasEligibleProducts = !hasRestrictedItems && cart.some((item) => isInstallmentEligibleItem(item))

  useEffect(() => {
    if (hasRestrictedItems && paymentOption === 'installment') {
      setPaymentOption('full')
    }
  }, [hasRestrictedItems, paymentOption])
  
  const handlePaymentOptionChange = (option: 'full' | 'installment') => {
    if (option === 'installment') {
      setShowComingSoon(true)
      setPaymentOption('full')
      setShowInstallmentForm(false)
      return
    }
    setPaymentOption(option)
  }


  // Calculate installment details
  const firstPayment = finalTotal * 0.5
  const balance = finalTotal - firstPayment
  const months = finalTotal >= 750000 && finalTotal <= 1500000 ? 3 : 6
  const monthlyPayment = balance / months

  const handleInstallmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const authToken = token || storedToken
    if (!authToken) {
      alert('Please login to submit application')
      window.location.href = '/login'
      return
    }

    setProcessingPayment(true)

    try {
      const apiBase = getApiBaseUrl()
      if (!formData.autoDebitConsent) {
        alert('Please consent to monthly card debits to continue.')
        setProcessingPayment(false)
        return
      }

      const response = await fetch(`${apiBase}/installments/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          ...formData,
          totalAmount: finalTotal,
          firstPayment,
          monthlyPayment,
          months,
          autoDebit: true,
          debitStart: 'after_first_payment',
          debitStartDelayDays: 30,
          cartItems: cart.map(item => ({
            productId: item.id,
            name: item.title,
            quantity: item.qty,
            price: item.price,
            category: item.category,
            image: item.image
          }))
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit application')
      }

      alert('Application submitted successfully. Admin will review it first. Once approved, go to My Applications to pay 50% and activate monthly auto-debit.')
      setShowInstallmentForm(false)
      clearCart()
      setTimeout(() => {
        window.location.href = '/account?tab=applications'
      }, 1500)
    } catch (error: any) {
      console.error('Submit application error:', error)
      alert(error.message || 'Failed to submit application. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Head>
        <title>Shopping Cart - RenewableZmart</title>
      </Head>
      <Header />
      
      {/* Paystack is loaded globally in _document.tsx */}

      <main className="container mx-auto px-4 py-8">
        {needsAddressUpdate && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold">
                Please update your delivery address before checkout.
              </p>
              <Link href="/account-details" className="inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                Update Address
              </Link>
            </div>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-4 text-black">Your cart is empty</h2>
            <p className="text-black font-bold mb-6">Start shopping for sustainable energy products!</p>
            <Link href="/" className="bg-slate-900 text-white px-6 py-3 rounded-lg inline-block hover:bg-slate-950">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 space-y-3 lg:space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 shadow">
                  <img 
                    src={resolveCartImage(item) || 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"%3E%3Crect fill=\"%23ddd\" width=\"100\" height=\"100\"/%3E%3Ctext fill=\"%23999\" x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dy=\".3em\"%3ENo Image%3C/text%3E%3C/svg%3E'} 
                    alt={item.title} 
                    className="w-20 sm:w-24 h-20 sm:h-24 object-cover rounded flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"%3E%3Crect fill=\"%23ddd\" width=\"100\" height=\"100\"/%3E%3Ctext fill=\"%23999\" x=\"50%25\" y=\"50%25\" text-anchor=\"middle\" dy=\".3em\"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-black dark:text-white mb-2">{item.title}</h3>
                    <div className="text-xl font-bold text-orange-500 price-inline">{formatPrice(item.price)}</div>
                    {item.eco && <div className="text-xs text-green-600 mt-1">🌿 Eco-Friendly Product</div>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} className="bg-gray-800 text-white px-3 py-1 sm:px-4 sm:py-2 rounded font-bold hover:bg-gray-900 transition text-sm sm:text-base">
                        -
                      </button>
                      <span className="font-bold w-8 text-center text-black">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} className="bg-gray-800 text-white px-3 py-1 sm:px-4 sm:py-2 rounded font-bold hover:bg-gray-900 transition text-sm sm:text-base">
                        +
                      </button>
                    </div>
                    <div className="font-bold text-black dark:text-white mb-2 price-inline">{formatPrice(item.price * item.qty)}</div>
                    <button className="text-red-500 text-sm hover:underline" onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={clearCart} className="text-red-500 hover:underline">
                Clear Cart
              </button>
            </div>

            <div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow sticky top-24">
                <h2 className="text-xl font-bold text-black dark:text-white mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between font-bold text-black dark:text-white">
                    <span>Subtotal ({cart.length} items)</span>
                    <span className="font-bold text-black dark:text-white price-inline">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between items-center group relative font-bold text-black dark:text-white">
                    <span className="flex items-center gap-1">
                      Shipping
                      <span className="text-xs text-black dark:text-white cursor-help" title="Click to learn more about this">ℹ️</span>
                    </span>
                    <div className="absolute bottom-full left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Free shipping within your location
                    </div>
                    <span className="font-semibold price-inline">{shipping === 0 ? <span className="text-green-600 font-bold">FREE</span> : formatPrice(shipping)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold text-black dark:text-white">
                    <span>Total</span>
                    <span className="text-slate-900 price-inline">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <h3 className="font-bold text-sm mb-2 text-black dark:text-white">Payment Option</h3>
                  <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition ${
                    paymentOption === 'full' 
                      ? 'border-2 border-slate-900 bg-slate-900' 
                      : 'border border-black hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="payment" checked={paymentOption === 'full'} onChange={() => handlePaymentOptionChange('full')} />
                    <div className="flex-1">
                      <div className={`font-bold ${paymentOption === 'full' ? 'text-white' : 'text-black dark:text-white'}`}>Pay Full Amount</div>
                      <div className={`text-xs font-bold price-inline ${paymentOption === 'full' ? 'text-white' : 'text-black dark:text-white'}`}>{formatPrice(finalTotal)}</div>
                    </div>
                  </label>
                  {hasEligibleProducts ? (
                    <label className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition ${
                      paymentOption === 'installment' 
                        ? 'border-2 border-slate-900 bg-slate-900' 
                        : 'border border-black hover:bg-gray-50'
                    }`}>
                      <input type="radio" name="payment" checked={paymentOption === 'installment'} onChange={() => handlePaymentOptionChange('installment')} />
                      <div className="flex-1">
                        <div className={`font-bold flex items-center gap-2 ${paymentOption === 'installment' ? 'text-white' : 'text-black dark:text-white'}`}>
                          💳 Pay Small Small
                          <span className="bg-slate-950 text-white text-xs px-2 py-0.5 rounded">Popular</span>
                        </div>
                        <div className={`text-sm font-bold mt-1 ${paymentOption === 'installment' ? 'text-white' : 'text-black dark:text-white'}`}>
                          Pay 50% after approval (<span className="price-inline">{formatPrice(firstPayment)}</span>), then <span className="price-inline">{formatPrice(monthlyPayment)}</span>/month for {months} months. Auto-debit starts 30 days after first payment.
                        </div>
                      </div>
                    </label>
                  ) : (
                    <div className="p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                        <div className="font-bold text-black dark:text-white flex items-center gap-2">
                            💳 Pay Small Small
                            <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded">Not Available</span>
                          </div>
                          <div className="text-xs text-black dark:text-white font-bold mt-1">
                            {hasEvItems
                              ? 'Not available for Electric Vehicle products'
                              : hasSwapTradeInItems
                                ? 'Not available for Swap or Trade-In items'
                                : hasFlashDealItems
                                  ? 'Not available for Flash Deal items'
                                  : 'Only available for Inverters, Batteries, and Solar Panels'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {paymentOption === 'full' && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <label className="block text-sm font-bold text-emerald-800 mb-1">
                      Referral Code (First Purchase Only)
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (optional)"
                      className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                      Use on your first successful purchase. Your friend earns 1% commission.
                    </p>
                  </div>
                )}

                {paymentOption === 'full' ? (
                  <button 
                    onClick={handlePayment}
                    disabled={processingPayment}
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-950 mb-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingPayment ? 'Processing...' : 'Proceed to Checkout'}
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowComingSoon(true)
                      setPaymentOption('full')
                      setShowInstallmentForm(false)
                    }} 
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-950 mb-2 transition-colors relative z-10"
                  >
                    Coming soon
                  </button>
                )}
                <Link href="/" className="block text-center text-slate-900 font-semibold hover:underline">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {showInstallmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowInstallmentForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Pay Small Small Setup</h2>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowInstallmentForm(false)
                  }} 
                  className="text-3xl hover:text-black leading-none cursor-pointer"
                >
                  ?
                </button>
              </div>
              <p className="text-sm text-black dark:text-white font-semibold mt-2">Complete this form now. After approval, you will pay 50% and activate automatic monthly card debit.</p>
            </div>

            <form onSubmit={handleInstallmentSubmit} className="p-6">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6 text-white">
                <h3 className="font-bold mb-2">Payment Plan Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-bold price-inline">{formatPrice(finalTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>First Payment (50% today):</span>
                    <span className="font-bold price-inline">{formatPrice(firstPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Payment:</span>
                    <span className="font-bold price-inline">{formatPrice(monthlyPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-bold">{months} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Debit Start:</span>
                    <span className="font-bold">1 month after installation & approval</span>
                  </div>
                </div>
              </div>


              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-2">
                    Full Name *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={formData.fullName} 
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 text-black placeholder-gray-900 font-semibold ${
                      'focus:ring-orange-500'
                    }`}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Email Address *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="john@example.com" />
                </div>

                <div>
                  <label className="block font-semibold mb-2">
                    Phone Number *
                  </label>
                  <input 
                    type="tel" 
                    required 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 text-black placeholder-gray-900 font-semibold ${
                      'focus:ring-orange-500'
                    }`}
                    placeholder="08012345678"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Delivery Address *</label>
                  <textarea required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" rows={3} placeholder="Enter your full delivery address"></textarea>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Employment Status *</label>
                  <select required value={formData.employmentStatus} onChange={(e) => setFormData({...formData, employmentStatus: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 font-semibold">
                    <option value="">Select employment status</option>
                    <option value="employed">Employed</option>
                    <option value="self-employed">Self Employed</option>
                    <option value="business-owner">Business Owner</option>
                    <option value="civil-servant">Civil Servant</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Organization/Company Name *</label>
                  <input type="text" required value={formData.organization} onChange={(e) => setFormData({...formData, organization: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="ABC Company Ltd" />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Monthly Income Range *</label>
                  <select required value={formData.monthlyIncome} onChange={(e) => setFormData({...formData, monthlyIncome: e.target.value})} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 font-semibold">
                    <option value="">Select income range</option>
                    <option value="50-100k">50,000 - 100,000</option>
                    <option value="100-200k">100,000 - 200,000</option>
                    <option value="200-500k">200,000 - 500,000</option>
                    <option value="500k+">500,000+</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Bank Verification Number (BVN) *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.bvn} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                      setFormData({...formData, bvn: value})
                    }}
                    className={`w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 text-black placeholder-gray-900 font-semibold ${
                      'border-black focus:ring-orange-500'
                    }`}
                    placeholder="22123456789" 
                    maxLength={11}
                  />
                  <p className="text-xs text-black font-semibold mt-1">Enter your 11-digit BVN</p>
                </div>

                <div>
                  <label className="block font-semibold mb-2">National Identification Number (NIN) *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.nin} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                      setFormData({...formData, nin: value})
                    }}
                    className="w-full border border-black rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold"
                    placeholder="12345678901" 
                    maxLength={11}
                  />
                  <p className="text-xs text-black font-semibold mt-1">Enter your 11-digit National ID number</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-white font-semibold">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoDebitConsent}
                      onChange={(e) => setFormData({ ...formData, autoDebitConsent: e.target.checked })}
                      className="mt-1"
                    />
                    <span>
                      I authorize RenewableZmart to charge my card monthly for the installment plan.
                      Debits will begin one month after installation and approval.
                    </span>
                  </label>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-black font-semibold dark:text-gray-100">
                  <p className="font-semibold mb-2">📌 Note:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Our team will review your application within 24 hours</li>
                    <li>You may be required to provide additional documentation</li>
                    <li>Approval is subject to credit assessment</li>
                    <li>Monthly debits start one month after installation and approval</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowInstallmentForm(false)} className="flex-1 border-2 border-black text-black dark:text-white py-3 rounded-lg font-bold hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-900">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ComingSoonToast visible={showComingSoon} onClose={() => setShowComingSoon(false)} />

    </div>
  )
}




