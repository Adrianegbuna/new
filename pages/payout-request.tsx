import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';

interface PayoutRequest {
  id: string;
  userType: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  bankCode?: string;
  requestedAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
  rejectionReason?: string;
  adminNotes?: string;
  transactionReference?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export default function PayoutRequest() {
  const router = useRouter();
  const { token, user, isHydrated } = useAuthStore();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    bankCode: '',
    requestedAmount: 0,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isHydrated) return;

    if (!token || !user) {
      router.push('/login');
    } else {
      fetchRequests();
      calculateBalance();
    }
  }, [isHydrated, token, user, router]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/payouts/my-requests');
      setRequests(response.data?.data || response.data || []);
    } catch (error: any) {
      console.error('Error fetching payout requests:', error);
      setError('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = async () => {
    try {
      let balance = 0;
      const role = String(user?.role || '').toLowerCase();

      // Referral earnings should come from real approved referral orders only.
      if (role === 'customer' || role === 'installer') {
        const statsRes = await apiClient.get('/referrals/my-stats').catch(() => null);
        const totalCommission = Number(statsRes?.data?.totalCommission || 0);
        balance = Number.isFinite(totalCommission) ? totalCommission : 0;
      }

      setTotalBalance(balance);
    } catch (error) {
      console.error('Error calculating balance:', error);
      setTotalBalance(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'requestedAmount' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.bankName || !formData.accountNumber || !formData.accountHolderName) {
      setError('All bank details are required');
      return;
    }

    if (formData.requestedAmount <= 0) {
      setError('Payout amount must be greater than ₦0');
      return;
    }

    if (formData.requestedAmount > totalBalance) {
      setError(`Requested amount cannot exceed your balance of ₦${totalBalance.toLocaleString()}`);
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post(
        '/payouts',
        formData
      );

      setSuccess('Payout request submitted successfully! Our team will review and process it shortly.');
      setFormData({
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        bankCode: '',
        requestedAmount: 0,
      });
      setShowForm(false);

      // Refresh requests
      await fetchRequests();
    } catch (error: any) {
      console.error('Error submitting payout request:', error);
      setError(error.response?.data?.message || 'Failed to submit payout request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this payout request?')) return;

    try {
      await apiClient.post(
        `/payouts/${requestId}/cancel`
      );
      setSuccess('Payout request cancelled successfully');
      await fetchRequests();
    } catch (error: any) {
      console.error('Error cancelling payout request:', error);
      setError(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'processing':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✓';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'rejected':
        return '✗';
      case 'cancelled':
        return '⊘';
      default:
        return '•';
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 Payout Requests</h1>
              <p className="text-black font-bold">Request withdrawal of your earnings</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
            >
              {showForm ? 'Cancel' : '+ New Payout Request'}
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <p className="text-green-800 font-semibold">{success}</p>
          </div>
        )}

        {/* Available Balance Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg shadow-lg p-8 text-white">
            <p className="text-green-100 text-sm font-semibold mb-2 uppercase tracking-wide">Available Balance</p>
            <h2 className="text-5xl font-bold mb-4">₦{totalBalance.toLocaleString()}</h2>
            <p className="text-green-100 text-sm">
              {user?.role === 'vendor'
                ? 'From your store sales and commissions'
                : user?.role === 'installer'
                ? 'From completed installation jobs'
                : 'From referral rewards and commissions'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-green-600">
            <p className="text-black font-bold text-sm mb-2">KEY INFORMATION</p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span className="text-gray-700">
                  <span className="font-semibold">Minimum payout:</span> ₦5,000
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span className="text-gray-700">
                  <span className="font-semibold">Processing time:</span> 2-5 business days
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 font-bold mt-1">•</span>
                <span className="text-gray-700">
                  <span className="font-semibold">Bank details:</span> Ensure accuracy to avoid delays
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payout Request Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8 border-t-4 border-green-600">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Payout Request</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Payout Amount 💰
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-xl font-bold text-gray-600">₦</span>
                  <input
                    type="number"
                    name="requestedAmount"
                    value={formData.requestedAmount}
                    onChange={handleInputChange}
                    placeholder="e.g. 50,000"
                    className="w-full pl-8 pr-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="5000"
                    max={totalBalance}
                    step="1000"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Available: ₦{totalBalance.toLocaleString()}
                </p>
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Bank Name 🏦
                </label>
                <select
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select your bank</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="GTBank">Guaranty Trust Bank (GTBank)</option>
                  <option value="First Bank">First Bank</option>
                  <option value="UBA">United Bank for Africa (UBA)</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="FCMB">FCMB Bank</option>
                  <option value="Eco Bank">Eco Bank</option>
                  <option value="Fidelity Bank">Fidelity Bank</option>
                  <option value="Heritage Bank">Heritage Bank</option>
                  <option value="Polaris Bank">Polaris Bank</option>
                  <option value="Stanbic IBTC">Stanbic IBTC</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Account Number 🔢
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your 10-digit account number"
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  maxLength={20}
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Account Holder Name 👤
                </label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleInputChange}
                  placeholder="Full name as on bank account"
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Bank Code (Optional) */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Bank Code (Optional) 🏷️
                </label>
                <input
                  type="text"
                  name="bankCode"
                  value={formData.bankCode}
                  onChange={handleInputChange}
                  placeholder="Enter bank code if known"
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Payout Request'}
              </button>
            </form>
          </div>
        )}

        {/* Payout Requests List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Payout Requests</h2>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-black font-bold">Loading payout requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-700 font-semibold mb-4">No payout requests yet</p>
              <p className="text-gray-600 text-sm mb-6">
                Start receiving payments by submitting your first payout request
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Create Request
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-green-600"
                >
                  {/* Summary */}
                  <div
                    onClick={() =>
                      setExpandedRequestId(
                        expandedRequestId === request.id ? null : request.id
                      )
                    }
                    className="p-6 cursor-pointer hover:bg-gray-50 transition flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{getStatusIcon(request.status)}</div>
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-black font-bold uppercase">Amount</p>
                              <p className="text-lg font-bold text-gray-900">
                                ₦{request.requestedAmount.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-black font-bold uppercase">Status</p>
                              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(request.status)}`}>
                                {request.status}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-black font-bold uppercase">Date</p>
                              <p className="text-sm font-semibold text-gray-700">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-black font-bold uppercase">Bank</p>
                              <p className="text-sm font-semibold text-gray-700">
                                {request.bankName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 text-2xl text-gray-400">
                      {expandedRequestId === request.id ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* Details */}
                  {expandedRequestId === request.id && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <p className="text-sm text-black font-bold uppercase mb-2">Account Details</p>
                          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">Account Holder</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {request.accountHolderName}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">Account Number</p>
                              <p className="text-sm font-mono text-gray-900">
                                {request.accountNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">Bank</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {request.bankName}
                                {request.bankCode && ` (${request.bankCode})`}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-black font-bold uppercase mb-2">Timeline</p>
                          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">Requested</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(request.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            {request.processedAt && (
                              <div>
                                <p className="text-xs text-gray-600 font-semibold">Processed</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {new Date(request.processedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                              </div>
                            )}
                            {request.transactionReference && (
                              <div>
                                <p className="text-xs text-gray-600 font-semibold">
                                  Transaction Ref
                                </p>
                                <p className="text-sm font-mono text-gray-900">
                                  {request.transactionReference}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {request.rejectionReason && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="text-xs text-red-700 font-bold uppercase mb-1">
                            Rejection Reason
                          </p>
                          <p className="text-sm text-red-700">{request.rejectionReason}</p>
                        </div>
                      )}

                      {request.adminNotes && (
                        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                          <p className="text-xs text-blue-700 font-bold uppercase mb-1">
                            Admin Notes
                          </p>
                          <p className="text-sm text-blue-700">{request.adminNotes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {request.status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleCancel(request.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm transition"
                          >
                            Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

