import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/authStore'

type ReturnRequest = {
  id: string
  orderId: string
  rmaNumber: string
  reason: string
  description?: string
  status: 'requested' | 'approved' | 'shipped' | 'received' | 'refunded' | 'rejected' | string
  refundAmount?: number
  requestedAt?: string
  approvedAt?: string
  receivedAt?: string
  trackingNumber?: string
}

const statusStyles: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  received: 'bg-purple-100 text-purple-800',
  refunded: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
}

const statusMessage: Record<string, string> = {
  requested: 'Your return request is under review. We will update you shortly.',
  approved: 'Your return request is approved. Please ship your item back using the return instructions.',
  shipped: 'Your return package is in transit to our returns center.',
  received: 'We have received your return and your refund is being processed.',
  refunded: 'Refund has been completed successfully.',
  rejected: 'Your request was declined. Please contact support for more help.',
}

export default function ReturnDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const { token, isHydrated, isAuthenticated, setToken } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<ReturnRequest | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isHydrated) return
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token && storedToken) {
      setToken(storedToken)
    }
    const effectiveToken = token || storedToken
    if (!isAuthenticated || !effectiveToken) {
      router.replace('/login')
      return
    }
    if (!id || Array.isArray(id)) return

    const fetchDetail = async () => {
      setLoading(true)
      try {
        const response = await apiClient.get(`/returns/${id}`)
        const data = response?.data?.data || null
        if (!data) {
          setError('Return request not found.')
          setItem(null)
        } else {
          setItem(data)
          setError('')
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load return request.')
        setItem(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [id, isAuthenticated, isHydrated, router, setToken, token])

  const prettyStatus = useMemo(() => {
    const raw = String(item?.status || '').toLowerCase()
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Unknown'
  }, [item?.status])

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Return Request Details - RenewableZmart</title>
      </Head>
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="rounded-3xl border border-blue-100 bg-white shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-700">Returns Center</p>
              <h1 className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">Return Request Details</h1>
            </div>
            <button
              type="button"
              onClick={() => router.push('/returns')}
              className="px-4 py-2 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-950 transition"
            >
              Back to Returns
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
              <p className="mt-3 text-slate-600 font-semibold">Loading return details...</p>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-rose-700 font-semibold">{error}</p>
            </div>
          ) : item ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">RMA Number</p>
                    <p className="text-lg sm:text-xl font-black text-blue-950">{item.rmaNumber}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusStyles[String(item.status).toLowerCase()] || 'bg-slate-100 text-slate-800'}`}>
                    {prettyStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Order ID</p>
                  <p className="text-base font-bold text-slate-900 mt-1">{item.orderId}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Requested On</p>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Reason</p>
                  <p className="text-base font-bold text-slate-900 mt-1">{item.reason || 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Refund Amount</p>
                  <p className="text-base font-black text-emerald-600 mt-1">
                    {Number(item.refundAmount || 0) > 0 ? `₦${Number(item.refundAmount).toLocaleString()}` : 'Pending'}
                  </p>
                </div>
              </div>

              {item.description ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Description</p>
                  <p className="text-slate-900 font-medium mt-2">{item.description}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-950">{statusMessage[String(item.status).toLowerCase()] || 'Your return request is being processed.'}</p>
                {item.trackingNumber ? (
                  <p className="text-sm text-blue-800 mt-2">Tracking: <span className="font-bold">{item.trackingNumber}</span></p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  )
}

