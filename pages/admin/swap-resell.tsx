import { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import { ProtectAdminPage } from '@/components/services-requests/ProtectAdminPage';
import { apiClient } from '@/lib/api-client';
import { getImageUrl } from '@/lib/imageUtils';

interface UserInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface ResaleProduct {
  id: string;
  productName?: string;
  productCondition?: string;
  price?: number;
  inspectionFee?: number;
  status?: string;
  createdAt?: string;
  user?: UserInfo;
}

interface TradeIn {
  id: string;
  productName?: string;
  interestedInProduct?: string;
  productCondition?: string;
  estimatedPrice?: number;
  quotedPrice?: number;
  status?: string;
  createdAt?: string;
  user?: UserInfo;
}

interface FlashOrder {
  id: string;
  orderNumber?: string;
  status?: string;
  orderStatus?: string;
  paymentStatus?: string;
  createdAt?: string;
  total?: number;
  totalPrice?: number;
  customer?: {
    fullName?: string;
    email?: string;
  };
  items?: Array<{
    quantity?: number;
    price?: number;
    packageType?: string;
    isFlashDeal?: boolean;
    name?: string;
    packageName?: string;
    product?: {
      name?: string;
      image?: string;
    };
  }>;
}

type TabType = 'resales' | 'tradein' | 'flash-orders';

export default function AdminSwapResellPage() {
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('resales');
  const [status, setStatus] = useState('pending');
  const [resales, setResales] = useState<ResaleProduct[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);
  const [flashOrders, setFlashOrders] = useState<FlashOrder[]>([]);
  const [soldFlashItems, setSoldFlashItems] = useState<any[]>([]);
  const [soldResaleItems, setSoldResaleItems] = useState<any[]>([]);
  const [soldTradeInItems, setSoldTradeInItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [quote, setQuote] = useState('');

  const resolveSwapImage = (item: any) => {
    const candidates = [
      item?.imageUrl,
      item?.image,
      item?.photo,
      item?.thumbnail,
      item?.images?.[0],
      item?.photos?.[0],
      item?.media?.[0],
    ];
    const raw = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return raw ? getImageUrl(String(raw)) : '';
  };

  const getCustomerName = (order: any) => {
    const buyer = order?.buyer || {};
    const buyerDetails = order?.buyerDetails || {};
    const user = order?.user || {};
    return (
      buyer.fullName ||
      buyerDetails.name ||
      (order?.customer?.fullName || '') ||
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      order?.customer?.email ||
      'Customer'
    );
  };

  const getCustomerAddress = (order: any) => {
    const buyer = order?.buyer || {};
    const shipping = order?.shippingAddress || {};
    const user = order?.user || {};
    const parts = [
      buyer.address || shipping.street || user.address,
      buyer.city || shipping.city || user.city,
      buyer.state || shipping.state || user.state,
      buyer.postalCode || shipping.postalCode,
    ].filter(Boolean);
    return parts.join(', ') || 'N/A';
  };

  const getSellerName = (order: any, item: any) => {
    const storeName = item?.storeName || item?.product?.store?.name || order?.store?.name;
    if (storeName) return storeName;
    if (item?.vendorId) return `Vendor (${String(item.vendorId).slice(0, 8)})`;
    if (item?.product?.store?.id) return `Store (${String(item.product.store.id).slice(0, 8)})`;
    if (order?.store?.id) return `Store (${String(order.store.id).slice(0, 8)})`;
    return 'N/A';
  };

  const getSellerContact = (order: any) => {
    const email = order?.store?.email;
    const phone = order?.store?.phone;
    return [email, phone].filter(Boolean).join(' • ') || 'N/A';
  };

  const getSellerCity = (order: any, item: any) =>
    item?.storeCity ||
    item?.product?.store?.city ||
    item?.product?.store?.location ||
    order?.store?.city ||
    order?.store?.location ||
    'N/A';

  const toLower = (value: any) => String(value || '').toLowerCase().trim();

  const isSoldOrder = (order: any) => {
    const payment = toLower(order?.paymentStatus);
    const status = toLower(order?.orderStatus || order?.status);
    const paidLike = ['paid', 'completed', 'success', 'successful', 'verified', 'captured'].includes(payment);
    const fulfilledLike = ['processing', 'shipped', 'delivered', 'completed'].includes(status);
    return paidLike || fulfilledLike;
  };

  const isResaleItem = (item: any) => {
    const swapType = toLower(item?.swapItemType);
    const productId = toLower(item?.productId);
    const productCategory = toLower(item?.product?.category);
    const productName = toLower(item?.product?.name || item?.productName || item?.name);
    return (
      swapType === 'resale' ||
      swapType === 'resell' ||
      productId.startsWith('resale-') ||
      productId.includes('resale') ||
      productCategory.includes('resale') ||
      productName.includes('resale') ||
      (item?.isSwapItem && !swapType.includes('trade'))
    );
  };

  const isTradeInItem = (item: any) => {
    const swapType = toLower(item?.swapItemType);
    const productId = toLower(item?.productId);
    const productCategory = toLower(item?.product?.category);
    const productName = toLower(item?.product?.name || item?.productName || item?.name);
    return (
      swapType === 'tradein' ||
      swapType === 'trade-in' ||
      swapType === 'trade_in' ||
      productId.startsWith('tradein-') ||
      productId.includes('tradein') ||
      productId.includes('trade-in') ||
      productCategory.includes('trade') ||
      productName.includes('trade-in')
    );
  };

  const isFlashDealItem = (item: any) => {
    const packageType = toLower(item?.packageType);
    const itemType = toLower(item?.type);
    const category = toLower(item?.category);
    const productCategory = toLower(item?.product?.category);
    const productName = toLower(item?.product?.name || item?.name || item?.packageName);
    return (
      Boolean(item?.isFlashDeal) ||
      Boolean(item?.packageId) ||
      packageType.includes('flash') ||
      itemType.includes('flash') ||
      category.includes('flash') ||
      productCategory.includes('flash') ||
      productName.includes('flash')
    );
  };

  const fetchAllOrders = async (): Promise<any[]> => {
    const [ordersAllResult, adminOrdersResult] = await Promise.allSettled([
      apiClient.get('/orders/all'),
      apiClient.get('/admin/orders'),
    ]);

    const ordersAllRaw =
      ordersAllResult.status === 'fulfilled'
        ? (ordersAllResult.value.data?.data ?? ordersAllResult.value.data ?? [])
        : [];
    const adminOrdersRaw =
      adminOrdersResult.status === 'fulfilled'
        ? (adminOrdersResult.value.data?.data ?? adminOrdersResult.value.data ?? [])
        : [];

    const ordersAll = Array.isArray(ordersAllRaw) ? ordersAllRaw : [];
    const adminOrders = Array.isArray(adminOrdersRaw) ? adminOrdersRaw : [];

    const byId = new Map<string, any>();
    for (const order of ordersAll) {
      if (order?.id) byId.set(String(order.id), order);
    }
    // Prefer admin order payload because it preserves raw item flags for swap/flash detection.
    for (const order of adminOrders) {
      if (order?.id) byId.set(String(order.id), order);
    }

    return Array.from(byId.values());
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      if (activeTab === 'resales') {
        const response = await apiClient.get(`/resales?status=${status}`);
        const payload = response.data?.data ?? response.data ?? [];
        setResales(Array.isArray(payload) ? payload : []);
        const orders = await fetchAllOrders();
        const resaleSold = orders
          .flatMap((order: any) =>
            (Array.isArray(order?.items) ? order.items : [])
              .filter((item: any) => isResaleItem(item))
              .map((item: any) => ({ order, item }))
          )
          .filter(({ order }: any) => isSoldOrder(order))
          .sort((a: any, b: any) => new Date(b.order?.createdAt || 0).getTime() - new Date(a.order?.createdAt || 0).getTime());
        setSoldResaleItems(resaleSold);
      } else if (activeTab === 'tradein') {
        const response = await apiClient.get(`/trade-ins?status=${status}`);
        const payload = response.data?.data ?? response.data ?? [];
        setTradeIns(Array.isArray(payload) ? payload : []);
        const orders = await fetchAllOrders();
        const tradeSold = orders
          .flatMap((order: any) =>
            (Array.isArray(order?.items) ? order.items : [])
              .filter((item: any) => isTradeInItem(item))
              .map((item: any) => ({ order, item }))
          )
          .filter(({ order }: any) => isSoldOrder(order))
          .sort((a: any, b: any) => new Date(b.order?.createdAt || 0).getTime() - new Date(a.order?.createdAt || 0).getTime());
        setSoldTradeInItems(tradeSold);
      } else {
        const payload = await fetchAllOrders();

        const flashOnly = payload
          .filter((order: any) => Array.isArray(order?.items) && order.items.some((item: any) => isFlashDealItem(item)))
          .map((order: any) => ({
            ...order,
            status: order?.status || order?.orderStatus || 'pending',
          }));

        const soldFlash = flashOnly
          .flatMap((order: any) =>
            (Array.isArray(order?.items) ? order.items : [])
              .filter((item: any) => isFlashDealItem(item))
              .map((item: any) => ({ order, item }))
          )
          .filter(({ order }: any) => isSoldOrder(order))
          .sort((a: any, b: any) => new Date(b.order?.createdAt || 0).getTime() - new Date(a.order?.createdAt || 0).getTime());
        setSoldFlashItems(soldFlash);

        const filtered = status === 'all'
          ? flashOnly
          : flashOnly.filter((order: any) => String(order?.status || '').toLowerCase() === status);

        setFlashOrders(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch swap/resell data:', error);
      setResales([]);
      setTradeIns([]);
      setFlashOrders([]);
      setSoldFlashItems([]);
      setSoldResaleItems([]);
      setSoldTradeInItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab, status]);

  const handleResaleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoadingId(id);
    try {
      if (action === 'approve') {
        await apiClient.post(`/resales/${id}/approve`);
      } else {
        await apiClient.post(`/resales/${id}/reject`, { reason: reason || 'Rejected by admin' });
      }
      setReason('');
      await fetchItems();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update resale');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTradeInAction = async (id: string, action: 'approve' | 'quote' | 'reject') => {
    setActionLoadingId(id);
    try {
      if (action === 'approve') {
        await apiClient.post(`/trade-ins/${id}/approve`);
      } else if (action === 'quote') {
        await apiClient.post(`/trade-ins/${id}/quote`, { quotedPrice: parseFloat(quote || '0') });
      } else {
        await apiClient.post(`/trade-ins/${id}/reject`, { reason: reason || 'Rejected by admin' });
      }
      setReason('');
      setQuote('');
      await fetchItems();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update trade-in');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFlashOrderStatus = async (id: string, nextStatus: string) => {
    setActionLoadingId(id);
    try {
      try {
        await apiClient.patch(`/orders/${id}/status`, { status: nextStatus });
      } catch {
        await apiClient.patch(`/admin/orders/${id}/status`, { status: nextStatus });
      }
      await fetchItems();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to update flash order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteResale = async (id: string) => {
    if (!window.confirm('Delete this resale listing permanently?')) return;
    setActionLoadingId(id);
    try {
      await apiClient.delete(`/admin/resales/${id}`);
      await fetchItems();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete resale listing');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTradeIn = async (id: string) => {
    if (!window.confirm('Delete this trade-in listing permanently?')) return;
    setActionLoadingId(id);
    try {
      await apiClient.delete(`/admin/trade-ins/${id}`);
      await fetchItems();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete trade-in listing');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteFlashOrder = async (orderId: string) => {
    if (!window.confirm('Delete this flash order permanently?')) return;
    setActionLoadingId(orderId);
    try {
      await apiClient.delete(`/admin/orders/${orderId}`);
      await fetchItems();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete flash order');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteFlashDealProduct = async (packageId: string) => {
    if (!window.confirm('Delete this flash deal product permanently?')) return;
    setActionLoadingId(packageId);
    try {
      await apiClient.delete(`/packages/admin/flash-deals/${packageId}`);
      await fetchItems();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to delete flash deal product');
    } finally {
      setActionLoadingId(null);
    }
  };

  const data = activeTab === 'resales' ? resales : activeTab === 'tradein' ? tradeIns : flashOrders;

  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Swap, Resell & Flash Orders - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Swap, Resell & Flash Order Management</h1>
          <p className="text-gray-700 font-semibold mb-6">Approve, quote, reject requests and manage flash deal orders.</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveTab('resales')}
              className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'resales' ? 'bg-slate-900 text-white' : 'bg-white text-gray-800'}`}
            >
              Resales
            </button>
            <button
              onClick={() => setActiveTab('tradein')}
              className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'tradein' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}
            >
              Trade-ins
            </button>
            <button
              onClick={() => setActiveTab('flash-orders')}
              className={`px-4 py-2 rounded-lg font-bold ${activeTab === 'flash-orders' ? 'bg-rose-600 text-white' : 'bg-white text-gray-800'}`}
            >
              Flash Deal Orders
            </button>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border font-semibold text-gray-900"
            >
              {activeTab === 'flash-orders' ? (
                <>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </>
              ) : (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </>
              )}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {(activeTab === 'resales' || activeTab === 'tradein') && (
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (for rejection)"
                className="px-3 py-2 border rounded-lg font-semibold text-gray-900 min-w-[260px]"
              />
            )}
            {activeTab === 'tradein' && (
              <input
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="e.g. 85,000"
                className="px-3 py-2 border rounded-lg font-semibold text-gray-900 min-w-[180px]"
              />
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-auto">
            {loading ? (
              <div className="p-6 text-gray-900 font-semibold">Loading records...</div>
            ) : data.length === 0 ? (
              <div className="p-6 text-gray-900 font-semibold">No records found for this filter.</div>
            ) : (
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-bold text-gray-900">Image</th>
                    <th className="text-left p-3 font-bold text-gray-900">Product</th>
                    <th className="text-left p-3 font-bold text-gray-900">User</th>
                    <th className="text-left p-3 font-bold text-gray-900">Condition</th>
                    <th className="text-right p-3 font-bold text-gray-900">Amount</th>
                    <th className="text-left p-3 font-bold text-gray-900">Status</th>
                    <th className="text-left p-3 font-bold text-gray-900">Date</th>
                    <th className="text-right p-3 font-bold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item: any) => (
                    <tr key={item.id} className="border-b">
                      {/*
                        For flash orders, packageId is embedded inside order items.
                        We use the first flash-like item packageId for quick admin deletion.
                      */}
                      {(() => {
                        const flashPackageId = activeTab === 'flash-orders'
                          ? (Array.isArray(item?.items)
                              ? item.items.find((orderItem: any) => isFlashDealItem(orderItem) && orderItem?.packageId)?.packageId
                              : undefined)
                          : undefined;
                        return (
                          <>
                      <td className="p-3">
                        {activeTab === 'flash-orders' ? (
                          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-semibold">
                            N/A
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                            {resolveSwapImage(item) ? (
                              <img
                                src={resolveSwapImage(item)}
                                alt={item.productName || item.interestedInProduct || 'Swap item'}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                }}
                              />
                            ) : (
                              <span className="text-xs text-gray-500 font-semibold">No image</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">
                        {activeTab === 'flash-orders'
                          ? (item.items?.[0]?.product?.name || item.items?.[0]?.name || item.items?.[0]?.packageName || 'Flash Deal Package')
                          : (item.productName || item.interestedInProduct || 'N/A')}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">
                        {activeTab === 'flash-orders'
                          ? (item.customer?.fullName || item.customer?.email || 'N/A')
                          : ((item.user?.firstName || '') + ' ' + (item.user?.lastName || '') || item.user?.email || 'N/A')}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">{activeTab === 'flash-orders' ? 'Flash Deal' : (item.productCondition || 'N/A')}</td>
                      <td className="p-3 text-right font-semibold text-gray-900">
                        N{(activeTab === 'flash-orders' ? (item.totalPrice || item.total || 0) : (item.price || item.estimatedPrice || item.quotedPrice || 0)).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">{item.status || item.orderStatus || 'N/A'}</td>
                      <td className="p-3 font-semibold text-gray-900">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {activeTab === 'resales' ? (
                            <>
                              <button
                                onClick={() => handleResaleAction(item.id, 'approve')}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-green-600 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleResaleAction(item.id, 'reject')}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-red-600 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleDeleteResale(item.id)}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-slate-900 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          ) : activeTab === 'tradein' ? (
                            <>
                              <button
                                onClick={() => handleTradeInAction(item.id, 'approve')}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-green-600 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleTradeInAction(item.id, 'quote')}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Quote
                              </button>
                              <button
                                onClick={() => handleTradeInAction(item.id, 'reject')}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-red-600 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleDeleteTradeIn(item.id)}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-slate-900 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleFlashOrderStatus(item.id, e.target.value);
                                  }
                                }}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded border font-bold text-sm text-gray-900 disabled:opacity-50"
                              >
                                <option value="">Update...</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <button
                                onClick={() => handleDeleteFlashOrder(item.id)}
                                disabled={actionLoadingId === item.id}
                                className="px-3 py-1.5 rounded bg-red-700 text-white font-bold text-sm disabled:opacity-50"
                              >
                                Delete Order
                              </button>
                              {flashPackageId ? (
                                <button
                                  onClick={() => handleDeleteFlashDealProduct(String(flashPackageId))}
                                  disabled={actionLoadingId === item.id || actionLoadingId === String(flashPackageId)}
                                  className="px-3 py-1.5 rounded bg-slate-900 text-white font-bold text-sm disabled:opacity-50"
                                >
                                  Delete Flash Product
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {activeTab === 'flash-orders' && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Sold Flash Deals</h2>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {soldFlashItems.length} sold
                </span>
              </div>
              {soldFlashItems.length === 0 ? (
                <div className="text-sm font-semibold text-gray-500">No sold flash deals yet.</div>
              ) : (
                <div className="space-y-3">
                  {soldFlashItems.map(({ order, item }) => (
                    <details key={`${order.id}-${item.productId || item?.product?.id || item.packageId}`} className="bg-gray-50 rounded-lg px-4 py-3">
                      <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase text-gray-600">Customer</p>
                          <p className="font-semibold text-sm">{getCustomerName(order)}</p>
                          <p className="text-xs text-gray-500">{getCustomerAddress(order)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase text-gray-600">Item</p>
                          <p className="font-semibold text-sm">{item?.productName || item?.name || item?.packageName || item?.product?.name || 'Flash Deal'}</p>
                          <p className="text-xs text-gray-500">Qty: {item?.quantity || 1}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                            payment: {String(order?.paymentStatus || 'paid')}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            delivery: {String(order?.orderStatus || order?.status || 'pending')}
                          </span>
                        </div>
                      </summary>
                      <div className="pt-3 text-sm font-semibold text-gray-700">
                        Amount: N{Number((item?.price || 0) * (item?.quantity || 1)).toLocaleString()} • Delivery: {String(order?.orderStatus || order?.status || 'pending')} • Payment: {String(order?.paymentStatus || 'paid')}
                      </div>
                      <div className="pt-1 text-sm font-semibold text-gray-700">
                        Buyer: {getCustomerName(order)} • Seller: {getSellerName(order, item)} • City: {getSellerCity(order, item)}
                      </div>
                      <div className="pt-1 text-xs font-semibold text-gray-500">
                        Seller Contact: {getSellerContact(order)} • Order Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resales' && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Sold Resale Items</h2>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {soldResaleItems.length} sold
                </span>
              </div>
              {soldResaleItems.length === 0 ? (
                <div className="text-sm font-semibold text-gray-500">No sold resale items yet.</div>
              ) : (
                <div className="space-y-3">
                  {soldResaleItems.map(({ order, item }) => (
                    <details key={`${order.id}-${item.productId || item?.product?.id || item.id}`} className="bg-gray-50 rounded-lg px-4 py-3">
                      <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase text-gray-600">Customer</p>
                          <p className="font-semibold text-sm">{getCustomerName(order)}</p>
                          <p className="text-xs text-gray-500">{getCustomerAddress(order)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase text-gray-600">Item</p>
                          <p className="font-semibold text-sm">{item?.productName || item?.name || item?.product?.name || 'Resale Item'}</p>
                          <p className="text-xs text-gray-500">Qty: {item?.quantity || 1}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                            payment: {String(order?.paymentStatus || 'paid')}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            delivery: {String(order?.orderStatus || order?.status || 'pending')}
                          </span>
                        </div>
                      </summary>
                      <div className="pt-3 text-sm font-semibold text-gray-700">
                        Amount: N{Number((item?.price || 0) * (item?.quantity || 1)).toLocaleString()} • Delivery: {String(order?.orderStatus || order?.status || 'pending')} • Payment: {String(order?.paymentStatus || 'paid')}
                      </div>
                      <div className="pt-1 text-sm font-semibold text-gray-700">
                        Buyer: {getCustomerName(order)} • Seller: {getSellerName(order, item)} • City: {getSellerCity(order, item)}
                      </div>
                      <div className="pt-1 text-xs font-semibold text-gray-500">
                        Seller Contact: {getSellerContact(order)} • Order Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tradein' && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Sold Trade-In Items</h2>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {soldTradeInItems.length} sold
                </span>
              </div>
              {soldTradeInItems.length === 0 ? (
                <div className="text-sm font-semibold text-gray-500">No sold trade-in items yet.</div>
              ) : (
                <div className="space-y-3">
                  {soldTradeInItems.map(({ order, item }) => (
                    <details key={`${order.id}-${item.productId || item?.product?.id || item.id}`} className="bg-gray-50 rounded-lg px-4 py-3">
                      <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase text-gray-600">Customer</p>
                          <p className="font-semibold text-sm">{getCustomerName(order)}</p>
                          <p className="text-xs text-gray-500">{getCustomerAddress(order)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase text-gray-600">Item</p>
                          <p className="font-semibold text-sm">{item?.productName || item?.name || item?.product?.name || 'Trade-In Item'}</p>
                          <p className="text-xs text-gray-500">Qty: {item?.quantity || 1}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                            payment: {String(order?.paymentStatus || 'paid')}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            delivery: {String(order?.orderStatus || order?.status || 'pending')}
                          </span>
                        </div>
                      </summary>
                      <div className="pt-3 text-sm font-semibold text-gray-700">
                        Amount: N{Number((item?.price || 0) * (item?.quantity || 1)).toLocaleString()} • Delivery: {String(order?.orderStatus || order?.status || 'pending')} • Payment: {String(order?.paymentStatus || 'paid')}
                      </div>
                      <div className="pt-1 text-sm font-semibold text-gray-700">
                        Buyer: {getCustomerName(order)} • Seller: {getSellerName(order, item)} • City: {getSellerCity(order, item)}
                      </div>
                      <div className="pt-1 text-xs font-semibold text-gray-500">
                        Seller Contact: {getSellerContact(order)} • Order Date: {order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectAdminPage>
  );
}

