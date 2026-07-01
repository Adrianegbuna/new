import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import Head from 'next/head';
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';

interface ReturnRequest {
  id: string;
  orderId: string;
  rmaNumber: string;
  reason: string;
  description: string;
  status: string;
  refundAmount: number;
  requestedAt: string;
  approvedAt: string;
  receivedAt: string;
  trackingNumber: string;
}

export default function ReturnsPage() {
  const router = useRouter();
  const { user, token, isHydrated } = useAuthStore();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    reason: 'defective',
    description: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Wait for auth store to hydrate before checking authentication
    if (!isHydrated) {
      return;
    }

    if (!user || !token) {
      router.push('/login');
      return;
    }
    fetchReturns();
  }, [isHydrated, user, token, router]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/returns`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReturns(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      setMessage('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId) {
      setMessage('Please select an order');
      return;
    }

    try {
      const response = await apiClient.post(
        `${process.env.NEXT_PUBLIC_API_URL}/returns/request`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage('Return request submitted successfully!');
      setFormData({ orderId: '', reason: 'defective', description: '' });
      setShowForm(false);
      fetchReturns();
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      setMessage(`❌ ${error.response?.data?.error || 'Failed to submit return'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'received': return 'bg-indigo-100 text-indigo-800';
      case 'refunded': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-900 font-bold';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'requested': return '📤';
      case 'approved': return '✅';
      case 'shipped': return '📦';
      case 'received': return '✔️';
      case 'rejected': return '❌';
      case 'rejected': return '?';
      default: return '?';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
          <p className="mt-4 text-black">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Returns & Refunds - RenewableZmart</title>
      </Head>

      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">↩️ Returns & Refunds</h1>
              <p className="text-black">Manage your return requests and refunds</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-900 transition"
            >
              + New Return Request
            </button>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              {message}
            </div>
          )}

          {/* Return Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Return Request</h2>
              
              <form onSubmit={handleSubmitReturn} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Order ID *
                  </label>
                  <input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    placeholder="Enter your order number"
                    className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-black mt-1">Check your order confirmation email for the order number</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Reason for Return *
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="defective">Product is defective</option>
                    <option value="wrong_item">Received wrong item</option>
                    <option value="not_as_described">Item doesn't match description</option>
                    <option value="changed_mind">Changed my mind</option>
                    <option value="damaged">Item arrived damaged</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Additional Details
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Please provide more details about your return request..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-semibold hover:bg-slate-900 transition"
                  >
                    Submit Return Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Returns List */}
          {returns.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🔄</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No return requests yet</h2>
              <p className="text-black mb-6">All your returns and refunds will appear here</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-900 transition"
              >
                Create Return Request
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map((returnItem) => (
                <div key={returnItem.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getStatusIcon(returnItem.status)}</span>
                        <div>
                          <p className="text-sm text-black">RMA Number</p>
                          <p className="font-bold text-lg">{returnItem.rmaNumber}</p>
                        </div>
                      </div>
                      <p className="text-sm text-black">Order: {returnItem.orderId}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(returnItem.status)}`}>
                      {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-black mb-2"><strong>Reason:</strong> {returnItem.reason}</p>
                    {returnItem.description && (
                      <p className="text-sm text-gray-900 font-bold"><strong>Details:</strong> {returnItem.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-black">Requested</p>
                      <p className="font-semibold">{new Date(returnItem.requestedAt).toLocaleDateString()}</p>
                    </div>
                    {returnItem.approvedAt && (
                      <div>
                        <p className="text-black">Approved</p>
                        <p className="font-semibold">{new Date(returnItem.approvedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                    {returnItem.trackingNumber && (
                      <div>
                        <p className="text-black">Tracking</p>
                        <p className="font-semibold">{returnItem.trackingNumber}</p>
                      </div>
                    )}
                    {returnItem.refundAmount && (
                      <div>
                        <p className="text-black">Refund Amount</p>
                        <p className="font-semibold text-green-600">?{returnItem.refundAmount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedReturn(selectedReturn?.id === returnItem.id ? null : returnItem)}
                    className="mt-4 text-orange-500 font-semibold hover:text-orange-600 text-sm"
                  >
                    {selectedReturn?.id === returnItem.id ? 'Hide Details' : 'View Details'}
                  </button>

                  {selectedReturn?.id === returnItem.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-black">Status Timeline</p>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              <span>Request Submitted</span>
                            </div>
                            {returnItem.approvedAt && (
                              <div className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                <span>Approved</span>
                              </div>
                            )}
                            {returnItem.trackingNumber && (
                              <div className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                <span>Shipped to us</span>
                              </div>
                            )}
                            {returnItem.receivedAt && (
                              <div className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                <span>Received</span>
                              </div>
                            )}
                            {returnItem.status === 'refunded' && (
                              <div className="flex items-center gap-2">
                                <span className="text-green-500">✓</span>
                                <span>Refunded</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-black mb-2">Return Status</p>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-900 font-bold">
                              {returnItem.status === 'requested' && 'Your return request is being reviewed. We will notify you within 2-3 business days.'}
                              {returnItem.status === 'approved' && 'Your return has been approved. A shipping label will be sent to you via email.'}
                              {returnItem.status === 'shipped' && 'Your return is on its way to us. Track your shipment using the provided tracking number.'}
                              {returnItem.status === 'received' && 'We have received your return. Refund processing will begin shortly.'}
                              {returnItem.status === 'refunded' && 'Your refund has been processed. It may take 3-5 business days to appear in your account.'}
                              {returnItem.status === 'rejected' && 'Unfortunately, your return request was not approved.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Return Policy Info */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">📦 Our Return Policy</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="font-bold text-gray-900 mb-2">30-Day Returns</p>
                <p className="text-gray-900 font-bold">Return items within 30 days of purchase for a full refund</p>
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-2">Free Return Shipping</p>
                <p className="text-gray-900 font-bold">We provide a free return shipping label for eligible items</p>
              </div>
              <div>
                <p className="font-bold text-gray-900 mb-2">Fast Processing</p>
                <p className="text-gray-900 font-bold">Refunds processed within 5-7 business days after receipt</p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}



