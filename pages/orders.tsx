import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import Head from 'next/head'
import { useCurrency } from '../context/CurrencyContext'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'
import { buildOrderPlacedEmail, buildShipmentEmail, buildOrderSuccessEmail, sendEmailNotification } from '@/lib/notify'
import { useNotifications } from '@/context/NotificationContext'
import { getImageUrl, getSmallFallbackImage } from '@/lib/imageUtils'

export default function Orders() {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { user, token, isHydrated, setToken } = useAuthStore()
  const { addNotification } = useNotifications()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    orderId: string;
    item: any;
    orderStatus: string;
    paymentStatus: string;
  } | null>(null)
  const [refundModal, setRefundModal] = useState<{ open: boolean; orderId: string } | null>(null)
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' })
  const [refundForm, setRefundForm] = useState({ reason: 'defective', description: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [submittingRefund, setSubmittingRefund] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const isVendorView = user?.role === 'vendor' || user?.accountType === 'vendor' || user?.accountType === 'ev_vendor'

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

  const getPaymentStatus = (order: any) =>
    String(order?.paymentStatus || 'pending').toLowerCase()

  const canReviewOrder = (status: string, paymentStatus: string) =>
    paymentStatus === 'paid' && (status === 'delivered' || status === 'completed')

  const getVendorOrderTotal = (order: any) =>
    Array.isArray(order?.items)
      ? order.items.reduce((sum: number, item: any) => sum + (Number(item?.price || 0) * Number(item?.quantity || 0)), 0)
      : 0

  const renderStars = (rating: number, interactive: boolean, onChange?: (value: number) => void) => (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, idx) => {
        const value = idx + 1
        return (
          <button
            key={value}
            type="button"
            onClick={() => interactive && onChange?.(value)}
            className={`text-2xl ${value <= rating ? 'text-orange-500' : 'text-gray-300'} ${interactive ? 'hover:scale-110 transition' : ''}`}
            aria-label={`${value} star`}
          >
            ★
          </button>
        )
      })}
    </div>
  )

  const handleSubmitReview = async () => {
    if (!reviewModal?.item || !token) return
    if (!canReviewOrder(reviewModal.orderStatus, reviewModal.paymentStatus)) {
      setToastMessage('Reviews are available only after a successful purchase and delivery.')
      return
    }
    const apiBase = getApiBaseUrl()
    const productId = reviewModal.item?.productId || reviewModal.item?.product?.id || reviewModal.item?.id
    if (!productId) {
      setToastMessage('Unable to find a product for this review.')
      return
    }

    if (reviewForm.rating === 0) {
      setToastMessage('Please select a rating (1-5 stars).')
      return
    }

    setSubmittingReview(true)
    try {
      const payload = {
        orderId: reviewModal.orderId,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      }

      let response = await fetch(`${apiBase}/reviews/products/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        response = await fetch(`${apiBase}/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...payload, productId }),
        })
      }

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      setToastMessage('Thanks! Your review was submitted.')
      addNotification({
        userId: user?.id || 'guest',
        type: 'review',
        title: 'Review submitted',
        message: `Thanks for reviewing ${reviewModal.item?.productName || 'your item'}.`,
        read: false,
        actionUrl: '/orders',
        icon: '⭐',
        color: 'purple',
      })
      setReviewModal(null)
      setReviewForm({ rating: 0, comment: '' })
    } catch (error) {
      console.error('Review submission failed:', error)
      setToastMessage('Failed to submit review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleSubmitRefund = async () => {
    if (!refundModal?.orderId || !token) return
    setSubmittingRefund(true)
    try {
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/returns/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: refundModal.orderId,
          reason: refundForm.reason,
          description: refundForm.description.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit refund request')
      }

      setToastMessage('Refund request submitted successfully.')
      addNotification({
        userId: user?.id || 'guest',
        type: 'order',
        title: 'Refund requested',
        message: `We received your refund request for Order #${refundModal.orderId.slice(0, 8)}.`,
        read: false,
        actionUrl: '/returns',
        icon: '↩️',
        color: 'yellow',
      })
      setRefundModal(null)
      setRefundForm({ reason: 'defective', description: '' })

      const email = user?.email
      if (email) {
        const emailPayload = buildOrderSuccessEmail({
          customerName: user?.firstName,
          orderId: refundModal.orderId,
          reviewUrl: `${window.location.origin}/orders`,
          refundUrl: `${window.location.origin}/returns`,
        })
        const emailResult = await sendEmailNotification({ ...emailPayload, to: email })
        if (emailResult.sent) {
          addNotification({
            userId: user?.id || 'guest',
            type: 'general',
            title: 'Email sent',
            message: 'We sent you a confirmation email with review and refund links.',
            read: false,
            actionUrl: '/notifications',
            icon: '✉️',
            color: 'blue',
          })
        } else {
          console.warn('Refund email failed:', emailResult.error || 'Unknown error')
          setToastMessage('Email delivery failed. Please verify email settings.')
        }
      }
    } catch (error) {
      console.error('Refund request failed:', error)
      setToastMessage('Failed to submit refund request. Please try again.')
    } finally {
      setSubmittingRefund(false)
    }
  }

  const fetchOrders = async (userToken: string) => {
    try {
      const apiBase = getApiBaseUrl()
      // Determine which endpoint to use based on user role
      const endpoint = isVendorView
        ? '/orders/vendor/orders' 
        : '/orders/my-orders'
      
      const response = await fetch(`${apiBase}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      if (response.status === 401) {
        console.error('Unauthorized - redirecting to login')
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const parsedOrders = Array.isArray(data) ? data : (data?.data || data?.orders || [])
      setOrders(parsedOrders)
      if (!isVendorView) {
        handleOrderNotifications(parsedOrders)
        triggerReviewPrompt(parsedOrders)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleOrderNotifications = async (orderList: any[]) => {
    if (!user?.email) return
    if (typeof window === 'undefined') return
    const storageKey = `order_status_map_${user.id}`
    const raw = localStorage.getItem(storageKey)
    let previous: Record<string, string> = {}
    try {
      previous = raw ? JSON.parse(raw) : {}
    } catch {
      previous = {}
    }

    const updated: Record<string, string> = { ...previous }

    for (const order of orderList) {
      const orderId = order.id
      const status = String(order.orderStatus || 'pending').toLowerCase()
      const paymentStatus = String(order.paymentStatus || '').toLowerCase()
      const isPaid = paymentStatus === 'paid'

      if (!previous[orderId] && isPaid) {
        const emailPayload = buildOrderPlacedEmail({
          customerName: user.firstName,
          orderId,
          orderTotal: formatPrice(order.total || 0),
          ordersUrl: `${window.location.origin}/orders`,
        })
        const emailResult = await sendEmailNotification({ ...emailPayload, to: user.email })
        if (!emailResult.sent) {
          console.warn('Order placed email failed:', emailResult.error || 'Unknown error')
          setToastMessage('Email delivery failed. Please verify email settings.')
        }
        addNotification({
          userId: user.id,
          type: 'order',
          title: 'Order placed',
          message: `Order #${orderId.slice(0, 8)} has been placed successfully.`,
          read: false,
          actionUrl: '/orders',
          icon: '📦',
          color: 'green',
        })
      }

      if (previous[orderId] && previous[orderId] !== status) {
        const emailPayload = buildShipmentEmail({
          customerName: user.firstName,
          orderId,
          status,
          trackingUrl: `${window.location.origin}/track-order?order=${orderId}`,
        })
        const emailResult = await sendEmailNotification({ ...emailPayload, to: user.email })
        if (!emailResult.sent) {
          console.warn('Shipment email failed:', emailResult.error || 'Unknown error')
          setToastMessage('Email delivery failed. Please verify email settings.')
        }
        addNotification({
          userId: user.id,
          type: 'order',
          title: 'Order update',
          message: `Order #${orderId.slice(0, 8)} is now ${status}.`,
          read: false,
          actionUrl: `/track-order?order=${orderId}`,
          icon: '🚚',
          color: 'blue',
        })
      }

      updated[orderId] = status
    }

    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const triggerReviewPrompt = (orderList: any[]) => {
    if (typeof window === 'undefined') return
    if (!user?.id) return
    if (reviewModal?.open) return
    if (isVendorView) return

    const eligible = orderList.find((order) => {
      const status = getOrderStatus(order)
      const paymentStatus = getPaymentStatus(order)
      if (!canReviewOrder(status, paymentStatus)) return false
      const items = Array.isArray(order?.items) ? order.items : []
      if (items.length === 0) return false
      const promptKey = `review_prompted_${user.id}_${order.id}`
      return !localStorage.getItem(promptKey)
    })

    if (!eligible) return

    const items = Array.isArray(eligible.items) ? eligible.items : []
    const firstItem = items[0]
    if (!firstItem) return

    const promptKey = `review_prompted_${user.id}_${eligible.id}`
    localStorage.setItem(promptKey, '1')
    setReviewModal({
      open: true,
      orderId: eligible.id,
      item: firstItem,
      orderStatus: getOrderStatus(eligible),
      paymentStatus: getPaymentStatus(eligible),
    })
    addNotification({
      userId: user.id,
      type: 'review',
      title: 'Order delivered',
      message: `Your order #${eligible.id.slice(0, 8)} was delivered. Please leave a review.`,
      read: false,
      actionUrl: '/orders',
      icon: '⭐',
      color: 'purple',
    })
  }

  // Check auth and fetch orders
  useEffect(() => {
    if (!isHydrated) {
      return
    }

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token && storedToken) {
      setToken(storedToken)
    }
    const effectiveToken = token || storedToken

    if (!user || !effectiveToken) {
      setLoading(false)
      router.push('/login')
      return
    }

    fetchOrders(effectiveToken)
    
    // Refresh orders after 2 seconds to catch payment updates
    const refreshTimer = setTimeout(() => {
      fetchOrders(effectiveToken)
    }, 2000)
    
    return () => clearTimeout(refreshTimer)
  }, [isHydrated, user, token, router, setToken])

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>My Orders - RenewableZmart</title>
      </Head>
      <Header />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        {toastMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg font-semibold">
            {toastMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-gray-900 font-bold">Loading orders...</div>
          </div>
        ) : !user || !token ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold mb-2">Please Login</h2>
            <p className="text-gray-900 font-bold mb-6">You need to be logged in to view your orders</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700"
            >
              Go to Login
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
            <p className="text-gray-900 font-bold mb-6">Start shopping to see your orders here</p>
            <button
              onClick={() => router.push('/')}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = getOrderStatus(order)
              const paymentStatus = getPaymentStatus(order)
              const displayTotal = isVendorView
                ? getVendorOrderTotal(order)
                : Number(order?.total || getVendorOrderTotal(order))
              return (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold">Order #{order.id.slice(0, 8)}</h3>
                    <p className="text-sm text-black">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    {order.trackingNumber && (
                      <p className="text-xs text-emerald-600 font-semibold mt-1">
                        Tracking: {order.trackingNumber}
                      </p>
                    )}
                    {/* Payment Status Indicator */}
                    <p className={`text-xs font-semibold mt-2 px-2 py-1 rounded inline-block ${
                      paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      paymentStatus === 'refunded' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      Payment: {paymentStatus.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg price-inline">{formatPrice(displayTotal)}</div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      status === 'delivered' ? 'bg-green-100 text-green-800' :
                      status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      status === 'processing' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Buyer Details */}
                {order.buyerDetails && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 border-l-4 border-teal-600">
                    <p className="text-sm font-bold text-gray-900">Purchased by: {order.buyerDetails.name}</p>
                    <p className="text-xs text-gray-900 font-bold">{order.buyerDetails.email}</p>
                    {order.buyerDetails.phone && (
                      <p className="text-xs text-gray-900 font-bold">{order.buyerDetails.phone}</p>
                    )}
                  </div>
                )}

                {/* Order Items with Store Info */}
                <div className="border-t pt-4 mb-4">
                  <p className="text-sm font-bold text-gray-900 mb-3">Items ({order.items.length}):</p>
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <img
                              src={getImageUrl(item?.image || item?.product?.image) || getSmallFallbackImage('Product')}
                              alt={item.productName || item?.product?.name || 'Product'}
                              className="w-14 h-14 rounded-md border border-gray-200 object-cover bg-white flex-shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getSmallFallbackImage('Product')
                              }}
                            />
                            <span className="text-sm font-semibold text-gray-900 truncate">{item.productName || item?.product?.name || 'Product'}</span>
                          </div>
                          <span className="text-sm font-bold text-green-600 price-inline flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                        <div className="text-xs text-black mb-2">
                          Quantity: <span className="font-semibold">{item.quantity}</span> × <span className="price-inline">{formatPrice(item.price)}</span> each
                        </div>
                        {item.storeName && (
                          <div className="bg-blue-50 rounded px-2 py-1 inline-block border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900">🏪 {item.storeName}</p>
                          </div>
                        )}

                        {!isVendorView && canReviewOrder(status, paymentStatus) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => setReviewModal({
                                open: true,
                                orderId: order.id,
                                item,
                                orderStatus: status,
                                paymentStatus,
                              })}
                              className="bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-50"
                            >
                              ⭐ Leave Review
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 flex flex-wrap gap-3 justify-between items-center">
                  <p className="text-sm text-gray-900 font-bold">{order.items.length} item(s)</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/track-order?order=${order.id}`)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold"
                    >
                      🚚 Track Order
                    </button>
                    {!isVendorView && ((paymentStatus === 'paid' && status !== 'cancelled') || status === 'delivered') && (
                      <button
                        onClick={() => setRefundModal({ open: true, orderId: order.id })}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-900 text-sm font-semibold"
                      >
                        ↩️ Request Refund
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {reviewModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Leave a Review</h3>
              <button
                onClick={() => setReviewModal(null)}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share your experience with {reviewModal.item?.productName}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Rating</label>
              {renderStars(reviewForm.rating, true, (value) => setReviewForm((prev) => ({ ...prev, rating: value })))}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Comment</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={4}
                placeholder="Tell others what you liked (or didn't)."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {refundModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Request a Refund</h3>
              <button
                onClick={() => setRefundModal(null)}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              We will review your request and respond within 24–48 hours.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Reason</label>
              <select
                value={refundForm.reason}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="defective">Product is defective</option>
                <option value="wrong_item">Received wrong item</option>
                <option value="not_as_described">Item doesn't match description</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="damaged">Item arrived damaged</option>
                <option value="other">Other reason</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Details</label>
              <textarea
                value={refundForm.description}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={4}
                placeholder="Provide additional details to speed up your request."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRefundModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRefund}
                disabled={submittingRefund}
                className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-semibold hover:bg-slate-900 disabled:opacity-50"
              >
                {submittingRefund ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




