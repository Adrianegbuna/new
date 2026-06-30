import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuthStore } from '../store/authStore';
import { useCurrency } from '../context/CurrencyContext';

interface ReferralDashboard {
  referralCode: string;
  referralLink: string;
  status: string;
  stats: {
    totalClicks: number;
    totalReferred: number;
    successfulPurchases: number;
    totalEarned: number;
    totalCommission: number;
    pendingCommission: number;
  };
  recentOrders: Array<{
    id: string;
    orderId: string;
    orderAmount: number;
    commissionEarned: number;
    status: string;
    createdAt: string;
  }>;
}

interface ReferralOrder {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionEarned: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function ReferralsPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [orders, setOrders] = useState<ReferralOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else {
      fetchDashboard();
      if (activeTab === 'orders') {
        fetchOrders();
      }
    }
  }, [token, router, activeTab, currentPage, pageSize, filterStatus]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/dashboard`
      );
      setDashboard(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No referral code exists, try to generate one
        try {
          const generateResponse = await apiClient.post(
            `${process.env.NEXT_PUBLIC_API_URL}/referrals/generate`,
            {}
          );
          if (generateResponse.data.data) {
            setDashboard({
              referralCode: generateResponse.data.data.referralCode,
              referralLink: generateResponse.data.data.referralLink,
              status: generateResponse.data.data.status,
              stats: {
                totalClicks: 0,
                totalReferred: 0,
                successfulPurchases: 0,
                totalEarned: 0,
                totalCommission: 0,
                pendingCommission: 0
              },
              recentOrders: []
            });
          }
        } catch (generateError) {
          console.error('Failed to generate referral code:', generateError);
        }
      } else {
        console.error('Failed to fetch referral dashboard:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/referrals/orders?page=${currentPage}&limit=${pageSize}&status=${filterStatus}`
      );
      setOrders(response.data.data);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch referral orders:', error);
    }
  };

  const handleCopyLink = () => {
    if (dashboard) {
      navigator.clipboard.writeText(dashboard.referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (!token || !user) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-black">Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>My Referrals - RenewableZmart</title>
      </Head>

      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 My Referral Program</h1>
            <p className="text-black">Earn commissions by referring customers to RenewableZmart</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-black">Loading your referral data...</p>
            </div>
          ) : !dashboard ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-black text-lg mb-4">You don't have a referral code yet</p>
              <p className="text-black mb-6">Create a referral code to start earning commissions</p>
              <button
                onClick={async () => {
                  try {
                    await apiClient.post(
                      `${process.env.NEXT_PUBLIC_API_URL}/referrals/generate`,
                      {}
                    );
                    fetchDashboard();
                  } catch (error) {
                    alert('Failed to generate referral code');
                  }
                }}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
              >
                Generate Referral Code
              </button>
            </div>
          ) : (
            <>
              {/* Referral Code Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-8 mb-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Your Referral Code</h2>
                <div className="bg-white/10 rounded-lg p-6 mb-6 backdrop-blur">
                  <p className="text-sm text-emerald-100 mb-2">Share this code:</p>
                  <div className="flex items-center gap-3">
                    <code className="text-2xl font-mono font-bold">{dashboard.referralCode}</code>
                    <button
                      onClick={handleCopyLink}
                      className="ml-auto bg-white text-emerald-600 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition"
                    >
                      {copySuccess ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                  <p className="text-xs text-emerald-100 mt-3 break-all">{dashboard.referralLink}</p>
                </div>
                <p className="text-sm text-emerald-100">Status: <span className="font-bold uppercase">{dashboard.status}</span></p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-sm text-black mb-2">👥 Total Referred</p>
                  <p className="text-4xl font-bold text-blue-600">{dashboard.stats.totalReferred}</p>
                  <p className="text-xs text-black mt-2">{dashboard.stats.totalClicks} clicks</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-sm text-black mb-2">✅ Successful Purchases</p>
                  <p className="text-4xl font-bold text-green-600">{dashboard.stats.successfulPurchases}</p>
                  <p className="text-xs text-black mt-2">Conversion rate: {dashboard.stats.totalReferred > 0 ? ((dashboard.stats.successfulPurchases / dashboard.stats.totalReferred) * 100).toFixed(1) : 0}%</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-sm text-black mb-2">💰 Total Earned</p>
                  <p className="text-4xl font-bold text-emerald-600">{formatPrice(dashboard.stats.totalEarned)}</p>
                  <p className="text-xs text-black mt-2">Pending: {formatPrice(dashboard.stats.pendingCommission)}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-md mb-8">
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-4 px-6 font-semibold transition ${
                      activeTab === 'overview'
                        ? 'border-b-2 border-emerald-600 text-emerald-600'
                        : 'text-black hover:text-gray-900'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 py-4 px-6 font-semibold transition ${
                      activeTab === 'orders'
                        ? 'border-b-2 border-emerald-600 text-emerald-600'
                        : 'text-black hover:text-gray-900'
                    }`}
                  >
                    All Orders
                  </button>
                </div>

                {activeTab === 'overview' ? (
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-4">Recent Referral Orders</h3>
                    {dashboard.recentOrders.length === 0 ? (
                      <p className="text-black">No orders yet</p>
                    ) : (
                      <div className="space-y-3">
                        {dashboard.recentOrders.map((order) => (
                          <div key={order.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <div>
                              <p className="font-bold text-gray-900">{formatPrice(order.orderAmount)}</p>
                              <p className="text-sm text-black">Order: {order.orderId.substring(0, 8)}...</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-emerald-600">{formatPrice(order.commissionEarned)}</p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                order.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6">
                    {/* Filters */}
                    <div className="mb-6 flex gap-4">
                      <select
                        value={filterStatus}
                        onChange={(e) => {
                          setFilterStatus(e.target.value as any);
                          setCurrentPage(1);
                        }}
                        className="px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>

                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(parseInt(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-4 py-2 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>

                    {/* Orders Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left py-3 px-4 font-bold text-gray-900">Order ID</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900">Order Amount</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900">Commission Rate</th>
                            <th className="text-right py-3 px-4 font-bold text-gray-900">Earned</th>
                            <th className="text-center py-3 px-4 font-bold text-gray-900">Status</th>
                            <th className="text-left py-3 px-4 font-bold text-gray-900">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50 transition">
                              <td className="py-3 px-4 font-mono text-sm">{order.orderId.substring(0, 8)}...</td>
                              <td className="py-3 px-4 text-right font-semibold">{formatPrice(order.orderAmount)}</td>
                              <td className="py-3 px-4 text-right text-sm">{(order.commissionRate * 100).toFixed(3)}%</td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatPrice(order.commissionEarned)}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  order.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : order.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-black">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {orders.length > 0 && (
                      <div className="mt-6 flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-black">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-400 rounded-lg text-sm font-bold text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-400 rounded-lg text-sm font-bold text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}




