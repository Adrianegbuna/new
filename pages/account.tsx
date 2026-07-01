import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Header from "@/components/layout/Header";
import Head from 'next/head'
import Script from 'next/script'
import { useCurrency } from '@/context/CurrencyContext'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'
import ResaleForm from '@/components/forms/ResaleForm'
import TradeInForm from '@/components/forms/TradeInForm'

export default function Account() {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { user, token, isHydrated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [swapSubTab, setSwapSubTab] = useState<'resale' | 'tradein'>('resale')
  const [applications, setApplications] = useState<any[]>([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = useState('')
  const [selectedApplicationForPayment, setSelectedApplicationForPayment] = useState<any>(null)
  const [latestReceipt, setLatestReceipt] = useState<any>(null)
  const [resaleListings, setResaleListings] = useState<any[]>([])
  const [tradeInListings, setTradeInListings] = useState<any[]>([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<'resale' | 'tradein' | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editDeliveryOption, setEditDeliveryOption] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmType, setDeleteConfirmType] = useState<'resale' | 'tradein' | null>(null)

  const getPaymentStatus = (order: any) =>
    String(order?.paymentStatus || 'pending').toLowerCase()

  const getOrderStatus = (order: any) => {
    const normalized = String(order?.orderStatus || order?.status || 'pending').toLowerCase()
    const paymentStatus = getPaymentStatus(order)
    const hasShipmentProof = Boolean(order?.shippedAt || order?.trackingNumber || order?.markedForDelivery)
    const hasDeliveryProof = Boolean(order?.deliveredAt)

    if (normalized === 'delivered' && !hasDeliveryProof) {
      return hasShipmentProof ? 'shipped' : (paymentStatus === 'paid' || paymentStatus === 'completed' ? 'processing' : 'pending')
    }
    if (normalized === 'shipped' && !hasShipmentProof) {
      return paymentStatus === 'paid' || paymentStatus === 'completed' ? 'processing' : 'pending'
    }
    return normalized
  }

  useEffect(() => {
    // Wait for store to hydrate from localStorage
    if (!isHydrated) {
      return
    }

    if (!user || !token) {
      router.push('/login')
      return
    }

    setLoading(false)

    // Get tab from URL query
    const tab = router.query.tab as string
    if (tab) {
      setActiveTab(tab)
      if (tab === 'swap') {
        const subTab = (router.query.swapSubTab as string) || (router.query.subTab as string)
        if (subTab === 'tradein' || subTab === 'resale') {
          setSwapSubTab(subTab)
        }
      }
    }
  }, [router.query, isHydrated, user, token, router])

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications()
    }
    if (activeTab === 'swap') {
      fetchListings()
    }
    if (activeTab === 'orders') {
      fetchMyOrders()
    }
  }, [activeTab])

  async function fetchMyOrders() {
    setLoadingOrders(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/orders/my-orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setMyOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch personal orders:', error)
      setMyOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'applications') return
    if (!router.isReady) return
    const ref = router.query.reference || router.query.trxref
    if (typeof ref === 'string' && ref.length > 5) {
      verifyInstallmentReference(ref)
    }
  }, [activeTab, router.isReady, router.query.reference, router.query.trxref, token])

  async function fetchListings() {
    setLoadingListings(true)
    try {
      const apiBase = getApiBaseUrl()
      const headers = { 'Authorization': `Bearer ${token}` }
      
      // Fetch resale listings
      const resaleResponse = await fetch(`${apiBase}/resales/my-listings`, { headers })
      const resaleData = await resaleResponse.json()
      if (resaleData.success) {
        setResaleListings(resaleData.data || [])
      }
      
      // Fetch trade-in listings
      const tradeInResponse = await fetch(`${apiBase}/trade-ins/my-listings`, { headers })
      const tradeInData = await tradeInResponse.json()
      if (tradeInData.success) {
        setTradeInListings(tradeInData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error)
    } finally {
      setLoadingListings(false)
    }
  }

  async function fetchApplications() {
    setLoadingApplications(true)
    try {
      const apiBase = getApiBaseUrl()
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const authToken = token || storedToken
      const response = await fetch(`${apiBase}/installments/my-applications`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setApplications(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoadingApplications(false)
    }
  }

  async function handleEditListing(id: string, type: 'resale' | 'tradein') {
    try {
      const apiBase = getApiBaseUrl()
      const endpoint = type === 'resale' ? 'resales' : 'trade-ins'
      const priceField = type === 'resale' ? 'price' : 'estimatedPrice'
      const basePrice = parseFloat(editPrice)
      const quantity = parseInt(editQuantity, 10)

      if (!Number.isFinite(basePrice) || basePrice < 0) {
        alert('Please enter a valid price')
        return
      }
      if (!Number.isFinite(quantity) || quantity < 0) {
        alert('Please enter a valid stock quantity')
        return
      }
      
      const response = await fetch(`${apiBase}/${endpoint}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          [priceField]: basePrice,
          quantity,
          deliveryOption: editDeliveryOption
        })
      })
      
      const data = await response.json()
      if (response.ok && data.data) {
        // Update local state with actual data from API (includes 10% markup)
        if (type === 'resale') {
          setResaleListings(prev => prev.map(r => r.id === id ? data.data : r))
        } else {
          setTradeInListings(prev => prev.map(t => t.id === id ? data.data : t))
        }
        setEditingId(null)
        setEditingType(null)
        setEditPrice('')
        setEditQuantity('')
        setEditDeliveryOption('')
        alert('✓ Listing updated successfully!')
      } else {
        alert(data.message || 'Failed to update listing')
      }
    } catch (error) {
      console.error('Failed to edit listing:', error)
      alert('Error updating listing')
    }
  }

  async function handleDeleteListing(id: string, type: 'resale' | 'tradein') {
    try {
      const apiBase = getApiBaseUrl()
      const endpoint = type === 'resale' ? 'resales' : 'trade-ins'
      
      const response = await fetch(`${apiBase}/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (response.ok) {
        // Update local state
        if (type === 'resale') {
          setResaleListings(prev => prev.filter(r => r.id !== id))
        } else {
          setTradeInListings(prev => prev.filter(t => t.id !== id))
        }
        setDeleteConfirmId(null)
        setDeleteConfirmType(null)
        alert('Listing deleted successfully!')
      } else {
        alert(data.message || 'Failed to delete listing')
      }
    } catch (error) {
      console.error('Failed to delete listing:', error)
      alert('Error deleting listing')
    }
  }

  async function handlePayInstallment(application: any) {
    try {
      setPaymentLoadingId(application.id)
      setPaymentMessage('')
      setSelectedApplicationForPayment(application)
      const apiBase = getApiBaseUrl()
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const authToken = token || storedToken
      const initResponse = await fetch(`${apiBase}/installments/initialize-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ applicationId: application.id })
      })

      const initData = await initResponse.json()
      if (!initResponse.ok || !initData?.data?.reference) {
        throw new Error(initData?.message || 'Failed to initialize installment payment')
      }

      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: initData.data.email || user?.email,
        amount: Math.round(Number(initData.data.amount || application.firstPayment) * 100),
        ref: initData.data.reference,
        metadata: {
          paymentType: 'installment_first_payment',
          applicationId: application.id,
          userId: user?.id
        },
        onClose: function () {
          setPaymentLoadingId(null)
          setPaymentMessage('Payment window closed')
        },
        onSuccess: async function (response: any) {
          try {
            const verifyResponse = await fetch(`${apiBase}/installments/verify-first-payment/${response.reference}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              }
            })

            const verifyData = await verifyResponse.json()
            if (!verifyResponse.ok || !verifyData?.success) {
              throw new Error(verifyData?.message || 'Payment verification failed')
            }

            const verifiedApplication = verifyData?.data?.application || application
            const verifiedInstallment = verifyData?.data?.installment || null
            const totalAmount = Number(verifiedApplication?.totalAmount || application.totalAmount || 0)
            const firstPayment = Number(verifiedApplication?.firstPayment || application.firstPayment || 0)
            const remainingBalance = Number(verifiedInstallment?.remainingBalance ?? Math.max(0, totalAmount - firstPayment))
            const months = Number(verifiedApplication?.months || application.months || 0)
            const monthlyPayment = Number(verifiedApplication?.monthlyPayment || application.monthlyPayment || 0)

            const receiptPayload = {
              applicationId: verifiedApplication?.id || application.id,
              reference: response.reference,
              paidAmount: firstPayment,
              totalAmount,
              remainingBalance,
              months,
              monthlyPayment,
              paidAt: new Date().toISOString()
            }
            setLatestReceipt(receiptPayload)
            setApplications((prev: any[]) =>
              prev.map((appItem: any) =>
                String(appItem.id) === String(receiptPayload.applicationId)
                  ? {
                      ...appItem,
                      status: 'payment_completed',
                      paymentStatus: 'paid',
                      paymentReference: receiptPayload.reference,
                      firstPaymentPaid: true,
                      firstPaymentDate: new Date().toISOString(),
                      orderId: verifiedInstallment?.orderId || appItem.orderId
                    }
                  : appItem
              )
            )
            setPaymentMessage(`✓ First payment successful. Monthly auto-debit is now active for application #${application.id.substring(0, 8)}.`)
            await new Promise(resolve => setTimeout(resolve, 1200))
            fetchApplications()
            setSelectedApplicationForPayment(null)
          } catch (error: any) {
            console.error('Payment verification error:', error)
            setPaymentMessage(error?.message || 'Payment verification error. Please contact support.')
          } finally {
            setPaymentLoadingId(null)
          }
        }
      })

      handler.openIframe()
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentMessage('Failed to initialize first payment. Please try again.')
      setPaymentLoadingId(null)
    }
  }

  async function verifyInstallmentReference(reference: string) {
    try {
      const apiBase = getApiBaseUrl()
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      const authToken = token || storedToken
      const verifyResponse = await fetch(`${apiBase}/installments/verify-first-payment/${reference}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      const verifyData = await verifyResponse.json()
      if (!verifyResponse.ok || !verifyData?.success) {
        throw new Error(verifyData?.message || 'Payment verification failed')
      }

      const verifiedApplication = verifyData?.data?.application
      if (verifiedApplication?.id) {
        setLatestReceipt((prev: any) => ({
          ...(prev || {}),
          applicationId: verifiedApplication.id,
          reference,
          paidAmount: verifiedApplication.firstPayment,
          totalAmount: verifiedApplication.totalAmount,
          remainingBalance: Math.max(0, Number(verifiedApplication.totalAmount || 0) - Number(verifiedApplication.firstPayment || 0)),
          months: verifiedApplication.months,
          monthlyPayment: verifiedApplication.monthlyPayment,
          paidAt: new Date().toISOString()
        }))
        setApplications((prev: any[]) =>
          prev.map((appItem: any) =>
            String(appItem.id) === String(verifiedApplication.id)
              ? {
                  ...appItem,
                  status: 'payment_completed',
                  paymentStatus: 'paid',
                  paymentReference: reference,
                  firstPaymentPaid: true,
                  firstPaymentDate: new Date().toISOString(),
                  orderId: verifyData?.data?.installment?.orderId || appItem.orderId
                }
              : appItem
          )
        )
      }

      setPaymentMessage('✓ First payment verified successfully. Your monthly debit plan is now active.')
      fetchApplications()
    } catch (error: any) {
      console.error('Auto verification error:', error)
      setPaymentMessage(error?.message || 'Unable to verify payment. Please contact support.')
    }
  }

  const renderApplicationCard = (app: any) => {
    const receiptForApp = latestReceipt && String(latestReceipt.applicationId) === String(app.id)
    const isPaid =
      app.status === 'payment_completed' ||
      String(app.paymentStatus || '').toLowerCase() === 'paid' ||
      String(app.paymentStatus || '').toLowerCase() === 'completed' ||
      Boolean(app.paymentReference) ||
      Boolean(app.firstPaymentPaid) ||
      Boolean(receiptForApp)
    const cartItems = Array.isArray(app.cartItems) ? app.cartItems : []
    const normalizedItems = cartItems.map((item: any) => {
      const productName = item.productName || item.name || item.title || 'Product'
      const quantity = Number(item.quantity || 1)
      const price = Number(item.price || item.unitPrice || 0)
      const image = item.image || item.imageUrl || item.image_url || (Array.isArray(item.images) ? item.images[0] : '') || ''
      return { productName, quantity, price, image }
    })
    const cartSubtotal = normalizedItems.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0)

    return (
      <div key={app.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg">Application #{app.id.substring(0, 8)}</h3>
            <p className="text-sm text-gray-900 font-bold">
              Submitted: {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            app.status === 'approved' ? 'bg-green-100 text-green-800' :
            app.status === 'rejected' ? 'bg-red-100 text-red-800' :
            isPaid ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {app.status === 'approved' ? 'Approved' :
             app.status === 'rejected' ? 'Rejected' :
             isPaid ? 'Paid' :
             'Pending'}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-900 font-bold">Total Amount</label>
            <p className="font-bold text-lg">{formatPrice(app.totalAmount)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-900 font-bold">First Payment (50%)</label>
            <p className="font-bold text-lg text-orange-500">{formatPrice(app.firstPayment)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-900 font-bold">Monthly Payment</label>
            <p className="font-bold">{formatPrice(app.monthlyPayment)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-900 font-bold">Duration</label>
            <p className="font-bold">{app.months} months</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-900 font-bold">Delivery Status</label>
            <p className="font-bold capitalize">{app.deliveryStatus || 'Pending'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-900 font-bold">Installation Status</label>
            <p className="font-bold capitalize">{app.installationStatus || 'Pending'}</p>
          </div>
        </div>

        {app.status === 'approved' && !isPaid && normalizedItems.length > 0 && (
          <div className="border-t pt-4 mb-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-900">Items in Your Installment Cart</h4>
                  <span className="text-xs font-semibold text-gray-700">{normalizedItems.length} item(s)</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {normalizedItems.map((item: any, idx: number) => (
                    <div key={`${app.id}-item-${idx}`} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-500 font-semibold">No image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.productName}</p>
                        <p className="text-xs text-gray-700">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-72">
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sticky top-24">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Installment Summary</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-semibold">Cart Total</span>
                      <span className="text-gray-900 font-bold">{formatPrice(cartSubtotal || app.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-semibold">Pay Now (50%)</span>
                      <span className="text-orange-600 font-bold">{formatPrice(app.firstPayment)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-semibold">Monthly</span>
                      <span className="text-gray-900 font-bold">{formatPrice(app.monthlyPayment)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePayInstallment(app)}
                    disabled={paymentLoadingId === app.id}
                    className="mt-4 w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoadingId === app.id ? 'Processing...' : `Pay ${formatPrice(app.firstPayment)} Now`}
                  </button>
                  <p className="mt-2 text-xs text-gray-600 font-semibold">
                    Secure payment via Paystack. Auto-debit activates after payment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {app.adminNotes && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 mb-4">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Admin Notes:</p>
            <p className="text-sm text-gray-900 font-bold">{app.adminNotes}</p>
          </div>
        )}

        {app.status === 'approved' && !isPaid && normalizedItems.length === 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-green-600 mb-3">
              ✓ Approved. Pay your 50% now to activate automatic monthly debit for the remaining balance.
            </p>
            <button
              onClick={() => handlePayInstallment(app)}
              disabled={paymentLoadingId === app.id}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoadingId === app.id ? 'Processing...' : `Pay ${formatPrice(app.firstPayment)} Now`}
            </button>
          </div>
        )}

        {app.status === 'pending' && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-900 font-bold">
              ⏳ Your application is being reviewed. You'll receive an email notification once it's approved.
            </p>
          </div>
        )}

        {app.status === 'rejected' && app.adminNotes && (
          <div className="border-t pt-4">
            <p className="text-sm text-red-600">
              ✕ Application was not approved. You can still purchase items using regular payment.
            </p>
          </div>
        )}

        {(app.status === 'payment_completed' || isPaid) && (
          <div className="border-t pt-4">
            <p className="text-sm text-blue-600 mb-3">
              ✓ First payment completed. Your order is processing and monthly card debit is active.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm font-bold text-blue-800 mb-2">Payment Receipt</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-blue-700 font-semibold">Reference</div>
                  <div className="font-bold text-blue-900">{app.paymentReference || (receiptForApp ? latestReceipt?.reference : null) || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-blue-700 font-semibold">Paid Now</div>
                  <div className="font-bold text-blue-900">{formatPrice(app.firstPayment)}</div>
                </div>
                <div>
                  <div className="text-blue-700 font-semibold">Remaining Balance</div>
                  <div className="font-bold text-blue-900">
                    {formatPrice(Math.max(0, Number(app.totalAmount || 0) - Number(app.firstPayment || 0)))}
                  </div>
                </div>
                <div>
                  <div className="text-blue-700 font-semibold">Plan</div>
                  <div className="font-bold text-blue-900">
                    {app.months} months • {formatPrice(app.monthlyPayment)} / month
                  </div>
                </div>
              </div>
            </div>
            {app.orderId && (
              <button
                onClick={() => setActiveTab('orders')}
                className="mt-4 w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition"
              >
                View Order
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>My Account - RenewableZmart</title>
      </Head>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        strategy="afterInteractive"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">My Account</h1>
            <div className="flex items-center gap-3">
              <a
                href="/messages?tab=notifications"
                className="relative w-10 h-10 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center text-lg"
                aria-label="Messages"
              >
                ✉️
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </a>
              <a
                href="/account-details"
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center text-lg"
                aria-label="Settings"
              >
                ⚙️
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'profile' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-900 font-bold'}`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'applications' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-900 font-bold'}`}
            >
              My Applications
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'orders' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-900 font-bold'}`}
            >
              My Orders
            </button>
            <button
              onClick={() => setActiveTab('swap')}
              className={`pb-3 px-4 font-bold whitespace-nowrap ${activeTab === 'swap' ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-900 font-bold'}`}
            >
              🔄 Swap & Resell
            </button>
          </div>

          {/* Payment Status Message */}
          {paymentMessage && (
            <div className={`mb-6 p-4 rounded-lg ${paymentMessage.includes('✓') || paymentMessage.includes('successful') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {paymentMessage}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Profile Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-900 font-bold">First Name</label>
                    <p className="font-bold">{user?.firstName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 font-bold">Last Name</label>
                    <p className="font-bold">{user?.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 font-bold">Email</label>
                    <p className="font-bold">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 font-bold">Account Type</label>
                    <p className="font-bold capitalize">{user?.role}</p>
                  </div>
                  {user?.country && (
                    <div>
                      <label className="text-sm text-gray-900 font-bold">Country</label>
                      <p className="font-bold">{user?.country}</p>
                    </div>
                  )}
                  {user?.city && (
                    <div>
                      <label className="text-sm text-gray-900 font-bold">City</label>
                      <p className="font-bold">{user?.city}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="font-bold text-lg mb-2">📦 My Orders</h3>
                  <p className="text-gray-900 font-bold mb-4">View your order history</p>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 w-full font-bold"
                  >
                    View Orders
                  </button>
                </div>

                {user?.role === 'vendor' && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h3 className="font-bold text-lg mb-2">🏪 My Store</h3>
                    <p className="text-gray-900 font-bold mb-4">Manage your products</p>
                    <button
                      onClick={() => router.push('/stores')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full font-bold"
                    >
                      Go to Store
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions - Swap & Resell */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-bold mb-4">💡 Quick Actions</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg shadow-md p-6 border-2 border-orange-300">
                    <h3 className="font-bold text-lg text-orange-700 dark:text-orange-100 mb-2">💰 Renewable Energy Products</h3>
                    <p className="text-orange-600 dark:text-orange-200 font-bold mb-4 text-sm">Set your own price and sell directly</p>
                    <button
                      onClick={() => setActiveTab('swap')}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-950 w-full font-bold transition"
                    >
                      Start Selling
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg shadow-md p-6 border-2 border-blue-300">
                    <h3 className="font-bold text-lg text-blue-700 dark:text-blue-100 mb-2">🔄 Trade-In</h3>
                    <p className="text-blue-600 dark:text-blue-200 font-bold mb-4 text-sm">Trade for fair market value</p>
                    <button
                      onClick={() => { setActiveTab('swap'); setSwapSubTab('tradein'); }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full font-bold transition"
                    >
                      Start Trading
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Applications Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">My Personal Orders</h2>
              <p className="text-sm text-gray-700 font-semibold">
                Personal purchases are shown here for all account types.
              </p>

              {loadingOrders ? (
                <div className="text-center py-8">Loading orders...</div>
              ) : myOrders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <div className="text-5xl mb-3">📦</div>
                  <h3 className="text-xl font-bold mb-2">No Personal Orders Yet</h3>
                  <p className="text-gray-900 font-bold mb-4">When you buy items, they will appear here.</p>
                  <button
                    onClick={() => router.push('/')}
                    className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 font-bold"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order: any) => {
                    const items = Array.isArray(order?.items) ? order.items : []
                    const status = getOrderStatus(order)
                    const isExpanded = expandedOrderId === String(order.id)
                    return (
                      <div
                        key={order.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 cursor-pointer"
                        onClick={() => setExpandedOrderId((prev) => (prev === String(order.id) ? null : String(order.id)))}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Order</p>
                            <p className="font-mono font-bold text-sm">{String(order.orderNumber || order.id || '').slice(0, 16)}</p>
                          </div>
                          <div className="text-sm font-bold">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {items.slice(0, 3).map((item: any, idx: number) => (
                            <div key={`${order.id}-item-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold break-words">{item.productName || item.name || 'Product'}</span>
                              <span className="font-bold">{formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <p className="text-xs text-gray-500 font-semibold">+{items.length - 3} more item(s)</p>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            {status.toUpperCase()}
                          </span>
                          <span className="font-bold text-emerald-700">{formatPrice(Number(order.total || 0))}</span>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 border-t border-gray-200 pt-4 space-y-3">
                            <div className="text-sm font-bold text-gray-900">Order Details</div>
                            {items.length === 0 ? (
                              <p className="text-sm text-gray-600 font-semibold">No product details available for this order.</p>
                            ) : (
                              <div className="space-y-2">
                                {items.map((item: any, idx: number) => (
                                  <div key={`${order.id}-expanded-${idx}`} className="rounded-lg border border-gray-200 p-3">
                                    <p className="font-semibold text-sm">{item.productName || item.name || 'Product'}</p>
                                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-700 font-semibold">
                                      <span>Qty: {Number(item.quantity || 1)}</span>
                                      <span>Unit: {formatPrice(Number(item.price || 0))}</span>
                                      <span className="col-span-2">Total: {formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</span>
                                      {(item.storeName || item.store || item.vendorStoreName) && (
                                        <span className="col-span-2">Store: {item.storeName || item.store || item.vendorStoreName}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/track-order?order=${order.id}`)
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 text-sm"
                              >
                                Track Shipping
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push('/orders')
                                }}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 text-sm"
                              >
                                Open Full Orders
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">My Installment Applications</h2>
              
              {loadingApplications ? (
                <div className="text-center py-8">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <div className="text-6xl mb-4">💳</div>
                  <h3 className="text-xl font-bold mb-2">No Applications Yet</h3>
                  <p className="text-gray-900 font-bold mb-4">You haven't submitted any Pay Small Small applications</p>
                  <button
                    onClick={() => router.push('/')}
                    className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-900"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {paymentMessage && (
                    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      {paymentMessage}
                    </div>
                  )}
                  {applications.map(renderApplicationCard)}
                </>
              )}
            </div>
          )}

          {/* Swap & Resell Tab */}
          {activeTab === 'swap' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6">🔄 Swap & Resell Your Products</h2>
              
              {/* Upload Form Selector */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <label className="text-sm font-bold text-gray-700">Choose Upload Form</label>
                <select
                  value={swapSubTab}
                  onChange={(e) => setSwapSubTab(e.target.value as 'resale' | 'tradein')}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold focus:outline-none focus:border-orange-500"
                >
                  <option value="resale">Sell My Product</option>
                  <option value="tradein">Trade-In Product</option>
                </select>
              </div>

              {/* Resale Form */}
              {swapSubTab === 'resale' && (
                <div>
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
                    <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">💡 How Direct Resale Works</h3>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>✓ Set your own price and terms</li>
                      <li>✓ Admin verifies product authenticity</li>
                      <li>✓ Once approved, visible to all buyers</li>
                      <li>✓ Get paid when buyer completes payment</li>
                      <li>✓ 10% platform fee added to your base price</li>
                    </ul>
                  </div>
                  <ResaleForm />
                  {/* My Resale Listings */}
                  <div className="mt-12 pt-8 border-t">
                    <h3 className="text-xl font-bold mb-4">📋 My Resale Listings</h3>
                    <p className="text-gray-600 mb-4">Your active and pending resale products appear here. You can edit prices or delete listings before approval.</p>
                    {loadingListings ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center text-gray-500">
                        <p>Loading your listings...</p>
                      </div>
                    ) : resaleListings.length === 0 ? (
                      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6 text-center">
                        <p className="text-blue-800 dark:text-blue-200 font-bold">No resale listings yet. Create one above to get started!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {resaleListings.map(listing => (
                          <div key={listing.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-lg">{listing.productName}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{listing.brand} • {listing.condition}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                listing.status === 'approved' ? 'bg-green-100 text-green-800' :
                                listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                listing.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                listing.status === 'sold' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {listing.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Base Price</p>
                                <p className="font-bold">{formatPrice(listing.price / 1.1)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">With 10% Fee</p>
                                <p className="font-bold text-orange-600">{formatPrice(listing.price)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Delivery Option</p>
                                <p className="font-bold capitalize">{listing.deliveryOption}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mb-4">
                              Stock: {Math.max(0, Number(listing.quantity ?? 0))}
                            </p>
                            {listing.status !== 'sold' && (
                              <div className="flex gap-2 pt-4 border-t">
                                {editingId === listing.id && editingType === 'resale' ? (
                                  <>
                                    <div className="flex-1 space-y-2">
                                      <input
                                        type="number"
                                        placeholder="e.g. 150,000"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Stock quantity (e.g. 5)"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                                      />
                                      <select
                                        value={editDeliveryOption}
                                        onChange={(e) => setEditDeliveryOption(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                                      >
                                        <option value="">Select delivery option</option>
                                        <option value="pickup">Pickup Only</option>
                                        <option value="delivery">Delivery Only</option>
                                        <option value="both">Pickup & Delivery</option>
                                      </select>
                                      <div className="text-xs text-gray-500">
                                        Price with 10% fee: {formatPrice(parseFloat(editPrice) * 1.1 || 0)}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleEditListing(listing.id, 'resale')}
                                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 whitespace-nowrap"
                                    >
                                      ✓ Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingId(null)
                                        setEditingType(null)
                                        setEditPrice('')
                                        setEditQuantity('')
                                        setEditDeliveryOption('')
                                      }}
                                      className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 whitespace-nowrap"
                                    >
                                      ✗ Cancel
                                    </button>
                                  </>
                                ) : deleteConfirmId === listing.id && deleteConfirmType === 'resale' ? (
                                  <>
                                    <p className="flex-1 text-sm text-red-600 dark:text-red-400 font-bold">
                                      Are you sure you want to delete this listing?
                                    </p>
                                    <button
                                      onClick={() => handleDeleteListing(listing.id, 'resale')}
                                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeleteConfirmId(null)
                                        setDeleteConfirmType(null)
                                      }}
                                      className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingId(listing.id)
                                        setEditingType('resale')
                                        setEditPrice((listing.price / 1.1).toString())
                                        setEditQuantity(String(Math.max(0, Number(listing.quantity ?? 0))))
                                        setEditDeliveryOption(listing.deliveryOption)
                                      }}
                                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeleteConfirmId(listing.id)
                                        setDeleteConfirmType('resale')
                                      }}
                                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Trade-In Form */}
              {swapSubTab === 'tradein' && (
                <div>
                  <div className="bg-cyan-50 dark:bg-cyan-900 p-4 rounded-lg mb-6">
                    <h3 className="font-bold text-cyan-900 dark:text-cyan-100 mb-2">💡 How Trade-In Works</h3>
                    <ul className="text-sm text-cyan-800 dark:text-cyan-200 space-y-1">
                      <li>✓ We evaluate your product</li>
                      <li>✓ Get fair market value quote within 24-48 hours</li>
                      <li>✓ Free pickup service</li>
                      <li>✓ Use credit towards new purchase</li>
                      <li>✓ 10% platform fee added to your base price</li>
                    </ul>
                  </div>
                  <TradeInForm />
                  {/* My Trade-In Listings */}
                  <div className="mt-12 pt-8 border-t">
                    <h3 className="text-xl font-bold mb-4">📋 My Trade-In Requests</h3>
                    <p className="text-gray-600 mb-4">Your active and pending trade-in requests appear here. You can edit prices or delete requests before quote.</p>
                    {loadingListings ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center text-gray-500">
                        <p>Loading your trade-in requests...</p>
                      </div>
                    ) : tradeInListings.length === 0 ? (
                      <div className="bg-cyan-50 dark:bg-cyan-900 rounded-lg p-6 text-center">
                        <p className="text-cyan-800 dark:text-cyan-200 font-bold">No trade-in requests yet. Create one above to get started!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tradeInListings.map(listing => (
                          <div key={listing.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-lg">{listing.productName}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{listing.brand} • Year: {listing.yearOfManufacture}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                listing.status === 'approved' ? 'bg-green-100 text-green-800' :
                                listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                listing.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {listing.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Base Estimated Price</p>
                                <p className="font-bold">{formatPrice(listing.estimatedPrice / 1.1)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">With 10% Fee</p>
                                <p className="font-bold text-blue-600">{formatPrice(listing.estimatedPrice)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Delivery Option</p>
                                <p className="font-bold capitalize">{listing.deliveryOption}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mb-4">
                              Stock: {Math.max(0, Number(listing.quantity ?? 0))}
                            </p>
                            {listing.status !== 'approved' && (
                              <div className="flex gap-2 pt-4 border-t">
                                {editingId === listing.id && editingType === 'tradein' ? (
                                  <>
                                    <div className="flex-1 space-y-2">
                                      <input
                                        type="number"
                                        placeholder="e.g. 120,000"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="Stock quantity (e.g. 3)"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                                      />
                                      <select
                                        value={editDeliveryOption}
                                        onChange={(e) => setEditDeliveryOption(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                                      >
                                        <option value="">Select delivery option</option>
                                        <option value="pickup">Pickup Only</option>
                                        <option value="delivery">Delivery Only</option>
                                        <option value="both">Pickup & Delivery</option>
                                      </select>
                                      <div className="text-xs text-gray-500">
                                        Price with 10% fee: {formatPrice(parseFloat(editPrice) * 1.1 || 0)}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleEditListing(listing.id, 'tradein')}
                                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 whitespace-nowrap"
                                    >
                                      ✓ Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingId(null)
                                        setEditingType(null)
                                        setEditPrice('')
                                        setEditQuantity('')
                                        setEditDeliveryOption('')
                                      }}
                                      className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 whitespace-nowrap"
                                    >
                                      ✗ Cancel
                                    </button>
                                  </>
                                ) : deleteConfirmId === listing.id && deleteConfirmType === 'tradein' ? (
                                  <>
                                    <p className="flex-1 text-sm text-red-600 dark:text-red-400 font-bold">
                                      Are you sure you want to delete this request?
                                    </p>
                                    <button
                                      onClick={() => handleDeleteListing(listing.id, 'tradein')}
                                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeleteConfirmId(null)
                                        setDeleteConfirmType(null)
                                      }}
                                      className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingId(listing.id)
                                        setEditingType('tradein')
                                        setEditPrice((listing.estimatedPrice / 1.1).toString())
                                        setEditQuantity(String(Math.max(0, Number(listing.quantity ?? 0))))
                                        setEditDeliveryOption(listing.deliveryOption)
                                      }}
                                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeleteConfirmId(listing.id)
                                        setDeleteConfirmType('tradein')
                                      }}
                                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}        </div>
      </div>
    </div>
  )
}
