import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import { getApiBaseUrl } from '@/lib/apiConfig';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';

interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
  city: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku: string;
  productCode: string;
  category: string;
  store?: Store;
}

interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  productCode?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: Customer;
  store: Store;
  items: OrderItem[];
  total: number;
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'paid';
  shippingAddress: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
}

export default function OrdersManagement() {
  const router = useRouter();
  const { token, user, isHydrated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [expandedOrderSections, setExpandedOrderSections] = useState<Set<string>>(new Set());

  const resolveItemStoreName = (order: any, item: any) =>
    item?.product?.store?.name ||
    item?.storeName ||
    order?.store?.name ||
    'N/A';

  const resolveItemStoreCity = (order: any, item: any) =>
    item?.product?.store?.city ||
    item?.product?.store?.location ||
    item?.storeCity ||
    order?.store?.city ||
    order?.store?.location ||
    'N/A';

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!token || user?.role !== 'admin') {
      router.push('/login');
    } else {
      fetchOrders();
      
      // DO NOT AUTO-REFRESH - only refresh when admin clicks Refresh button
      // This prevents infinite loading loops
    }
  }, [isHydrated, token, user, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiBaseUrl();
      const url = `${apiUrl.replace(/\/$/, '')}/orders/all?t=${Date.now()}`;
      
      const response = await apiClient.get(url);
      const orders = response.data.data || response.data || [];
      
      setOrders(orders);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load orders';
      setError(errorMsg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async () => {
    if (!updatingOrderId || !newStatus) {
      setUpdateError('Please select a status');
      return;
    }

    try {
      setUpdateLoading(true);
      setUpdateError('');
      
      const apiUrl = getApiBaseUrl();
      
      console.log('[ADMIN] 📝 Saving order status:', { id: updatingOrderId, status: newStatus });

      // ✅ SIMPLE PATCH REQUEST: Only send status
      const response = await apiClient.patch(
        `${apiUrl.replace(/\/$/, '')}/orders/${updatingOrderId}/status`,
        { status: newStatus }
      );

      // ✅ SHOW SUCCESS & RELOAD PAGE
      alert(`✅ Order status saved!\n\nStatus: ${newStatus}`);
      
      // Clear modal
      setUpdatingOrderId(null);
      setNewStatus('');
      
      // ✅ RELOAD PAGE TO CONFIRM PERSISTENCE
      window.location.reload();
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to save status';
      setUpdateError(`❌ ${errorMsg}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const openStatusModal = (order: Order) => {
    setUpdatingOrderId(order.id);
    setNewStatus(order.orderStatus || '');
    setUpdateError('');
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = window.confirm('Delete this order permanently? This cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingOrderId(orderId);
      await apiClient.delete(`/admin/orders/${orderId}`);
      setOrders((prev) => prev.filter((order) => String(order.id) !== String(orderId)));
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
    }
  };
  const toggleOrderExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrderIds);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrderIds(newExpanded);
  };

  const toggleOrderSection = (sectionId: string) => {
    const newSections = new Set(expandedOrderSections);
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId);
    } else {
      newSections.add(sectionId);
    }
    setExpandedOrderSections(newSections);
  };
  const filteredAndSortedOrders = orders
    .filter(order => {
      const matchesSearch = 
        (order?.orderNumber?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
        (order?.customer?.fullName?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
        (order?.customer?.email?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
        (order?.store?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false);
      
      const matchesStatus = filterStatus === 'all' || order?.orderStatus === filterStatus;
      const matchesPayment = filterPaymentStatus === 'all' || order?.paymentStatus === filterPaymentStatus;
      
      return matchesSearch && matchesStatus && matchesPayment;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
        case 'date-desc':
          return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
        case 'amount-asc':
          return (a?.total || 0) - (b?.total || 0);
        case 'amount-desc':
          return (b?.total || 0) - (a?.total || 0);
        default:
          return 0;
      }
    });

  const totalOrders = filteredAndSortedOrders.length;
  const totalRevenue = filteredAndSortedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pendingOrders = filteredAndSortedOrders.filter(o => o.orderStatus === 'pending').length;
  const completedOrders = filteredAndSortedOrders.filter(o => o.orderStatus === 'delivered').length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-800 dark:text-red-200 rounded-lg">
            <p className="font-bold">❌ Error loading orders:</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-sm"
            >
              🔄 Try Again
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-16">
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">🔄 Loading orders...</p>
          </div>
        ) : filteredAndSortedOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-16 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-black dark:text-white font-bold text-xl">No orders found</p>
            <p className="text-gray-600 dark:text-gray-400 font-bold text-sm mt-2">Adjust your filters and try again</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Page Header with Title and Total Count */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                📋 Customer Orders
              </h1>
              <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-4 py-2 rounded-lg font-bold text-lg">
                Total: {totalOrders}
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-3 flex-wrap p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
              <button
                onClick={fetchOrders}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
              >
                Refresh
              </button>
            </div>

            {/* STACKED CARD VIEW - LIKE CUSTOMER ORDER */}
            <div className="space-y-4">
              {filteredAndSortedOrders.map((order) => {
                const isExpanded = expandedOrderIds.has(order.id);
                return (
                  <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
                    
                    {/* HEADER - ALWAYS VISIBLE & CLICKABLE TO EXPAND */}
                    <div 
                      onClick={() => toggleOrderExpanded(order.id)}
                      className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center border-b border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex-1 flex justify-between items-center gap-6">
                        <div>
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Order ID</p>
                          <p className="font-mono font-bold text-sm text-gray-900 dark:text-white mt-1">{order.id.substring(0, 12)}...</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Date</p>
                          <p className="font-bold text-gray-900 dark:text-white mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Status</p>
                          <div className="flex gap-2 justify-end">
                            <span className={`px-3 py-1 rounded text-xs font-bold ${
                              order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.orderStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-900 text-white'
                            }`}>
                              {order.orderStatus}
                            </span>
                            <span className={`px-3 py-1 rounded text-xs font-bold ${
                              order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-slate-900 text-white'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* EXPAND/COLLAPSE CHEVRON */}
                      <div className="ml-4 flex-shrink-0">
                        <span className={`text-2xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED DETAILS - CONDITIONALLY RENDERED */}
                    {isExpanded && (
                      <>
                        {/* Items Ordered - COLLAPSIBLE SECTION */}
                        <div className="border-b border-gray-100 dark:border-gray-700">
                          <div 
                            onClick={() => toggleOrderSection(`items-${order.id}`)}
                            className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
                          >
                            <p className="font-bold text-gray-900 dark:text-white">Items Ordered</p>
                            <span className={`text-lg transition-transform ${expandedOrderSections.has(`items-${order.id}`) ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>

                          {expandedOrderSections.has(`items-${order.id}`) && (
                            <div className="px-6 pb-6 space-y-4">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 items-start">
                                  {/* Product Image */}
                                  <div className="w-20 h-20 rounded bg-gray-100 dark:bg-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {item.product?.image && item.product.image !== '' ? (
                                      <img 
                                        src={item.product.image}
                                        alt={item.product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="text-2xl">📦</span>
                                    )}
                                  </div>
                                  
                                  {/* Product Info */}
                                  <div className="flex-1 flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-white">{item.product?.name || 'Unknown Product'}</p>
                                      <div className="flex gap-4 mt-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                                        <span>Qty: {item.quantity}</span>
                                        <span>Price: ₦{(item.price || 0).toLocaleString()}</span>
                                      </div>
                                      <div className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                                        <span>Store: {resolveItemStoreName(order, item)}</span>
                                        <span className="ml-3">City: {resolveItemStoreCity(order, item)}</span>
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-xs text-gray-600 dark:text-gray-400 font-bold mb-1">Subtotal</p>
                                      <p className="font-bold text-green-600 dark:text-green-400">₦{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Customer & Vendor Info - COLLAPSIBLE SECTION */}
                        <div className="border-b border-gray-100 dark:border-gray-700">
                          <div 
                            onClick={() => toggleOrderSection(`info-${order.id}`)}
                            className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
                          >
                            <p className="font-bold text-gray-900 dark:text-white">Customer & Vendor Info</p>
                            <span className={`text-lg transition-transform ${expandedOrderSections.has(`info-${order.id}`) ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>

                          {expandedOrderSections.has(`info-${order.id}`) && (
                            <div className="px-6 pb-6 space-y-6">
                              <div>
                                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Customer</p>
                                <p className="font-bold text-gray-900 dark:text-white">{order.customer.fullName}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">{order.customer.email}</p>
                              </div>
                              {order.store && (
                                <div>
                                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Vendor Store</p>
                                  <p className="font-bold text-gray-900 dark:text-white">{order.store.name}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 font-bold">
                                    City: {order.store.city || order.store.location || 'N/A'}
                                  </p>
                                </div>
                              )}
                              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Total</p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">₦{(order.total || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Update Status Button */}
                        <div className="p-6 pt-6 space-y-4">
                          <button
                            onClick={() => openStatusModal(order)}
                            className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg transition text-base shadow-lg hover:shadow-xl"
                          >
                            📝 Update Order Status
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={deletingOrderId === order.id}
                            className="w-full px-6 py-4 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-lg transition text-base shadow-lg hover:shadow-xl disabled:opacity-60"
                          >
                            {deletingOrderId === order.id ? 'Deleting...' : '🗑️ Delete Order'}
                          </button>
                          <button
                            onClick={() => router.push('/admin?tab=returns')}
                            className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-lg transition text-base shadow-lg hover:shadow-xl"
                          >
                            💳 Process Refund
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {updatingOrderId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md relative z-50 max-h-screen overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={() => {
                  setUpdatingOrderId(null);
                  setNewStatus('');
                  setUpdateError('');
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ✕
              </button>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pr-8">📦 Update Order Status</h3>
              
              {updateError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm font-bold">
                  {updateError}
                </div>
              )}

              <div className="space-y-6 mb-6">
                {/* Status Selection - NO AUTO-UPDATE */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    Select New Status:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-base"
                  >
                    <option value="">-- Select Status --</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="processing">⚙️ Processing</option>
                    <option value="shipped">🚚 Shipped</option>
                    <option value="delivered">✅ Delivered</option>
                    <option value="cancelled">❌ Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setUpdatingOrderId(null);
                    setNewStatus('');
                    setUpdateError('');
                  }}
                  disabled={updateLoading}
                  className="flex-1 px-4 py-4 border-2 border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 text-base"
                >
                  ✕ Cancel
                </button>
                <button
                  onClick={handleUpdateOrderStatus}
                  disabled={updateLoading || !newStatus}
                  className={`flex-1 px-6 py-4 text-white font-bold rounded-lg transition text-base font-bold shadow-xl ${
                    updateLoading || !newStatus
                      ? 'bg-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-2xl active:scale-95'
                  }`}
                >
                  {updateLoading ? '⏳ Saving...' : '💾 Save Status'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}




