import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { ProtectAdminPage } from '@/components/services-requests/ProtectAdminPage';
import { apiClient } from '@/lib/api-client';

interface Referral {
  id: string;
  referrerName?: string;
  referrerEmail?: string;
  referrerPhone?: string;
  referrer?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  user?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
  referralCode?: string;
  status?: string;
  totalReferred?: number;
  successfulPurchases?: number;
  totalCommission?: number;
  createdAt?: string;
}

interface ReferralStats {
  totalReferrals?: number;
  activeReferrals?: number;
  totalClicks?: number;
  totalOrders?: number;
  approvedOrders?: number;
  totalCommission?: number;
}

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [referralsRes, statsRes] = await Promise.all([
        apiClient.get('/referrals/admin/all?page=1&limit=50&sortBy=createdAt&sortOrder=DESC'),
        apiClient.get('/referrals/admin/stats'),
      ]);

      const referralsPayload = referralsRes.data?.data?.data ?? referralsRes.data?.data ?? referralsRes.data ?? [];
      const statsPayload = statsRes.data?.data ?? statsRes.data ?? null;
      setReferrals(Array.isArray(referralsPayload) ? referralsPayload : []);
      setStats(statsPayload);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      setReferrals([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (referralId: string, status: string) => {
    setUpdatingId(referralId);
    try {
      try {
        await apiClient.patch(`/referrals/admin/${referralId}/status`, { status });
      } catch {
        await apiClient.put(`/referrals/admin/${referralId}/status`, { status });
      }

      setReferrals((prev) =>
        prev.map((item) => (item.id === referralId ? { ...item, status } : item))
      );
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update referral status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Referral Management - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Management</h1>
          <p className="text-gray-700 font-semibold mb-6">Track referral activity and commissions.</p>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-xs font-bold text-gray-700">Total Referrals</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalReferrals || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-xs font-bold text-gray-700">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeReferrals || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-xs font-bold text-gray-700">Clicks</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalClicks || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-xs font-bold text-gray-700">Orders</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalOrders || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-xs font-bold text-gray-700">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.approvedOrders || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-xs font-bold text-gray-700">Commission</p>
                <p className="text-2xl font-bold text-indigo-600">₦{(stats.totalCommission || 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-auto">
            {loading ? (
              <div className="p-6 text-gray-900 font-semibold">Loading referrals...</div>
            ) : referrals.length === 0 ? (
              <div className="p-6 text-gray-900 font-semibold">No referral records found.</div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-900">Referral Owner</th>
                    <th className="text-left p-3 font-bold text-gray-900">Email</th>
                    <th className="text-left p-3 font-bold text-gray-900">Phone</th>
                    <th className="text-left p-3 font-bold text-gray-900">Code</th>
                    <th className="text-left p-3 font-bold text-gray-900">Status</th>
                    <th className="text-right p-3 font-bold text-gray-900">Referred</th>
                    <th className="text-right p-3 font-bold text-gray-900">Purchases</th>
                    <th className="text-right p-3 font-bold text-gray-900">Commission</th>
                    <th className="text-left p-3 font-bold text-gray-900">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((item) => {
                    const owner = item.referrer || item.user || {};
                    const ownerName =
                      (owner.fullName && String(owner.fullName).trim()) ||
                      `${owner.firstName || ''} ${owner.lastName || ''}`.trim() ||
                      item.referrerName ||
                      'N/A';
                    const ownerEmail = owner.email || item.referrerEmail || 'N/A';
                    const ownerPhone = owner.phone || item.referrerPhone || 'N/A';
                    const statusValue = (item.status || 'active').toLowerCase();

                    return (
                      <tr key={item.id} className="border-b">
                        <td className="p-3 font-semibold text-gray-900">{ownerName}</td>
                        <td className="p-3 font-semibold text-gray-900">{ownerEmail}</td>
                        <td className="p-3 font-semibold text-gray-900">{ownerPhone}</td>
                        <td className="p-3 font-semibold text-gray-900">{item.referralCode || 'N/A'}</td>
                        <td className="p-3 font-semibold text-gray-900">
                          <select
                            value={statusValue}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            disabled={updatingId === item.id}
                            className="px-2 py-1 border rounded font-semibold text-gray-900 bg-white disabled:opacity-60"
                          >
                            <option value="active">active</option>
                            <option value="pending">pending</option>
                            <option value="approved">approved</option>
                            <option value="rejected">rejected</option>
                            <option value="inactive">inactive</option>
                          </select>
                        </td>
                        <td className="p-3 text-right font-semibold text-gray-900">{item.totalReferred || 0}</td>
                        <td className="p-3 text-right font-semibold text-gray-900">{item.successfulPurchases || 0}</td>
                        <td className="p-3 text-right font-semibold text-gray-900">
                          ₦{(item.totalCommission || 0).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-gray-900">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </ProtectAdminPage>
  );
}


