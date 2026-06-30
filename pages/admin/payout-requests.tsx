import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../store/authStore';

interface PayoutRequest {
  id: string;
  userId: string;
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

interface RefundUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface RefundOrder {
  id?: string;
  orderNumber?: string;
  total?: number;
  totalPrice?: number;
  paymentStatus?: string;
}

interface RefundRequest {
  id: string;
  orderId?: string;
  userId?: string;
  rmaNumber?: string;
  reason?: string;
  description?: string;
  status?: 'requested' | 'approved' | 'rejected' | 'returned' | 'refunded';
  refundAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: RefundUser;
  order?: RefundOrder;
}

interface PaginatedResponse {
  data: PayoutRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function PayoutRequestManagement() {
  const router = useRouter();
  const { token, user, isHydrated } = useAuthStore();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [filterUserType, setFilterUserType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject' | 'process' | 'complete' | null;
  }>({ type: null });

  const [actionData, setActionData] = useState({
    adminNotes: '',
    rejectionReason: '',
    transactionReference: '',
  });

  const [stats, setStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalProcessing: 0,
    totalCompleted: 0,
    totalAmount: 0,
  });

  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isHydrated) return;

    if (!token || user?.role !== 'admin') {
      router.push('/login');
    } else {
      fetchRequests();
      fetchStats();
      fetchRefunds();
    }
  }, [isHydrated, token, user, router, page, filterUserType, filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filterUserType) params.append('userType', filterUserType);
      if (filterStatus) params.append('status', filterStatus);

      const response = await apiClient.get<{ data: PaginatedResponse }>(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts?${params.toString()}`
      );

      console.log('Payout requests response:', response.data);
      
      const paginatedData = response.data?.data;
      if (paginatedData) {
        setRequests(paginatedData.data || []);
        setTotal(paginatedData.total || 0);
        setTotalPages(paginatedData.totalPages || 0);
      }
    } catch (error: any) {
      console.error('Error fetching payout requests:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/admin/stats`
      );
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRefunds = async () => {
    try {
      setRefundsLoading(true);
      const response = await apiClient.get(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/returns`
      );
      const payload = response.data?.data ?? response.data ?? [];
      setRefunds(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      console.error('Error fetching refund requests:', error.response?.data || error.message);
    } finally {
      setRefundsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await apiClient.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/${selectedRequest.id}/approve`,
        { adminNotes: actionData.adminNotes }
      );

      setSuccess('Payout request approved successfully');
      setActionModal({ type: null });
      setSelectedRequest(null);
      setActionData({ adminNotes: '', rejectionReason: '', transactionReference: '' });
      await fetchRequests();
      await fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !actionData.rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      await apiClient.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/${selectedRequest.id}/reject`,
        { rejectionReason: actionData.rejectionReason }
      );

      setSuccess('Payout request rejected');
      setActionModal({ type: null });
      setSelectedRequest(null);
      setActionData({ adminNotes: '', rejectionReason: '', transactionReference: '' });
      await fetchRequests();
      await fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleMarkProcessing = async () => {
    if (!selectedRequest) return;

    try {
      await apiClient.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/${selectedRequest.id}/mark-processing`
      );

      setSuccess('Marked as processing');
      setActionModal({ type: null });
      setSelectedRequest(null);
      await fetchRequests();
      await fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to mark as processing');
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedRequest || !actionData.transactionReference.trim()) {
      setError('Transaction reference is required');
      return;
    }

    try {
      await apiClient.post(
        `${process.env.NEXT_PUBLIC_API_URL}/payouts/${selectedRequest.id}/mark-completed`,
        { transactionReference: actionData.transactionReference }
      );

      setSuccess('Payout marked as completed');
      setActionModal({ type: null });
      setSelectedRequest(null);
      setActionData({ adminNotes: '', rejectionReason: '', transactionReference: '' });
      await fetchRequests();
      await fetchStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to mark as completed');
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

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-100 text-blue-700';
      case 'vendor':
        return 'bg-purple-100 text-purple-700';
      case 'installer':
        return 'bg-slate-900 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return '👤';
      case 'vendor':
        return '🏪';
      case 'installer':
        return '🔧';
      default:
        return '•';
    }
  };

  if (!isHydrated) return null;

  const formatCurrency = (value: number | undefined) =>
    `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const getRefundCustomerName = (refund: RefundRequest) => {
    const first = refund.user?.firstName || '';
    const last = refund.user?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || refund.user?.email || refund.userId || 'N/A';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 Payout Requests Management</h1>
          <p className="text-black font-bold">Manage and process all user payout requests</p>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-black font-bold text-sm font-medium">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.totalPending}</p>
            <p className="text-xs text-black font-bold mt-1">Awaiting approval</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-black font-bold text-sm font-medium">Approved</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalApproved}</p>
            <p className="text-xs text-black font-bold mt-1">Ready to process</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-black font-bold text-sm font-medium">Processing</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalProcessing}</p>
            <p className="text-xs text-black font-bold mt-1">Being transferred</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-black font-bold text-sm font-medium">Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalCompleted}</p>
            <p className="text-xs text-black font-bold mt-1">Successful payouts</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-600">
            <p className="text-black font-bold text-sm font-medium">Total Pending</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₦{formatCurrency(stats.totalAmount)}
            </p>
            <p className="text-xs text-black font-bold mt-1">Payout amount</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">User Type</label>
              <select
                value={filterUserType}
                onChange={(e) => {
                  setFilterUserType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Types</option>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="installer">Installer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Limit</label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Action</label>
              <button
                onClick={() => fetchRequests()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-black font-bold">Loading payout requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-black font-bold">No payout requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                onClick={() => setSelectedRequest(request)}
                className={`bg-white rounded-lg shadow-md p-6 cursor-pointer border-l-4 transition ${
                  selectedRequest?.id === request.id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300 hover:border-green-600'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">
                      Customer Details
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getUserTypeIcon(request.userType)}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{request.fullName}</p>
                        <p className="text-xs text-gray-600">{request.email}</p>
                        <p className="text-xs text-gray-600">{request.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      {request.address ? (
                        <span>{request.address}, {request.city} {request.state} {request.postalCode}</span>
                      ) : (
                        <span>N/A address</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">
                      Type
                    </p>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getUserTypeColor(request.userType)}`}>
                      {request.userType}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">
                      Amount
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(request.requestedAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">
                      Bank Details
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {request.bankName || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600 font-mono">{request.accountNumber || 'N/A'}</p>
                    <p className="text-xs text-gray-600">
                      {request.accountHolderName || 'N/A'}{request.bankCode ? ` • ${request.bankCode}` : ''}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">
                      Status
                    </p>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-black font-bold uppercase tracking-wide mb-1">
                      Date
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refund Requests */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Refund Requests</h2>
            <button
              onClick={() => fetchRefunds()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium"
            >
              Refresh Refunds
            </button>
          </div>

          {refundsLoading ? (
            <div className="text-center py-8">
              <p className="text-black font-bold">Loading refund requests...</p>
            </div>
          ) : refunds.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-black font-bold">No refund requests found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">Customer</th>
                    <th className="text-left px-4 py-3 font-bold">Email</th>
                    <th className="text-left px-4 py-3 font-bold">Order</th>
                    <th className="text-left px-4 py-3 font-bold">Refund Amount</th>
                    <th className="text-left px-4 py-3 font-bold">Status</th>
                    <th className="text-left px-4 py-3 font-bold">Reason</th>
                    <th className="text-left px-4 py-3 font-bold">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="border-t">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {getRefundCustomerName(refund)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {refund.user?.email || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {refund.order?.orderNumber || refund.orderId || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatCurrency(refund.refundAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(refund.status || 'pending')}`}>
                          {refund.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {refund.reason || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {refund.createdAt ? new Date(refund.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 1 || p === 1 || p === totalPages)
                .map((p, i, arr) => (
                  <div key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        page === p
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  </div>
                ))}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Action Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-96 overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Payout Request Details
                </h2>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionModal({ type: null });
                    setActionData({ adminNotes: '', rejectionReason: '', transactionReference: '' });
                  }}
                  className="text-2xl text-gray-600 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">User Name</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRequest.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Email</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Phone</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRequest.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Address</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedRequest.city}, {selectedRequest.state}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Bank Name</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRequest.bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Account Number</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">
                    {selectedRequest.accountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Account Holder</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedRequest.accountHolderName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedRequest.requestedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Status</p>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Requested Date</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(selectedRequest.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {!actionModal.type && (
                <div className="flex gap-3 flex-wrap">
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setActionModal({ type: 'approve' })}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setActionModal({ type: 'reject' })}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}

                  {selectedRequest.status === 'approved' && (
                    <button
                      onClick={() => setActionModal({ type: 'process' })}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold transition"
                    >
                      ⚙️ Mark Processing
                    </button>
                  )}

                  {selectedRequest.status === 'processing' && (
                    <button
                      onClick={() => setActionModal({ type: 'complete' })}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
                    >
                      ✓ Mark Completed
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setActionModal({ type: null });
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Approve Form */}
              {actionModal.type === 'approve' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={actionData.adminNotes}
                      onChange={(e) =>
                        setActionData({ ...actionData, adminNotes: e.target.value })
                      }
                      placeholder="Add any notes about this approval..."
                      className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleApprove}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => {
                        setActionModal({ type: null });
                        setActionData({ adminNotes: '', rejectionReason: '', transactionReference: '' });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reject Form */}
              {actionModal.type === 'reject' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={actionData.rejectionReason}
                      onChange={(e) =>
                        setActionData({ ...actionData, rejectionReason: e.target.value })
                      }
                      placeholder="Explain why this request is being rejected..."
                      className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-red-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                    >
                      Reject Request
                    </button>
                    <button
                      onClick={() => {
                        setActionModal({ type: null });
                        setActionData({ adminNotes: '', rejectionReason: '', transactionReference: '' });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Mark Processing */}
              {actionModal.type === 'process' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 font-semibold">
                      This request will be marked as "Processing" and moved to the next phase.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleMarkProcessing}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                    >
                      Mark Processing
                    </button>
                    <button
                      onClick={() => setActionModal({ type: null })}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Mark Completed Form */}
              {actionModal.type === 'complete' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Transaction Reference *
                    </label>
                    <input
                      type="text"
                      value={actionData.transactionReference}
                      onChange={(e) =>
                        setActionData({
                          ...actionData,
                          transactionReference: e.target.value,
                        })
                      }
                      placeholder="Enter the transaction reference number..."
                      className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleMarkCompleted}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => {
                        setActionModal({ type: null });
                        setActionData({
                          adminNotes: '',
                          rejectionReason: '',
                          transactionReference: '',
                        });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}





