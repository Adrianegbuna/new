import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Header from '../../components/Header'
import { useAuthStore } from '../../store/authStore'
import { useRouter } from 'next/router'
import { apiClient } from '../../lib/api-client'
import { useCurrency } from '../../hooks/useCurrency'

interface ReferralStats {
  totalClicks: number
  successfulPurchases: number
  totalCommission: number
  pendingCommission: number
  conversionRate: number
  referralCode: string
  referralLink: string
}

interface PayoutRequest {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  paidAt?: string
  notes?: string
  paymentMethod: string
}

export default function ReferralPayout() {
  const router = useRouter()
  const { user, isHydrated } = useAuthStore()
  const { formatPrice } = useCurrency()
  
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showPayoutForm, setShowPayoutForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: '',
    bankCode: '',
    bankCountry: '',
    requestedAmount: 0
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isHydrated) return
    if (!user) {
      router.push('/login')
      return
    }

    const allowedRoles = ['customer', 'installer']
    if (user.role && !allowedRoles.includes(user.role)) {
      router.push('/')
      return
    }

    fetchData()
  }, [isHydrated, user, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, historyRes] = await Promise.all([
        apiClient.get('/referrals/my-stats').catch(() => ({ data: null })),
        apiClient.get('/referrals/my-payouts').catch(() => ({ data: [] }))
      ])

      if (statsRes.data) {
        setStats(statsRes.data)
        // Pre-fill bank details if user has them
        if (user?.bankAccountName) {
          setFormData(prev => ({
            ...prev,
            bankAccountName: user.bankAccountName || '',
            bankAccountNumber: user.bankAccountNumber || '',
            bankName: user.bankName || '',
            bankCode: user.bankCode || '',
            bankCountry: user.bankCountry || ''
          }))
        }
      }

      if (Array.isArray(historyRes.data)) {
        setPayoutHistory(historyRes.data)
      }
    } catch (err) {
      console.error('Failed to fetch referral data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.bankAccountName || !formData.bankAccountNumber || !formData.bankName) {
      setError('Please fill in all required bank details')
      return
    }

    if (!formData.requestedAmount || formData.requestedAmount <= 0) {
      setError('Please enter a valid payout amount')
      return
    }

    if (stats && formData.requestedAmount > stats.totalCommission) {
      setError('Payout amount cannot exceed total earned commission')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post('/referrals/request-payout', {
        bankAccountName: formData.bankAccountName,
        bankAccountNumber: formData.bankAccountNumber,
        bankName: formData.bankName,
        bankCode: formData.bankCode,
        bankCountry: formData.bankCountry,
        requestedAmount: parseFloat(formData.requestedAmount.toString())
      })

      setSuccess('✅ Payout request submitted successfully! Admin will review and process it soon.')
      setShowPayoutForm(false)
      setFormData({
        bankAccountName: user?.bankAccountName || '',
        bankAccountNumber: user?.bankAccountNumber || '',
        bankName: user?.bankName || '',
        bankCode: user?.bankCode || '',
        bankCountry: user?.bankCountry || '',
        requestedAmount: 0
      })
      
      // Refresh data
      setTimeout(() => fetchData(), 1500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit payout request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isHydrated || loading) {
    return (
      <>
        <Head><title>Referral Payout - RenewableZmart</title></Head>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <p className="text-gray-600 font-semibold mt-4">Loading referral data...</p>
          </div>
        </div>
      </>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Head><title>Referral Payout - RenewableZmart</title></Head>
      <Header />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 Referral Payout Management</h1>
            <p className="text-gray-600">Track your earnings and request payouts</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Referral Code Section */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Referral Code Card */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl shadow-lg p-8 border border-teal-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Your Referral Code</h3>
                  <div className="text-4xl">🎁</div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border-2 border-teal-300 mb-6 text-center">
                  <p className="text-sm font-semibold text-gray-600 mb-2">SHARE THIS CODE</p>
                  <p className="text-4xl font-bold text-teal-600 font-mono">{stats.referralCode}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Share your referral link:</p>
                  <div className="bg-white p-3 rounded-lg border border-gray-200 flex gap-2">
                    <input
                      type="text"
                      value={stats.referralLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 text-sm text-gray-600 rounded"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(stats.referralLink)
                        alert('Referral link copied!')
                      }}
                      className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 font-semibold transition text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Commission Summary Card */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg p-8 border border-blue-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Commission Summary</h3>
                  <div className="text-4xl">📊</div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-700 font-semibold">Total Clicks:</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.totalClicks}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-700 font-semibold">Successful Purchases:</span>
                    <span className="text-2xl font-bold text-emerald-600">{stats.successfulPurchases}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-700 font-semibold">Conversion Rate:</span>
                    <span className="text-2xl font-bold text-purple-600">{stats.conversionRate.toFixed(2)}%</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600">💡 You earn 1% commission on every purchase made by customers you refer</p>
              </div>
            </div>
          )}

          {/* Earnings & Payout Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Commission */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <p className="text-sm font-semibold text-gray-600 mb-2">TOTAL EARNED</p>
              <p className="text-3xl font-bold text-emerald-600">
                {stats ? formatPrice(stats.totalCommission) : '₦0'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Lifetime earnings</p>
            </div>

            {/* Pending Commission */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-amber-200 bg-amber-50">
              <p className="text-sm font-semibold text-amber-700 mb-2">PENDING</p>
              <p className="text-3xl font-bold text-amber-600">
                {stats ? formatPrice(stats.pendingCommission) : '₦0'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Awaiting payout</p>
            </div>

            {/* Request Payout Button */}
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white flex flex-col justify-between">
              <div>
                <p className="text-sm font-semibold opacity-90 mb-2">REQUEST PAYOUT</p>
                <p className="text-lg font-bold">
                  {stats ? formatPrice(stats.totalCommission) : '₦0'} Available
                </p>
              </div>
              <button
                onClick={() => setShowPayoutForm(!showPayoutForm)}
                disabled={!stats || stats.totalCommission <= 0}
                className="mt-4 w-full px-4 py-3 bg-white text-teal-600 font-bold rounded-lg hover:bg-gray-100 active:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showPayoutForm ? 'Cancel Request' : '💰 Request Payout'}
              </button>
            </div>
          </div>

          {/* Payout Request Form */}
          {showPayoutForm && (
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Payout Request Form</h3>

              <form onSubmit={handleSubmitPayout} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-700">
                    📝 Please provide your bank details for payout processing. Make sure all information is accurate.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bank Account Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Account Name *</label>
                    <input
                      type="text"
                      value={formData.bankAccountName}
                      onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                      placeholder="Full name on bank account"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bank Name *</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g., First Bank, GTBank, Access Bank"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Account Number *</label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      placeholder="10-digit account number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Bank Code */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bank Code</label>
                    <input
                      type="text"
                      value={formData.bankCode}
                      onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                      placeholder="e.g., 011, 005, 044"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  {/* Bank Country */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bank Country</label>
                    <input
                      type="text"
                      value={formData.bankCountry}
                      onChange={(e) => setFormData({ ...formData, bankCountry: e.target.value })}
                      placeholder="e.g., Nigeria, Ghana"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  {/* Payout Amount */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Payout Amount *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-600 font-bold">₦</span>
                      <input
                        type="number"
                        value={formData.requestedAmount}
                        onChange={(e) => setFormData({ ...formData, requestedAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="Amount to withdraw"
                        min="1"
                        max={stats?.totalCommission || 0}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {stats ? formatPrice(stats.totalCommission) : '₦0'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowPayoutForm(false)}
                    className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {submitting ? '⏳ Processing...' : '💰 Submit Payout Request'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payout History */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">📜 Payout History</h3>

            {payoutHistory && payoutHistory.length > 0 ? (
              <div className="space-y-4">
                {payoutHistory.map((payout) => (
                  <div key={payout.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{formatPrice(payout.amount)}</p>
                        <p className="text-sm text-gray-600">
                          Requested on {new Date(payout.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                        payout.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        payout.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        payout.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {payout.status.toUpperCase()}
                      </div>
                    </div>

                    {payout.paidAt && (
                      <p className="text-sm text-gray-600 mb-2">
                        ✅ Paid on {new Date(payout.paidAt).toLocaleDateString()}
                      </p>
                    )}

                    {payout.notes && (
                      <p className="text-sm text-gray-600 mt-2 p-3 bg-gray-50 rounded">
                        📝 {payout.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">No payout requests yet</p>
                <p className="text-gray-500 text-sm mt-1">Start earning and request your first payout</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

