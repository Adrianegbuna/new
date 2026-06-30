import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '../../lib/api-client';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuthStore } from '../../store/authStore';

interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType?: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
}

interface PayoutRequest {
  id: string;
  store: Store;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  bankDetails: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function VendorPayoutRequests() {
  const router = useRouter();
  const { token, user, isHydrated } = useAuthStore();
  const [stores, setStores] = useState<Store[]>([]);
  const [myRequests, setMyRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    storeId: '',
    amount: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    accountType: 'savings',
  });

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!token || (user?.role !== 'vendor' && user?.accountType !== 'ev_vendor')) {
      router.push('/login');
    } else {
      fetchData();
    }
  }, [isHydrated, token, user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch vendor's stores
      const storesResponse = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/stores/my-stores`
      );
      setStores(storesResponse.data.data || []);

      // Fetch vendor's payout requests
      const requestsResponse = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/store-payouts/my-requests`
      );
      setMyRequests(requestsResponse.data.data || []);

      // Set default store
      if (storesResponse.data.data?.length > 0) {
        setFormData(prev => ({
          ...prev,
          storeId: storesResponse.data.data[0].id
        }));
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.storeId) {
      setError('Please select a store');
      return;
    }

    const amount = parseInt(formData.amount);
    if (!amount || amount < 10000) {
      setError('Minimum payout request amount is ₦10,000');
      return;
    }

    if (!formData.bankName || !formData.accountName || !formData.accountNumber) {
      setError('Please fill in all bank details');
      return;
    }

    if (formData.accountNumber.length < 10) {
      setError('Invalid account number');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(
        `${process.env.NEXT_PUBLIC_API_URL}/store-payouts/create`,
        {
          storeId: formData.storeId,
          amount: amount,
          bankDetails: {
            bankName: formData.bankName,
            accountName: formData.accountName,
            accountNumber: formData.accountNumber,
            accountType: formData.accountType,
          }
        }
      );

      setSuccess('Payout request submitted successfully! Your request is pending admin approval.');
      setFormData({
        storeId: stores[0]?.id || '',
        amount: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        accountType: 'savings',
      });
      await fetchData();
    } catch (error: any) {
      console.error('Failed to submit payout request:', error);
      setError(error.response?.data?.message || 'Failed to submit payout request');
    } finally {
      setSubmitting(false);
    }
  };

  const parseBankDetails = (bankDetailsStr: string): BankDetails => {
    try {
      return JSON.parse(bankDetailsStr);
    } catch {
      return { bankName: 'N/A', accountName: 'N/A', accountNumber: 'N/A' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <p className="text-black font-bold">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Request Payout</h1>
          <p className="text-black font-bold">Submit a payout request from your store earnings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">New Payout Request</h2>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <p className="text-red-700 font-bold">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                  <p className="text-green-700 font-bold">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Store Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Select Store
                  </label>
                  <select
                    name="storeId"
                    value={formData.storeId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-black font-semibold"
                  >
                    <option value="">Choose a store...</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name} ({store.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Payout Amount (₦)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="e.g. 25,000"
                    min="10000"
                    step="1000"
                    required
                    className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">Minimum amount: ₦10,000</p>
                </div>

                {/* Bank Details */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>

                  {/* Bank Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleInputChange}
                      placeholder="e.g., GTBank, Access Bank, First Bank..."
                      required
                      className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Account Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Account Name
                    </label>
                    <input
                      type="text"
                      name="accountName"
                      value={formData.accountName}
                      onChange={handleInputChange}
                      placeholder="Your account holder name"
                      required
                      className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Account Number */}
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      placeholder="Your account number"
                      required
                      className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Account Type */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Account Type
                    </label>
                    <select
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 bg-white text-black font-semibold"
                    >
                      <option value="savings">Savings</option>
                      <option value="current">Current</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="border-t pt-6 flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Payout Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 font-bold"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border-l-4 border-green-500">
              <h3 className="text-lg font-bold text-gray-900 mb-4">℠ Quick Tips</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li>✓ Minimum payout is ₦10,000</li>
                <li>✓ Requests are processed within 2-3 business days</li>
                <li>✓ Ensure bank details are correct and match your account</li>
                <li>✓ You'll receive email confirmation once approved</li>
                <li>✓ Rejected requests show the reason for resubmission</li>
              </ul>
            </div>

            {/* Status Legend */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Request Status Guide</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800">Pending</span>
                  <p className="text-gray-600">Awaiting admin review</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">Approved</span>
                  <p className="text-gray-600">In processing queue</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">Completed</span>
                  <p className="text-gray-600">Payment sent to bank</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">Rejected</span>
                  <p className="text-gray-600">Please resubmit</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Requests */}
        {myRequests.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Payout Requests</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-900 bg-white rounded-lg shadow-sm">
                <thead className="bg-gray-100 font-bold">
                  <tr>
                    <th className="px-4 py-3 text-left">Store</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Bank</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.slice(0, 5).map((request) => {
                    const bankDetails = parseBankDetails(request.bankDetails);
                    return (
                      <tr key={request.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold">{request.store.name}</td>
                        <td className="px-4 py-3 font-bold text-green-600">
                          ₦{request.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold">{bankDetails.bankName}</p>
                          <p className="text-gray-600">...{bankDetails.accountNumber?.slice(-4)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

