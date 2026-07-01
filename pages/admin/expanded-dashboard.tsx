'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/admin-dashboard.module.css';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardHeaderActions from '@/components/layout/DashboardHeaderActions';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { S3ImageUploader } from '@/components/uploaders/S3ImageUploader';
import { getImageUrl, getSmallFallbackImage } from '@/lib/imageUtils';

// ============================================
// INTERFACES - ALL FEATURES
// ============================================

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  accountType: string;
  adminLevel?: 'SA00' | 'SA10' | 'SA20' | string | null;
  createdAt: string;
  isActive?: boolean;
  isVerified?: boolean;
  city?: string;
}

interface Vendor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  businessRegNumber: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  interestedInPaySmallSmall?: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customer?: any;
  store?: any;
  items?: any[];
  totalPrice?: number;
  total?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Store {
  id: string;
  name: string;
  location: string;
  city: string;
  email: string;
  phone: string;
  ownerId: string;
  isVerified: boolean;
  isActive: boolean;
  categories?: string[];
  slug?: string;
  storeSlug?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category: string;
  approvalStatus?: string;
  createdAt: string;
  store?: any;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  isActive: boolean;
  displayOrder: number;
  subcategories?: SubCategory[];
  createdAt: string;
}

interface SubCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  isActive: boolean;
  displayOrder: number;
  categoryId: string;
  createdAt: string;
}

interface Payment {
  id: string;
  reference: string;
  orderId?: string;
  serviceRequestId?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  customer?: any;
  order?: any;
  paymentType?: 'order' | 'service' | 'installment';
  paymentCategory?: 'order' | 'service' | 'tradein' | 'flash' | 'swap' | 'ev' | 'installment';
}

interface InstallmentApplication {
  id: string;
  userId: string;
  user?: any;
  status: 'pending' | 'approved' | 'rejected';
  monthlyIncome?: number;
  employmentStatus?: string;
  organization?: string;
  address?: string;
  bvn?: string;
  reason?: string;
  requestedAmount?: number;
  downPaymentAmount?: number;
  downPaymentPercentage?: number;
  upfrontPercentage?: number;
  totalAmount?: number;
  firstPayment?: number;
  monthlyPayment?: number;
  months?: number;
  orderId?: string;
  order?: any;
  store?: any;
  product?: any;
  cartItems?: any[];
  paymentStatus?: string;
  deliveryStatus?: string;
  installationStatus?: string;
  approvedAt?: string;
  installedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface InstallmentPayment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  installmentNumber: number;
  totalInstallments: number;
  order?: any;
  paymentStatus?: string;
  deliveryStatus?: string;
  product?: any;
  store?: any;
  user?: any;
  createdAt: string;
  updatedAt: string;
}

interface Cheque {
  id: string;
  installmentPaymentId: string;
  chequeNumber: string;
  bankName: string;
  amount: number;
  issueDate: string;
  maturityDate: string;
  status: 'submitted' | 'verified' | 'rejected' | 'deposited' | 'cleared';
  uploadedAt: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Return {
  id: string;
  orderId: string;
  userId: string;
  rmaNumber: string;
  reason: string;
  description?: string;
  status: 'requested' | 'approved' | 'rejected' | 'returned' | 'refunded';
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Coupon {
  id: string;
  code: string;
  discountPercentage?: number;
  discountAmount?: number;
  minimumOrderAmount: number;
  expiryDate: string;
  status: 'active' | 'inactive' | 'expired';
  isActive: boolean;
  usageLimit: number;
  timesUsed: number;
  applicableCategories?: string[];
  applicableVendors?: string[];
  createdAt: string;
}

interface Wishlist {
  id: string;
  userId: string;
  productId: string;
  product?: any;
  user?: any;
  createdAt: string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  productCategory?: string;
  addedAt?: string;
}

interface FinancialReport {
  totalRevenue: number;
  totalOrders: number;
  totalRefunds: number;
  totalInstallments: number;
  paidInstallments: number;
  pendingInstallments: number;
  totalPayments: number;
  completedPayments: number;
  failedPayments: number;
  averageOrderValue: number;
  lastUpdated: string;
}

interface AdminConversationPreview {
  id: string;
  phone: string | null;
  displayName?: string;
  status: 'ai' | 'human';
  channel: 'web' | 'whatsapp';
  lastMessage: string;
  timestamp: string;
}

interface AdminPopupMessage {
  id?: string;
  role: 'user' | 'assistant' | 'human';
  message: string;
  createdAt?: string;
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  image: string;
  isActive: boolean;
  displayOrder: number;
}

interface Stats {
  totalUsers?: number;
  totalVendors?: number;
  totalInstallers?: number;
  totalCustomers?: number;
  totalOrders?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalStores?: number;
}

const initialFormState: FormState = {
  name: '',
  description: '',
  icon: '',
  image: '',
  isActive: true,
  displayOrder: 0,
};

const evCategoryName = 'Electric Vehicles & Parts';

type TabType = 'overview' | 'users' | 'admins' | 'vendors' | 'orders' | 'products' | 'stores' | 'ev-stores' | 'categories' 
  | 'payments' | 'installments' | 'cheques' | 'returns' | 'coupons' | 'wishlists' | 'financial' | 'quotations';

const validTabs: TabType[] = [
  'overview',
  'users',
  'admins',
  'vendors',
  'orders',
  'products',
  'stores',
  'ev-stores',
  'categories',
  'payments',
  'installments',
  'cheques',
  'returns',
  'coupons',
  'wishlists',
  'financial',
  'quotations',
];

export default function ExpandedAdminDashboard() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // ============================================
  // GLOBAL STATE
  // ============================================

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Overview/Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users Tab State
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [updatingAdmin, setUpdatingAdmin] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [createAdminForm, setCreateAdminForm] = useState({
    email: '',
    firstName: '',
    password: '',
    adminLevel: 'SA20',
  });
  const [editAdminForm, setEditAdminForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    adminLevel: 'SA20',
    country: 'Nigeria',
    city: 'Lagos',
    password: '',
  });

  // Vendors Tab State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
  const [rejectionNotes, setRejectionNotes] = useState<{ [key: string]: string }>({});

  // Orders Tab State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [evOnlyOrders, setEvOnlyOrders] = useState(false);

  // Products Tab State
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [evOnlyProducts, setEvOnlyProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editProductForm, setEditProductForm] = useState<any>({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    subcategory: '',
    image: '',
    images: [] as string[]
  });
  const [savingProductEdit, setSavingProductEdit] = useState(false);

  // Stores Tab State
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  // Categories Tab State
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Category form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState<FormState>(initialFormState);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Subcategory form states
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<FormState>(initialFormState);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // PAYMENT STATE
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'order' | 'service' | 'tradein' | 'flash' | 'swap' | 'ev' | 'installment'>('all');
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // INSTALLMENT STATE
  const [installmentApplications, setInstallmentApplications] = useState<InstallmentApplication[]>([]);
  const [installmentAppsLoading, setInstallmentAppsLoading] = useState(false);
  const [installmentPayments, setInstallmentPayments] = useState<InstallmentPayment[]>([]);
  const [installmentPaymentsLoading, setInstallmentPaymentsLoading] = useState(false);
  const [installmentSearch, setInstallmentSearch] = useState('');

  // CHEQUE STATE
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [chequesLoading, setChequesLoading] = useState(false);

  // RETURN STATE
  const [returns, setReturns] = useState<Return[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);

  // COUPON STATE
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountPercentage: 0,
    discountAmount: 0,
    minimumOrderAmount: 0,
    expiryDate: '',
    usageLimit: 0,
  });

  // WISHLIST STATE
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [wishlistsLoading, setWishlistsLoading] = useState(false);
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<Wishlist | null>(null);

  // FINANCIAL REPORT STATE
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [chatPopupVisible, setChatPopupVisible] = useState(false);
  const [chatPopupConversation, setChatPopupConversation] = useState<AdminConversationPreview | null>(null);
  const [chatPopupMessages, setChatPopupMessages] = useState<AdminPopupMessage[]>([]);
  const [chatPopupReply, setChatPopupReply] = useState('');
  const [chatPopupLoading, setChatPopupLoading] = useState(false);
  const [chatPopupSending, setChatPopupSending] = useState(false);
  const [adminChatPendingCount, setAdminChatPendingCount] = useState(0);
  const chatConversationSnapshotRef = useRef<Map<string, string>>(new Map());
  const chatPopupPrimedRef = useRef(false);

  const extractPayload = (data: any) => data?.data?.data ?? data?.data ?? data;
  const toArray = <T,>(data: any): T[] => (Array.isArray(data) ? data : []);
  const evCategoryLower = evCategoryName.toLowerCase();

  const evStoreIds = useMemo(() => {
    const ids = stores
      .filter((store: any) => {
        const list = Array.isArray(store?.categories) ? store.categories : [];
        return list.some((c: any) => String(c || '').toLowerCase() === evCategoryLower);
      })
      .map((store) => String(store.id));
    return new Set(ids);
  }, [stores, evCategoryLower]);
  const evStoreOwnerIds = useMemo(() => {
    const ids = stores
      .filter((store: any) => {
        const list = Array.isArray(store?.categories) ? store.categories : [];
        return list.some((c: any) => String(c || '').toLowerCase() === evCategoryLower);
      })
      .map((store) => String(store?.ownerId || ''))
      .filter((id) => id);
    return new Set(ids);
  }, [stores, evCategoryLower]);

  const storesById = useMemo(() => {
    const map = new Map<string, Store>();
    for (const store of stores) {
      const id = String((store as any)?.id || '').trim();
      if (id) map.set(id, store as Store);
    }
    return map;
  }, [stores]);

  const storesByOwnerId = useMemo(() => {
    const map = new Map<string, Store>();
    for (const store of stores) {
      const ownerId = String((store as any)?.ownerId || '').trim();
      if (ownerId && !map.has(ownerId)) map.set(ownerId, store as Store);
    }
    return map;
  }, [stores]);

  const normalizeText = (value: any) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const findStoreByOrganization = (organization: any) => {
    const org = normalizeText(organization);
    if (!org) return undefined;
    return stores.find((s: any) => {
      const storeName = normalizeText(s?.name || s?.storeName);
      return Boolean(storeName) && (storeName.includes(org) || org.includes(storeName));
    });
  };

  const productsById = useMemo(() => {
    const map = new Map<string, any>();
    for (const product of products) {
      const id = String((product as any)?.id || '').trim();
      if (id) map.set(id, product);
    }
    return map;
  }, [products]);

  const resolveInstallmentItemMeta = (item: any, fallbackStore: any, app: any) => {
    const productId = String(
      item?.productId ||
      item?.product?.id ||
      item?.id ||
      ''
    ).trim();
    const registeredProduct = productId ? productsById.get(productId) : undefined;
    const ownerId = String(
      item?.vendorId ||
      item?.ownerId ||
      item?.store?.ownerId ||
      item?.product?.store?.ownerId ||
      app?.order?.vendorId ||
      app?.order?.ownerId ||
      ''
    ).trim();

    const storeId = String(
      item?.storeId ||
      item?.store?.id ||
      item?.product?.storeId ||
      item?.product?.store?.id ||
      registeredProduct?.storeId ||
      registeredProduct?.store?.id ||
      app?.storeId ||
      app?.order?.storeId ||
      fallbackStore?.id ||
      ''
    ).trim();
    const registeredStore =
      (storeId ? storesById.get(storeId) : undefined) ||
      (ownerId ? storesByOwnerId.get(ownerId) : undefined) ||
      findStoreByOrganization(app?.organization);

    const storeName =
      registeredStore?.name ||
      item?.storeName ||
      item?.store?.name ||
      item?.product?.storeName ||
      item?.product?.store?.name ||
      fallbackStore?.name ||
      app?.organization ||
      app?.storeName ||
      app?.order?.storeName ||
      'N/A';

    const storeCity =
      registeredStore?.city ||
      registeredStore?.location ||
      item?.storeCity ||
      item?.city ||
      item?.store?.city ||
      item?.store?.location ||
      item?.product?.storeCity ||
      item?.product?.store?.city ||
      fallbackStore?.city ||
      fallbackStore?.location ||
      app?.storeCity ||
      app?.order?.storeCity ||
      'N/A';

    const rawItemName = String(
      item?.productName ||
      item?.name ||
      item?.product?.name ||
      registeredProduct?.name ||
      app?.order?.productName ||
      ''
    ).trim();
    const productName = rawItemName && rawItemName.toLowerCase() !== 'product' ? rawItemName : 'N/A';

    return { productId, productName, storeId, storeName, storeCity };
  };

  const isEvStore = (store: any) => {
    const list = Array.isArray(store?.categories) ? store.categories : [];
    return list.some((c: any) => String(c || '').toLowerCase() === evCategoryLower);
  };

  const isEvProduct = (product: any) => {
    const categoryName = String(product?.categoryName || product?.category || '').toLowerCase();
    const storeId = String(product?.store?.id || product?.storeId || '');
    return (
      categoryName === evCategoryLower ||
      (storeId && evStoreIds.has(storeId)) ||
      isEvStore(product?.store)
    );
  };

  const isEvOrder = (order: any) => {
    const storeObj = (order as any)?.store || (order as any)?.vendorStore || {};
    const storeId = String(storeObj?.id || (order as any)?.storeId || '');
    if (storeId && evStoreIds.has(storeId)) return true;
    if (isEvStore(storeObj)) return true;
    const storeCategories = Array.isArray(storeObj?.categories) ? storeObj.categories : [];
    if (storeCategories.some((c: any) => String(c || '').toLowerCase() === evCategoryLower)) return true;

    const items: any[] = Array.isArray((order as any)?.items)
      ? (order as any).items
      : Array.isArray((order as any)?.orderItems)
        ? (order as any).orderItems
        : [];

    return items.some((item: any) => {
      const product = item?.product || item || {};
      const itemStoreId = String(item?.storeId || item?.store?.id || product?.store?.id || '');
      const itemVendorId = String(item?.vendorId || item?.store?.ownerId || product?.store?.ownerId || '');
      if (itemStoreId && evStoreIds.has(itemStoreId)) return true;
      if (itemVendorId && evStoreOwnerIds.has(itemVendorId)) return true;
      const itemCategory = String(
        item?.categoryName ||
        item?.category ||
        product?.categoryName ||
        product?.category ||
        ''
      ).toLowerCase();
      return itemCategory === evCategoryLower;
    });
  };

  const isInstallmentOrder = (order: any) => {
    const orderNumber = String((order as any)?.orderNumber || '').toUpperCase();
    if (orderNumber.startsWith('ORD-INST-')) return true;
    const paymentType = String((order as any)?.paymentType || (order as any)?.paymentCategory || '').toLowerCase();
    if (paymentType === 'installment') return true;
    const metadataPaymentType = String((order as any)?.metadata?.paymentType || '').toLowerCase();
    return metadataPaymentType.includes('installment');
  };

  const normalizePaymentCategory = (payment: Payment): Payment['paymentCategory'] => {
    if (payment.paymentCategory && payment.paymentCategory !== 'order') return payment.paymentCategory;
    if (payment.paymentType === 'service') return 'service';
    if (payment.paymentType === 'installment') return 'installment';

    const order = payment.order ?? {};
    const items: any[] = Array.isArray(order?.items)
      ? order.items
      : Array.isArray(order?.orderItems)
        ? order.orderItems
        : [];

    const hasFlash = items.some((item) =>
      Boolean(item?.isFlashDeal) ||
      ['flash', 'flash_deal', 'flashdeal'].includes(String(item?.packageType || '').toLowerCase())
    );
    if (hasFlash) return 'flash';

    const hasSwap = items.some((item) => Boolean(item?.isSwapItem) || Boolean(item?.swapItemType));
    if (hasSwap) return 'swap';

    const hasTradeIn = items.some((item) => Boolean(item?.isTradeIn) || Boolean(item?.tradeIn) || Boolean(item?.tradeInId));
    if (hasTradeIn) return 'tradein';

    if (isEvOrder(order)) return 'ev';

    return 'order';
  };

  const normalizePayment = (payment: Payment): Payment => {
    const paymentCategory = normalizePaymentCategory(payment);
    const paymentType = payment.paymentType || (paymentCategory === 'service' ? 'service' : 'order');
    return { ...payment, paymentCategory, paymentType };
  };

  const parseNumeric = (value: any): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return Number.NaN;

    const cleaned = value.replace(/[,\sNn₦]/g, '').trim();
    if (!cleaned) return Number.NaN;

    const direct = Number(cleaned);
    if (Number.isFinite(direct)) return direct;

    const numericParts = cleaned.match(/-?\d+(?:\.\d+)?/g);
    if (numericParts?.length === 1) {
      const parsed = Number(numericParts[0]);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    return Number.NaN;
  };

  const toCount = (value: any): number => {
    const n = parseNumeric(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  };

  const toAmount = (value: any): number => {
    const n = parseNumeric(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Number(n.toFixed(2)));
  };

  const formatCount = (value: any): string => toCount(value).toLocaleString('en-NG');
  const formatCurrency = (value: any): string =>
    `₦${toAmount(value).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const normalizeStats = (raw: any): Stats => {
    const payload = extractPayload(raw);
    const source = Array.isArray(payload) ? (payload[0] ?? {}) : (payload ?? {});

    return {
      totalUsers: toCount(source.totalUsers ?? source.users ?? source.total_users),
      totalVendors: toCount(source.totalVendors ?? source.vendors ?? source.total_vendors),
      totalInstallers: toCount(source.totalInstallers ?? source.installers ?? source.total_installers),
      totalCustomers: toCount(source.totalCustomers ?? source.customers ?? source.total_customers),
      totalOrders: toCount(source.totalOrders ?? source.orders ?? source.total_orders),
      totalRevenue: toAmount(source.totalRevenue ?? source.revenue ?? source.total_revenue),
      totalProducts: toCount(source.totalProducts ?? source.products ?? source.total_products),
      totalStores: toCount(source.totalStores ?? source.stores ?? source.total_stores),
    };
  };

  const extractArrayPayload = <T,>(payload: any): T[] | null => {
    if (Array.isArray(payload)) return payload as T[];
    if (Array.isArray(payload?.data)) return payload.data as T[];
    if (Array.isArray(payload?.products)) return payload.products as T[];
    if (Array.isArray(payload?.items)) return payload.items as T[];
    if (Array.isArray(payload?.results)) return payload.results as T[];
    if (Array.isArray(payload?.users)) return payload.users as T[];
    if (Array.isArray(payload?.vendors)) return payload.vendors as T[];
    if (Array.isArray(payload?.orders)) return payload.orders as T[];
    if (Array.isArray(payload?.stores)) return payload.stores as T[];
    if (Array.isArray(payload?.categories)) return payload.categories as T[];
    return null;
  };

  const toList = <T,>(raw: any): T[] => {
    const payload = extractPayload(raw);
    return extractArrayPayload<T>(payload) ?? [];
  };

  const fetchArrayWithFallback = async <T,>(endpoints: string[]): Promise<T[]> => {
    for (const endpoint of endpoints) {
      try {
        const response = await apiClient.get(endpoint);
        const payload = extractPayload(response.data);
        const extracted = extractArrayPayload<T>(payload);
        if (extracted) {
          return extracted;
        }
      } catch {
        // Try next endpoint
      }
    }
    return [];
  };

  const fetchChatPopupMessages = async (conversationId: string) => {
    setChatPopupLoading(true);
    try {
      const res = await apiClient.get(`/admin/conversations/${conversationId}/messages`);
      const incoming = Array.isArray(res?.data?.messages) ? res.data.messages : [];
      setChatPopupMessages(incoming);
    } catch {
      setChatPopupMessages([]);
    } finally {
      setChatPopupLoading(false);
    }
  };

  const openChatPopupById = async (conversationId: string) => {
    try {
      const res = await apiClient.get('/admin/conversations');
      const conversations: AdminConversationPreview[] = Array.isArray(res?.data?.conversations)
        ? res.data.conversations
        : [];
      const found = conversations.find((c) => c.id === conversationId);
      if (!found) return;
      setChatPopupConversation(found);
      setChatPopupVisible(true);
      await fetchChatPopupMessages(found.id);
    } catch {
      // Keep page stable if chat lookup fails.
    }
  };

  const checkForIncomingAdminChats = async () => {
    try {
      const res = await apiClient.get('/admin/conversations');
      const conversations: AdminConversationPreview[] = Array.isArray(res?.data?.conversations)
        ? res.data.conversations
        : [];
      const pendingCount = conversations.filter((convo) => String(convo.status || '').toLowerCase() === 'human').length;
      setAdminChatPendingCount(pendingCount > 99 ? 99 : pendingCount);

      const previousSnapshot = chatConversationSnapshotRef.current;
      const nextSnapshot = new Map<string, string>();
      const changedOrNew: AdminConversationPreview[] = [];

      for (const convo of conversations) {
        const signature = `${convo.timestamp}|${convo.lastMessage}`;
        const prev = previousSnapshot.get(convo.id);
        nextSnapshot.set(convo.id, signature);
        if (!prev || prev !== signature) {
          changedOrNew.push(convo);
        }
      }

      chatConversationSnapshotRef.current = nextSnapshot;

      // Prime on first read to avoid popping historical messages.
      if (!chatPopupPrimedRef.current) {
        chatPopupPrimedRef.current = true;
        return;
      }

      const supportQueue = changedOrNew.filter((convo) => convo.status === 'human');
      if (supportQueue.length === 0) return;

      const latest = [...supportQueue].sort((a, b) => {
        const ta = Date.parse(a.timestamp || '') || 0;
        const tb = Date.parse(b.timestamp || '') || 0;
        return tb - ta;
      })[0];

      if (!latest) return;

      // Only pop when the newest message is from customer side.
      const latestMessagesRes = await apiClient.get(`/admin/conversations/${latest.id}/messages`);
      const latestMessages: AdminPopupMessage[] = Array.isArray(latestMessagesRes?.data?.messages)
        ? latestMessagesRes.data.messages
        : [];
      const newestMessage = latestMessages[latestMessages.length - 1];
      if (!newestMessage || newestMessage.role !== 'user') return;

      setChatPopupConversation(latest);
      setChatPopupMessages(latestMessages);
      setChatPopupVisible(true);
    } catch {
      // Keep dashboard stable when chats endpoint is temporarily unavailable.
    }
  };

  const handleSendPopupReply = async () => {
    if (!chatPopupConversation?.id || !chatPopupReply.trim()) return;
    setChatPopupSending(true);
    try {
      const res = await apiClient.post(`/admin/conversations/${chatPopupConversation.id}/reply`, {
        message: chatPopupReply.trim(),
      });
      const sent = res?.data?.message;
      if (sent?.message) {
        setChatPopupMessages((prev) => [...prev, sent]);
      }
      setChatPopupReply('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send chat reply');
    } finally {
      setChatPopupSending(false);
    }
  };

  // ============================================
  // AUTH CHECK & TAB LOADING
  // ============================================

  useEffect(() => {
    const tabFromQuery = router.query.tab;
    if (typeof tabFromQuery === 'string' && validTabs.includes(tabFromQuery as TabType)) {
      setActiveTab(tabFromQuery as TabType);
    }
  }, [router.query.tab]);

  useEffect(() => {
    if (!isHydrated) return;

    const normalizedRole = String(user?.role || '').toLowerCase();
    const normalizedAccountType = String((user as any)?.accountType || '').toLowerCase();
    const adminLevel = String((user as any)?.adminLevel || '').toUpperCase();
    const isAdminLike =
      normalizedRole === 'admin' ||
      normalizedAccountType === 'admin' ||
      adminLevel.startsWith('SA');

    if (!user || !isAdminLike) {
      router.push('/login');
      return;
    }

    loadTabData(activeTab);
  }, [activeTab, isHydrated, user, router]);

  useEffect(() => {
    if (!evOnlyOrders) return;
    if (stores.length > 0 || storesLoading) return;
    fetchStores();
  }, [evOnlyOrders, stores.length, storesLoading]);

  useEffect(() => {
    if (!isHydrated || !user) return;
    const normalizedRole = String(user?.role || '').toLowerCase();
    const normalizedAccountType = String((user as any)?.accountType || '').toLowerCase();
    const adminLevel = String((user as any)?.adminLevel || '').toUpperCase();
    const isAdminLike =
      normalizedRole === 'admin' ||
      normalizedAccountType === 'admin' ||
      adminLevel.startsWith('SA');
    if (!isAdminLike) return;

    checkForIncomingAdminChats();
    const interval = window.setInterval(() => {
      checkForIncomingAdminChats();
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isHydrated, user?.id]);

  useEffect(() => {
    if (!router.isReady) return;
    const chatId = typeof router.query.chatId === 'string' ? router.query.chatId.trim() : '';
    if (!chatId) return;
    openChatPopupById(chatId);
    router.replace('/admin-dashboard', undefined, { shallow: true });
  }, [router.isReady, router.query.chatId]);

  useEffect(() => {
    if (!chatPopupVisible || !chatPopupConversation?.id) return;

    const interval = window.setInterval(() => {
      fetchChatPopupMessages(chatPopupConversation.id);
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [chatPopupVisible, chatPopupConversation?.id]);

  const loadTabData = (tab: TabType) => {
    switch (tab) {
      case 'overview':
        fetchStats();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'admins':
        fetchUsers();
        break;
      case 'vendors':
        fetchVendors();
        break;
      case 'orders':
        fetchOrders();
        break;
      case 'products':
        fetchProducts();
        break;
      case 'stores':
        fetchStores();
        break;
      case 'ev-stores':
        fetchStores();
        break;
      case 'categories':
        fetchCategories();
        break;
      case 'payments':
        fetchPayments();
        break;
      case 'installments':
        fetchStores();
        fetchProducts();
        fetchInstallmentApplications();
        fetchInstallmentPayments();
        break;
      case 'cheques':
        fetchCheques();
        break;
      case 'returns':
        fetchReturns();
        break;
      case 'coupons':
        fetchCoupons();
        break;
      case 'wishlists':
        fetchWishlists();
        break;
      case 'financial':
        fetchFinancialReport();
        break;
    }
  };

  // ============================================
  // FETCH FUNCTIONS - ORIGINAL 7 TABS
  // ============================================

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      console.log('[ADMIN] API Base URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('[ADMIN] Auth Token:', useAuthStore.getState().token ? 'EXISTS' : 'MISSING');
      console.log('[ADMIN] User Role:', user?.role);
      const statsEndpoints = ['/admin/stats', '/admin/stats/public', '/admin/metrics'];
      let statsResponse: any = null;
      for (const endpoint of statsEndpoints) {
        try {
          statsResponse = await apiClient.get(endpoint);
          if (statsResponse?.data) {
            break;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!statsResponse?.data) {
        throw new Error('No stats response from backend');
      }

      console.log('[ADMIN] Stats Response:', statsResponse.data);
      const normalizedStats = normalizeStats(statsResponse.data);

      const rawStats = extractPayload(statsResponse.data);
      const rawRevenue = Array.isArray(rawStats) ? rawStats[0]?.totalRevenue : rawStats?.totalRevenue;
      const parsedRevenue = parseNumeric(rawRevenue);
      const shouldRebuildRevenue = rawRevenue != null && !Number.isFinite(parsedRevenue);

      if (shouldRebuildRevenue) {
        const orderList = await fetchArrayWithFallback<Order>([
          '/admin/orders',
          '/orders/all',
          '/orders',
        ]);
        normalizedStats.totalRevenue = orderList.reduce((sum, order) => {
          const amount = toAmount(order.totalPrice ?? order.total ?? 0);
          return sum + amount;
        }, 0);
        normalizedStats.totalOrders = orderList.length;
      }

      setStats(normalizedStats);
      setError('');
    } catch (err: any) {
      console.error('[ADMIN] Error fetching stats:', err);
      console.error('[ADMIN] Error Response Status:', err.response?.status);
      console.error('[ADMIN] Error Response Data:', err.response?.data);
      setError(`Failed to fetch statistics: ${err.response?.status || err.message}`);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await apiClient.get('/admin/users');
      setUsers(toList<User>(response.data));
      setError('');
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const adminUsers = useMemo(() => {
    const filtered = users.filter((u) => {
      const role = String(u.role || '').toLowerCase();
      const accountType = String(u.accountType || '').toLowerCase();
      const level = String(u.adminLevel || '').toUpperCase();
      return role === 'admin' || accountType === 'admin' || level.startsWith('SA');
    });
    return filtered.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }, [users]);

  const handleCreateAdmin = async () => {
    const payload = {
      email: createAdminForm.email.trim(),
      firstName: createAdminForm.firstName.trim(),
      password: createAdminForm.password,
      adminLevel: createAdminForm.adminLevel,
    };

    if (!payload.email || !payload.firstName || !payload.password) {
      setError('Email, first name and password are required to create an admin.');
      return;
    }

    try {
      setCreatingAdmin(true);
      setError('');
      const response = await apiClient.post('/admin/create-admin', payload);
      const createdEmail = response?.data?.admin?.email || payload.email;
      setSuccess(`Admin account created: ${createdEmail}`);
      setCreateAdminForm((prev) => ({
        ...prev,
        email: '',
        firstName: '',
        password: '',
      }));
      await fetchUsers();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to create admin account';
      setError(message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleStartEditAdmin = (admin: User) => {
    setEditingAdminId(admin.id);
    setEditAdminForm({
      email: admin.email || '',
      firstName: admin.firstName || '',
      lastName: admin.lastName || '',
      adminLevel: String(admin.adminLevel || 'SA20').toUpperCase(),
      country: (admin as any).country || 'Nigeria',
      city: admin.city || 'Lagos',
      password: '',
    });
  };

  const handleSaveAdminEdit = async (adminId: string) => {
    try {
      setUpdatingAdmin(true);
      const payload = {
        email: editAdminForm.email.trim(),
        firstName: editAdminForm.firstName.trim(),
        lastName: editAdminForm.lastName.trim(),
        adminLevel: editAdminForm.adminLevel,
        country: editAdminForm.country.trim() || 'Nigeria',
        city: editAdminForm.city.trim() || 'Lagos',
        password: editAdminForm.password.trim() || undefined,
      };
      await apiClient.patch(`/admin/admins/${adminId}`, payload);
      setSuccess('Admin account updated successfully');
      setEditingAdminId(null);
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update admin account');
    } finally {
      setUpdatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string, email: string) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Delete admin account ${email}? This action cannot be undone.`)
      : false;
    if (!confirmed) return;

    try {
      setDeletingAdminId(adminId);
      await apiClient.delete(`/admin/admins/${adminId}`);
      setSuccess(`Admin account deleted: ${email}`);
      if (editingAdminId === adminId) {
        setEditingAdminId(null);
      }
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete admin account');
    } finally {
      setDeletingAdminId(null);
    }
  };

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      const [allVendors, pending] = await Promise.all([
        apiClient.get('/admin/vendors').catch(() => ({ data: [] })),
        apiClient.get('/admin/vendors/pending').catch(() => ({ data: [] }))
      ]);
      setVendors(toList<Vendor>(allVendors.data));
      setPendingVendors(toList<Vendor>(pending.data));
      setError('');
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      setError('Failed to fetch vendors');
    } finally {
      setVendorsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const orderList = await fetchArrayWithFallback<Order>([
        '/admin/orders',
        '/orders/all',
        '/orders',
      ]);
      const normalized = toArray<Order>(orderList).map((order: any) => ({
        ...order,
        status: order?.status || order?.orderStatus || 'pending',
      }));
      setOrders(normalized);
      setError('');
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const productList = await fetchArrayWithFallback<Product>([
        '/admin/products',
        '/products/all-vendor',
        '/products',
      ]);
      setProducts(toArray<Product>(productList));
      setError('');
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to fetch products');
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      setStoresLoading(true);
      const storeList = await fetchArrayWithFallback<Store>([
        '/admin/stores',
        '/stores',
      ]);
      const normalizedStores = toArray<Store>(storeList);
      setStores(normalizedStores);
      return normalizedStores;
      setError('');
    } catch (err: any) {
      console.error('Error fetching stores:', err);
      setError('Failed to fetch stores');
      setStores([]);
    } finally {
      setStoresLoading(false);
    }

    return [];
  };

  const resolveStoreForUser = async (user: User) => {
    const userEmail = String(user.email || '').toLowerCase();
    const findMatch = (list: Store[]) =>
      list.find((store) =>
        store.ownerId === user.id ||
        (store.email && store.email.toLowerCase() === userEmail)
      );

    let match = findMatch(stores);
    if (!match) {
      const storeList = await fetchStores();
      match = findMatch(storeList);
    }
    return match || null;
  };

  const handleManageUserProducts = async (user: User) => {
    const userLabel = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const store = await resolveStoreForUser(user);
    const slug = store?.slug || store?.storeSlug;

    if (slug) {
      router.push(`/store/${slug}`);
      return;
    }

    router.push({
      pathname: '/admin',
      query: {
        tab: 'products',
        userEmail: user.email,
        userName: userLabel,
        userId: user.id,
        storeId: store?.id,
      },
    });
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiClient.get('/admin/categories');
      const parsedCategories = toList<Category>(response.data).map((c: any) => ({
        ...c,
        subcategories: toArray<SubCategory>(c?.subcategories),
      }));
      setCategories(parsedCategories);
      setError('');
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch categories');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // ============================================
  // FETCH FUNCTIONS - NEW 8 TABS
  // ============================================

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const paymentList = await fetchArrayWithFallback<Payment>([
        '/admin/payments',
        '/payments',
      ]);
      setPayments(toArray<Payment>(paymentList).map(normalizePayment));
      setError('');
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError('Failed to fetch payments');
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchInstallmentApplications = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setInstallmentAppsLoading(true);
      }
      const applicationList = await fetchArrayWithFallback<InstallmentApplication>([
        '/installments/all',
        '/installments/admin/applications',
        '/admin/installments',
      ]);
      setInstallmentApplications(toArray<InstallmentApplication>(applicationList));
      if (!silent) {
        setError('');
      }
    } catch (err: any) {
      console.error('Error fetching installment applications:', err);
      if (!silent) {
        setError('Failed to fetch installment applications');
        setInstallmentApplications([]);
      }
    } finally {
      if (!silent) {
        setInstallmentAppsLoading(false);
      }
    }
  };

  const fetchInstallmentPayments = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setInstallmentPaymentsLoading(true);
      }
      const paymentList = await fetchArrayWithFallback<InstallmentPayment>([
        '/installments/admin/all-installments',
        '/installments/payments',
        '/admin/installments/payments',
      ]);
      setInstallmentPayments(toArray<InstallmentPayment>(paymentList));
      if (!silent) {
        setError('');
      }
    } catch (err: any) {
      console.error('Error fetching installment payments:', err);
      if (!silent) {
        setError('Failed to fetch installment payments');
        setInstallmentPayments([]);
      }
    } finally {
      if (!silent) {
        setInstallmentPaymentsLoading(false);
      }
    }
  };

  const fetchCheques = async () => {
    try {
      setChequesLoading(true);
      const response = await apiClient.get('/admin/cheques');
      setCheques(toArray<Cheque>(extractPayload(response.data)));
      setError('');
    } catch (err: any) {
      console.error('Error fetching cheques:', err);
      setError('Failed to fetch cheques');
      setCheques([]);
    } finally {
      setChequesLoading(false);
    }
  };

  const fetchReturns = async () => {
    try {
      setReturnsLoading(true);
      const returnList = await fetchArrayWithFallback<Return>([
        '/admin/returns',
        '/returns',
      ]);
      setReturns(toArray<Return>(returnList));
      setError('');
    } catch (err: any) {
      console.error('Error fetching returns:', err);
      setError('Failed to fetch returns');
      setReturns([]);
    } finally {
      setReturnsLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      setCouponsLoading(true);
      const response = await apiClient.get('/admin/coupons');
      setCoupons(toArray<Coupon>(extractPayload(response.data)));
      setError('');
    } catch (err: any) {
      console.error('Error fetching coupons:', err);
      setError('Failed to fetch coupons');
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  };

  const fetchWishlists = async () => {
    try {
      setWishlistsLoading(true);
      const response = await apiClient.get('/admin/wishlists');
      setWishlists(toArray<Wishlist>(extractPayload(response.data)));
      setError('');
    } catch (err: any) {
      console.error('Error fetching wishlists:', err);
      setError('Failed to fetch wishlists');
      setWishlists([]);
    } finally {
      setWishlistsLoading(false);
    }
  };

  const fetchFinancialReport = async () => {
    try {
      setFinancialLoading(true);
      const response = await apiClient.get('/admin/financial-report');
      setFinancialReport(response.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching financial report:', err);
      setError('Failed to fetch financial report');
    } finally {
      setFinancialLoading(false);
    }
  };

  // ============================================
  // ACTION HANDLERS - ORIGINAL 7 TABS
  // ============================================

  const handleVerifyVendor = async (vendorId: string, status: string, notes?: string) => {
    try {
      await apiClient.post(`/admin/vendors/${vendorId}/verify`, { status, notes });
      setSuccess(`Vendor ${status} successfully`);
      fetchVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify vendor');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      try {
        await apiClient.patch(`/admin/orders/${orderId}/status`, { status });
      } catch {
        await apiClient.patch(`/orders/${orderId}/status`, { status });
      }
      setSuccess('Order status updated');
      fetchOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Delete this order permanently? This action cannot be undone.')) return;
    try {
      setDeletingOrderId(orderId);
      await apiClient.delete(`/admin/orders/${orderId}`);
      setOrders((prev) => prev.filter((order: any) => String(order?.id) !== String(orderId)));
      setSuccess('Order deleted successfully');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete order';
      setError(message);
      alert(message);
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleDeletePayment = async (payment: Payment) => {
    const paymentCategory = String(payment.paymentCategory || payment.paymentType || '').toLowerCase();
    if (paymentCategory !== 'service') {
      alert('Only service payment entries can be deleted from this table.');
      return;
    }

    if (!window.confirm(`Delete this payment entry permanently?\n\nReference: ${payment.reference}`)) return;

    try {
      setDeletingPaymentId(payment.id);
      await apiClient.delete(`/admin/payments/${payment.id}`, {
        params: {
          reference: payment.reference,
          paymentCategory,
        },
      });

      setPayments((prev) =>
        prev.filter(
          (item) =>
            String(item.id) !== String(payment.id) &&
            String(item.reference || '') !== String(payment.reference || '')
        )
      );

      if (
        selectedPayment &&
        (String(selectedPayment.id) === String(payment.id) ||
          String(selectedPayment.reference || '') === String(payment.reference || ''))
      ) {
        setSelectedPayment(null);
      }

      setSuccess('Payment entry deleted successfully');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to delete payment entry';
      setError(message);
      alert(message);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleProductApproval = async (productId: string, action: 'approve' | 'reject') => {
    try {
      const approved = action === 'approve';
      await apiClient.post(`/admin/approve-product/${productId}`, { approved });
      setSuccess(approved ? 'Product approved successfully' : 'Product rejected successfully');
      setProducts((prev) =>
        prev.map((product: any) =>
          product.id === productId
            ? { ...product, approvalStatus: approved ? 'approved' : 'rejected' }
            : product
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update product approval');
    }
  };

  const handleAdminEditPrice = async (product: any) => {
    const currentPrice = Number(product?.price || 0);
    const input = prompt('Enter new price (Naira):', currentPrice ? `${currentPrice}` : '');
    if (input === null) return;
    const newPrice = Number(String(input).replace(/,/g, '').trim());
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      setError('Please enter a valid price.');
      return;
    }

    try {
      await apiClient.put(`/products/${product.id}/price`, { price: newPrice });
      setSuccess('Product price updated');
      setProducts((prev) =>
        prev.map((item: any) => (item.id === product.id ? { ...item, price: newPrice } : item))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update product price');
    }
  };

  const handleAdminEditStock = async (product: any) => {
    const currentStock = Number(product?.quantity || product?.stock || 0);
    const input = prompt('Enter new stock quantity:', currentStock ? `${currentStock}` : '0');
    if (input === null) return;
    const newStock = Number(String(input).replace(/,/g, '').trim());
    if (!Number.isFinite(newStock) || newStock < 0) {
      setError('Please enter a valid stock quantity.');
      return;
    }

    try {
      await apiClient.patch(`/products/${product.id}`, { stock: newStock });
      setSuccess('Product stock updated');
      setProducts((prev) =>
        prev.map((item: any) => (item.id === product.id ? { ...item, quantity: newStock, stock: newStock } : item))
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update product stock');
    }
  };

  const handleReconcileInstallmentPayment = async (applicationId: string) => {
    try {
      setLoading(true);
      await apiClient.post(`/installments/admin/reconcile/${applicationId}`);
      await fetchInstallmentApplications();
      await fetchInstallmentPayments();
      setSuccess('Payment reconciled successfully.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reconcile payment');
    } finally {
      setLoading(false);
    }
  };

  const installmentRefreshActive = useRef(false);

  useEffect(() => {
    if (activeTab !== 'installments') return;
    let mounted = true;

    const refreshInstallments = (silent: boolean = false) => {
      if (!mounted || installmentRefreshActive.current) return;
      installmentRefreshActive.current = true;
      Promise.all([
        fetchInstallmentApplications(silent),
        fetchInstallmentPayments(silent),
      ]).finally(() => {
        installmentRefreshActive.current = false;
      });
    };

    refreshInstallments(false);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshInstallments(true);
      }
    }, 45000);
    const handleFocus = () => refreshInstallments(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab]);

  const handleUpdateInstallmentProgress = async (applicationId: string, payload: { deliveryStatus?: string; installationStatus?: string }) => {
    try {
      await apiClient.patch(`/installments/admin/${applicationId}/progress`, payload);
      setSuccess('Installment status updated');
      fetchInstallmentApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update installment status');
    }
  };

  const handleInstallmentPaymentAction = async (applicationId: string, value: string) => {
    if (value === 'reconcile') {
      await handleReconcileInstallmentPayment(applicationId);
      return;
    }

    try {
      setLoading(true);
      await apiClient.patch(`/installments/admin/${applicationId}/payment-status`, { paymentStatus: value });
      await fetchInstallmentApplications();
      await fetchInstallmentPayments();
      setSuccess('Payment status updated.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update payment status');
    } finally {
      setLoading(false);
    }
  };

  const openAdminEditProduct = (product: any) => {
    const currentImages = Array.isArray(product?.images) && product.images.length > 0
      ? product.images
      : (product?.image ? [product.image] : []);
    setEditingProduct(product);
    setEditProductForm({
      name: product?.name || product?.title || '',
      description: product?.description || '',
      price: product?.price ? String(product.price) : '',
      stock: String(product?.quantity ?? product?.stock ?? ''),
      category: product?.category || product?.categoryName || '',
      subcategory: product?.subcategory || '',
      image: '',
      images: currentImages.slice(0, 1)
    });
  };

  const handleAdminSaveProduct = async () => {
    if (!editingProduct) return;
    const nextPrice = Number(String(editProductForm.price || '').replace(/,/g, '').trim());
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      setError('Please enter a valid price.');
      return;
    }
    const nextStock = Number(String(editProductForm.stock || '0').replace(/,/g, '').trim());
    if (!Number.isFinite(nextStock) || nextStock < 0) {
      setError('Please enter a valid stock quantity.');
      return;
    }

    setSavingProductEdit(true);
    try {
      const payload: any = {
        name: editProductForm.name,
        description: editProductForm.description,
        price: nextPrice,
        stock: nextStock,
        category: editProductForm.category,
        subcategory: editProductForm.subcategory || null
      };

      if (Array.isArray(editProductForm.images) && editProductForm.images.length > 0) {
        payload.images = editProductForm.images.slice(0, 1);
        payload.image = editProductForm.images[0];
      } else if (editProductForm.image) {
        payload.image = editProductForm.image;
      }

      const res = await apiClient.patch(`/products/${editingProduct.id}`, payload);
      setSuccess('Product updated successfully');
      setProducts((prev) =>
        prev.map((item: any) => (item.id === editingProduct.id ? (res.data || { ...item, ...payload }) : item))
      );
      setEditingProduct(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setSavingProductEdit(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategoryId) {
        await apiClient.patch(`/admin/categories/${editingCategoryId}`, categoryForm);
        setSuccess('Category updated successfully');
      } else {
        await apiClient.post('/admin/categories', categoryForm);
        setSuccess('Category created successfully');
      }
      setCategoryForm(initialFormState);
      setShowCategoryForm(false);
      setEditingCategoryId(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      setSuccess('Category deleted');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      setError('Please select a category');
      return;
    }
    try {
      if (editingSubcategoryId) {
        await apiClient.patch(`/admin/categories/${selectedCategoryId}/subcategories/${editingSubcategoryId}`, subcategoryForm);
        setSuccess('Subcategory updated successfully');
      } else {
        await apiClient.post(`/admin/categories/${selectedCategoryId}/subcategories`, subcategoryForm);
        setSuccess('Subcategory created successfully');
      }
      setSubcategoryForm(initialFormState);
      setShowSubcategoryForm(false);
      setEditingSubcategoryId(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subcategory');
    }
  };

  const handleDeleteSubcategory = async (categoryId: string, subcategoryId: string, name: string) => {
    if (!confirm(`Delete subcategory "${name}"?`)) return;
    try {
      await apiClient.delete(`/admin/categories/${categoryId}/subcategories/${subcategoryId}`);
      setSuccess('Subcategory deleted');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete subcategory');
    }
  };

  // ============================================
  // ACTION HANDLERS - NEW 8 TABS
  // ============================================

  const handleApproveInstallment = async (applicationId: string) => {
    try {
      await apiClient.put(`/installments/${applicationId}/approve`);
      setSuccess('Installment application approved');
      fetchInstallmentApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectInstallment = async (applicationId: string) => {
    try {
      await apiClient.put(`/installments/${applicationId}/reject`);
      setSuccess('Installment application rejected');
      fetchInstallmentApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleUpdateChequeStatus = async (chequeId: string, status: string) => {
    try {
      await apiClient.put(`/installments/cheque/${chequeId}/status`, { status });
      setSuccess('Cheque status updated');
      fetchCheques();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update cheque status');
    }
  };

  const handleApproveReturn = async (returnId: string) => {
    try {
      await apiClient.post(`/admin/returns/${returnId}/approve`);
      setSuccess('Return approved');
      fetchReturns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve return');
    }
  };

  const handleRejectReturn = async (returnId: string) => {
    try {
      await apiClient.post(`/admin/returns/${returnId}/reject`);
      setSuccess('Return rejected');
      fetchReturns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject return');
    }
  };

  const handleProcessRefund = async (returnId: string, refundAmount: number) => {
    try {
      await apiClient.post(`/admin/returns/${returnId}/refund`, { refundAmount });
      setSuccess('Refund processed');
      fetchReturns();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process refund');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/admin/coupons', couponForm);
      setSuccess('Coupon created successfully');
      setCouponForm({
        code: '',
        discountPercentage: 0,
        discountAmount: 0,
        minimumOrderAmount: 0,
        expiryDate: '',
        usageLimit: 0,
      });
      setShowCouponForm(false);
      fetchCoupons();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await apiClient.delete(`/admin/coupons/${couponId}`);
      setSuccess('Coupon deleted');
      fetchCoupons();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  const handleToggleCouponStatus = async (couponId: string, newStatus: boolean) => {
    try {
      await apiClient.patch(`/admin/coupons/${couponId}`, { isActive: newStatus });
      setSuccess('Coupon status updated');
      fetchCoupons();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update coupon');
    }
  };

  // ============================================
  // RENDER FUNCTIONS - ORIGINAL 7 TABS
  // ============================================

  const renderOverviewTab = () => {
    const summaryCards = [
      { key: 'users', label: 'Users', value: Number(stats?.totalUsers ?? users.length), color: '#1d4ed8' },
      { key: 'vendors', label: 'Vendors', value: Number(stats?.totalVendors ?? vendors.length + pendingVendors.length), color: '#7c3aed' },
      { key: 'orders', label: 'Orders', value: Number(stats?.totalOrders ?? orders.length), color: '#ea580c' },
      { key: 'products', label: 'Products', value: Number(stats?.totalProducts ?? products.length), color: '#059669' },
      { key: 'stores', label: 'Stores', value: Number(stats?.totalStores ?? stores.length), color: '#0ea5e9' },
      { key: 'payments', label: 'Payments', value: payments.length, color: '#0891b2' },
      { key: 'installments', label: 'Installments', value: installmentApplications.length, color: '#b45309' },
      { key: 'returns', label: 'Returns', value: returns.length, color: '#dc2626' },
    ] as Array<{ key: TabType | string; label: string; value: number; color: string }>;

    return (
      <div className={styles.tabContent}>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '14px'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Overview</h3>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontWeight: 600 }}>
            Select any section below to view full details.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {summaryCards.map((item) => (
            <button
              key={`overview-${item.key}`}
              type="button"
              onClick={() => setActiveTab(item.key as TabType)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                background: '#ffffff',
                padding: '14px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ marginTop: '4px', fontSize: '28px', fontWeight: 800, color: item.color }}>{item.value}</div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderUsersTab = () => (
    <div className={styles.tabContent}>
      {usersLoading ? <div>Loading users...</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Account Type</th>
              <th>Verified</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const userLabel = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
              const verifiedValue = u.isVerified ? 'verified' : 'unverified';
              const rowRole = String(u.role || '').toLowerCase();
              const rowAdminLevel = String(u.adminLevel || '').toUpperCase();
              const isProtectedAdminRow = rowRole === 'admin' || rowAdminLevel === 'SA00';

              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.phone}</td>
                  <td>{u.role}</td>
                  <td>{u.accountType}</td>
                  <td>
                    <select
                      className={styles.userSelect}
                      value={verifiedValue}
                      onChange={async (event) => {
                        const value = event.target.value;
                        const nextVerified = value === 'verified';
                        try {
                          await apiClient.patch(`/admin/users/${u.id}`, { isVerified: nextVerified });
                          setUsers((prev) => prev.map((user) => (user.id === u.id ? { ...user, isVerified: nextVerified } : user)));
                        } catch (err) {
                          console.error('Failed to update user verification:', err);
                          alert('Failed to update verification status. Please try again.');
                        }
                      }}
                    >
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </td>
                  <td>
                    <div className={styles.userActions}>
                      <select
                        className={styles.userActionSelect}
                        defaultValue=""
                        onChange={(event) => {
                          const value = event.target.value;
                          event.target.value = '';

                          if (value === 'manage') {
                            handleManageUserProducts(u);
                          }

                          if (value === 'delete') {
                            if (isProtectedAdminRow) {
                              alert('SA00/Admin accounts cannot be deleted.');
                              return;
                            }
                            handleDeleteUser(u.id);
                          }
                        }}
                      >
                        <option value="" disabled>Action</option>
                        <option value="manage">Manage Products</option>
                        {!isProtectedAdminRow && <option value="delete">Delete User</option>}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderAdminsTab = () => {
    const currentAdminLevel = String((user as any)?.adminLevel || '').toUpperCase();
    const canCreateAdmins = currentAdminLevel === 'SA00';

    return (
      <div className={styles.tabContent}>
        <div className={styles.section}>
          <h3>Admin Accounts ({adminUsers.length})</h3>
          <p style={{ marginTop: '6px', color: '#475569' }}>
            Admin accounts can sign in and access the admin dashboard immediately.
          </p>
        </div>

        <div className={styles.section} style={{ marginTop: '16px' }}>
          <h3>Create Admin Account</h3>
          {!canCreateAdmins && (
            <div style={{ marginTop: '8px', marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74' }}>
              Only SA00 can create new admin accounts.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '10px' }}>
            <input
              type="email"
              placeholder="Admin email"
              value={createAdminForm.email}
              onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, email: e.target.value }))}
              disabled={!canCreateAdmins || creatingAdmin}
              style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
            <input
              type="text"
              placeholder="First name"
              value={createAdminForm.firstName}
              onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, firstName: e.target.value }))}
              disabled={!canCreateAdmins || creatingAdmin}
              style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={createAdminForm.password}
              onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, password: e.target.value }))}
              disabled={!canCreateAdmins || creatingAdmin}
              style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
            <select
              value={createAdminForm.adminLevel}
              onChange={(e) => setCreateAdminForm((prev) => ({ ...prev, adminLevel: e.target.value }))}
              disabled={!canCreateAdmins || creatingAdmin}
              style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            >
              <option value="SA20">SA20</option>
              <option value="SA10">SA10</option>
              <option value="SA00">SA00</option>
            </select>
          </div>
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleCreateAdmin}
              disabled={!canCreateAdmins || creatingAdmin}
              style={{
                padding: '10px 14px',
                border: 'none',
                borderRadius: '8px',
                background: canCreateAdmins ? '#0f766e' : '#94a3b8',
                color: '#fff',
                fontWeight: 700,
                cursor: !canCreateAdmins || creatingAdmin ? 'not-allowed' : 'pointer'
              }}
            >
              {creatingAdmin ? 'Creating admin...' : 'Create Admin'}
            </button>
            <p style={{ marginTop: '8px', color: '#64748b', fontSize: '12px' }}>
              Set the login password for the new admin account here.
            </p>
          </div>
        </div>

        <div className={styles.section} style={{ marginTop: '16px' }}>
          <h3>Existing Admins</h3>
          {usersLoading ? (
            <div>Loading admins...</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Admin Level</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((a, index) => {
                  const isFirstAdmin = index === 0;
                  const isEditing = editingAdminId === a.id;

                  return (
                    <tr key={a.id}>
                      <td>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editAdminForm.email}
                            onChange={(e) => setEditAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', width: '100%' }}
                          />
                        ) : (
                          a.email
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'grid', gap: '6px' }}>
                            <input
                              type="text"
                              value={editAdminForm.firstName}
                              onChange={(e) => setEditAdminForm((prev) => ({ ...prev, firstName: e.target.value }))}
                              placeholder="First name"
                              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                              type="text"
                              value={editAdminForm.lastName}
                              onChange={(e) => setEditAdminForm((prev) => ({ ...prev, lastName: e.target.value }))}
                              placeholder="Last name"
                              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                          </div>
                        ) : (
                          <>{a.firstName} {a.lastName}</>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            value={editAdminForm.adminLevel}
                            onChange={(e) => setEditAdminForm((prev) => ({ ...prev, adminLevel: e.target.value }))}
                            style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                          >
                            <option value="SA20">SA20</option>
                            <option value="SA10">SA10</option>
                            <option value="SA00">SA00</option>
                          </select>
                        ) : (
                          a.adminLevel || 'SA20'
                        )}
                      </td>
                      <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        {!canCreateAdmins ? (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Read only</span>
                        ) : isFirstAdmin ? (
                          <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 700 }}>Protected</span>
                        ) : isEditing ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input
                              type="password"
                              value={editAdminForm.password}
                              onChange={(e) => setEditAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                              placeholder="New password (optional)"
                              style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', minWidth: '170px' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveAdminEdit(a.id)}
                              disabled={updatingAdmin}
                              style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', background: '#0f766e', color: '#fff', fontWeight: 700, cursor: updatingAdmin ? 'not-allowed' : 'pointer' }}
                            >
                              {updatingAdmin ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAdminId(null)}
                              disabled={updatingAdmin}
                              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#334155', fontWeight: 700, cursor: updatingAdmin ? 'not-allowed' : 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleStartEditAdmin(a)}
                              style={{ padding: '6px 10px', border: '1px solid #0f766e', borderRadius: '6px', background: '#ecfeff', color: '#0f766e', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(a.id, a.email)}
                              disabled={deletingAdminId === a.id}
                              style={{ padding: '6px 10px', border: '1px solid #dc2626', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: deletingAdminId === a.id ? 'not-allowed' : 'pointer' }}
                            >
                              {deletingAdminId === a.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {adminUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                      No admin accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderVendorsTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <h3>Pending Vendor Approvals ({pendingVendors.length})</h3>
        <div className={styles.vendorsList}>
          {pendingVendors.map((v) => (
            <div key={v.id} className={styles.vendorCard}>
              <div className={styles.vendorInfo}>
                <h4>{v.businessName}</h4>
                <p><strong>Owner:</strong> {v.firstName} {v.lastName}</p>
                <p><strong>Email:</strong> {v.email}</p>
                <p><strong>Phone:</strong> {v.phone}</p>
                <p><strong>Reg Number:</strong> {v.businessRegNumber}</p>
                <p><strong>Pay Small Small:</strong> {v.interestedInPaySmallSmall ? 'Joined' : 'Not joined'}</p>
              </div>
              <div className={styles.vendorActions}>
                <input
                  type="text"
                  placeholder="Rejection notes (optional)"
                  value={rejectionNotes[v.id] || ''}
                  onChange={(e) => setRejectionNotes({ ...rejectionNotes, [v.id]: e.target.value })}
                  style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
                />
                <button className={styles.approveBtn} onClick={() => handleVerifyVendor(v.id, 'approved')}>
                  ✓ Approve
                </button>
                <button className={styles.rejectBtn} onClick={() => handleVerifyVendor(v.id, 'rejected', rejectionNotes[v.id])}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h3>Approved Vendors ({vendors.length})</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Owner</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Pay Small Small</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vendors.filter((v) => v.isVerified).map((v) => (
              <tr key={v.id}>
                <td>{v.businessName}</td>
                <td>{v.firstName} {v.lastName}</td>
                <td>{v.email}</td>
                <td>{v.phone}</td>
                <td>
                  <span className={styles.statusBadge} style={{ backgroundColor: v.interestedInPaySmallSmall ? '#51cf66' : '#adb5bd' }}>
                    {v.interestedInPaySmallSmall ? 'Joined' : 'Not Joined'}
                  </span>
                </td>
                <td><span className={styles.statusBadge} style={{ backgroundColor: '#51cf66' }}>Verified</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderOrdersTab = () => (
    <div className={styles.tabContent}>
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <label style={{ marginRight: '10px' }}>Filter by Status:</label>
        <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} style={{ padding: '5px' }}>
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label style={{ marginLeft: '16px', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={evOnlyOrders}
            onChange={(e) => setEvOnlyOrders(e.target.checked)}
            style={{ marginRight: '6px' }}
          />
          EV Stores Only
        </label>
        <div style={{ marginLeft: 'auto', minWidth: '240px', flex: '1 1 240px' }}>
          <input
            type="search"
            placeholder="Search orders..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '999px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              fontWeight: 600
            }}
          />
        </div>
      </div>

      {ordersLoading ? <div>Loading orders...</div> : orders.length === 0 ? (
        <div style={{ padding: '16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <strong>No orders found.</strong>
          <button
            type="button"
            onClick={fetchOrders}
            style={{ marginLeft: '12px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer', fontWeight: 600 }}
          >
            Refresh
          </button>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer Details</th>
              <th>Store</th>
              <th>Products (with image)</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Date Purchased</th>
              <th>Update Status</th>
            </tr>
          </thead>
          <tbody>
            {orders
              .filter((o) => orderStatusFilter === 'all' || o.status === orderStatusFilter)
              .filter((o) => (evOnlyOrders ? isEvOrder(o) : true))
              .filter((o) => !isInstallmentOrder(o))
              .filter((o) => {
                const q = orderSearch.trim().toLowerCase();
                if (!q) return true;
                const customer = (o as any).customer || {};
                const storeData: any = (o as any).store || (o as any).vendorStore || {};
                const orderItems: any[] = Array.isArray((o as any).items)
                  ? (o as any).items
                  : Array.isArray((o as any).orderItems)
                    ? (o as any).orderItems
                    : [];
                const purchaseDateRaw = (o as any).createdAt || (o as any).orderDate || (o as any).purchasedAt || (o as any).paidAt;
                const purchaseDate = purchaseDateRaw ? new Date(purchaseDateRaw) : null;
                const haystack = [
                  (o as any).orderNumber,
                  (o as any).id,
                  customer.fullName,
                  customer.firstName,
                  customer.lastName,
                  customer.email,
                  customer.phone,
                  storeData.name,
                  storeData.storeName,
                  purchaseDate ? purchaseDate.toLocaleDateString() : '',
                  purchaseDate ? purchaseDate.toISOString().slice(0, 10) : '',
                  ...orderItems.map((i: any) => i?.productName || i?.name)
                ]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase();
                return haystack.includes(q);
              })
              .map((o) => {
                const customer = (o as any).customer || {};
                const customerName =
                  (customer.fullName && String(customer.fullName).trim()) ||
                  `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                  (o as any).customerName ||
                  (o as any).fullName ||
                  'N/A';
                const customerEmail = customer.email || (o as any).customerEmail || (o as any).email || 'N/A';
                const customerPhone = customer.phone || (o as any).customerPhone || (o as any).phone || 'N/A';
                const customerAddress = customer.address || (o as any).shippingAddress || (o as any).address || 'N/A';
                const customerCity = customer.city || (o as any).city || 'N/A';
                const customerState = customer.state || (o as any).state || 'N/A';

                const storeData: any = (o as any).store || (o as any).vendorStore || {};
                const storeName = storeData.name || storeData.storeName || 'N/A';
                const storeCity = storeData.city || storeData.location || 'N/A';

                const orderItems: any[] = Array.isArray((o as any).items)
                  ? (o as any).items
                  : Array.isArray((o as any).orderItems)
                    ? (o as any).orderItems
                    : [];

                const purchaseDateRaw = (o as any).createdAt || (o as any).orderDate || (o as any).purchasedAt || (o as any).paidAt;
                const orderStatus = String(o.status || 'pending').toLowerCase();
                const paymentStatus = String(o.paymentStatus || 'pending').toLowerCase();
                const orderStatusStyle =
                  orderStatus === 'delivered'
                    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : orderStatus === 'shipped'
                      ? { background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #93C5FD' }
                      : orderStatus === 'processing'
                        ? { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }
                        : orderStatus === 'cancelled'
                          ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                          : { background: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD' };
                const paymentStatusStyle =
                  paymentStatus === 'paid' || paymentStatus === 'completed'
                    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : paymentStatus === 'failed'
                      ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                      : { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };

                const safeOrderId = String(o.id || (o as any).orderId || '');
                return (
                  <tr key={safeOrderId || o.orderNumber || Math.random()}>
                    <td>{o.orderNumber || (safeOrderId ? safeOrderId.slice(0, 8) : 'N/A')}</td>
                    <td>
                      <div style={{ minWidth: '220px' }}>
                        <div><strong>Name:</strong> {customerName}</div>
                        <div><strong>Email:</strong> {customerEmail}</div>
                        <div><strong>Phone:</strong> {customerPhone}</div>
                        <div><strong>Address:</strong> {customerAddress}</div>
                        <div><strong>City/State:</strong> {customerCity}, {customerState}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: '150px' }}>
                        <div><strong>{storeName}</strong></div>
                        <div>{storeCity}</div>
                      </div>
                    </td>
                    <td>
                      {orderItems.length === 0 ? (
                        <span>N/A</span>
                      ) : (
                        <div style={{ minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {orderItems.map((item: any, idx: number) => {
                            const product = item?.product || item || {};
                            const rawImage =
                              product?.image ||
                              product?.imageUrl ||
                              product?.image_url ||
                              product?.thumbnail ||
                              product?.images?.[0] ||
                              item?.image ||
                              item?.imageUrl ||
                              item?.image_url ||
                              item?.thumbnail ||
                              '';
                            const image = rawImage ? getImageUrl(String(rawImage)) : getSmallFallbackImage('No Image');
                            const productName = product.name || item?.name || 'Product';
                            const quantity = item?.quantity || 1;
                            const unitPrice = item?.price || product?.price || 0;
                            const itemStoreName =
                              item?.storeName ||
                              product?.store?.name ||
                              storeData?.name ||
                              storeData?.storeName ||
                              'N/A';
                            const itemStoreCity =
                              item?.storeCity ||
                              product?.store?.city ||
                              product?.store?.location ||
                              storeData?.city ||
                              storeData?.location ||
                              'N/A';
                            return (
                              <div key={`${o.id}-item-${idx}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <img
                                  src={image}
                                  alt={productName}
                                  style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getSmallFallbackImage('No Image');
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 600 }}>{productName}</div>
                                  <div>Qty: {quantity} | Price: N{Number(unitPrice || 0).toLocaleString()}</div>
                                  <div>Store: {itemStoreName} | City: {itemStoreCity}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td>N{(o.total || o.totalPrice || 0).toLocaleString()}</td>
                    <td>
                      <span style={{ ...orderStatusStyle, padding: '4px 10px', borderRadius: '999px', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block' }}>
                        {o.status || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span style={{ ...paymentStatusStyle, padding: '4px 10px', borderRadius: '999px', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block' }}>
                        {o.paymentStatus || 'N/A'}
                      </span>
                    </td>
                    <td>{purchaseDateRaw ? new Date(purchaseDateRaw).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <select onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)} style={{ padding: '5px' }}>
                          <option value="">Update...</option>
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(o.id)}
                          disabled={deletingOrderId === o.id}
                          style={{
                            padding: '6px 10px',
                            border: 'none',
                            borderRadius: '6px',
                            background: '#b91c1c',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: deletingOrderId === o.id ? 'not-allowed' : 'pointer',
                            opacity: deletingOrderId === o.id ? 0.6 : 1,
                          }}
                        >
                          {deletingOrderId === o.id ? 'Deleting...' : 'Delete Order'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderProductsTab = () => {
    const selectedUserEmailRaw = typeof router.query.userEmail === 'string' ? router.query.userEmail : '';
    const selectedUserName = typeof router.query.userName === 'string' ? router.query.userName : '';
    const selectedStoreId = typeof router.query.storeId === 'string' ? router.query.storeId : '';
    const selectedUserId = typeof router.query.userId === 'string' ? router.query.userId : '';
    const selectedUserEmail = selectedUserEmailRaw.trim().toLowerCase();
    const filteredProducts = selectedStoreId
      ? products.filter((p: any) => String(p?.store?.id || p?.storeId || '') === selectedStoreId)
      : selectedUserEmail
        ? products.filter((p: any) => {
          const storeEmail = String(p?.store?.email || p?.storeEmail || '').toLowerCase();
          const ownerEmail = String(p?.store?.owner?.email || p?.owner?.email || p?.user?.email || '').toLowerCase();
          const ownerId = String(p?.store?.ownerId || p?.ownerId || p?.userId || p?.sellerId || p?.createdBy || '').trim();
          return (
            storeEmail === selectedUserEmail ||
            ownerEmail === selectedUserEmail ||
            (selectedUserId && ownerId === selectedUserId)
          );
        })
        : products;
    const evFilteredProducts = evOnlyProducts ? filteredProducts.filter((p: any) => isEvProduct(p)) : filteredProducts;
    const filteredStockTotal = evFilteredProducts.reduce((sum: number, p: any) => sum + Number(p.quantity || p.stock || 0), 0);

    return (
      <div className={styles.tabContent}>
        {(selectedUserEmail || selectedStoreId) && (
          <div className={styles.userFilterBanner}>
            <span>
              Viewing products for {selectedUserName || selectedUserEmail || 'selected store'}
            </span>
            <button
              type="button"
              className={styles.userFilterClear}
              onClick={() => router.push({ pathname: '/admin', query: { tab: 'products' } })}
            >
              Clear Filter
            </button>
          </div>
        )}

        <div className={styles.productsSummary}>
          <span className={styles.summaryBadge}>
            Total Products: {evFilteredProducts.length}{selectedUserEmail ? ` / ${products.length}` : ''}
          </span>
          <span className={styles.summaryBadgeSecondary}>
            Total Stock Qty: {filteredStockTotal}
          </span>
          <label style={{ marginLeft: '12px', fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={evOnlyProducts}
              onChange={(e) => setEvOnlyProducts(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            EV Stores Only
          </label>
        </div>

        {productsLoading ? <div>Loading products...</div> : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Store Details</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Approval Action</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evFilteredProducts.map((p: any) => {
                const status = String(p.approvalStatus || (p.isApproved ? 'approved' : 'pending')).toLowerCase();
                const statusStyle =
                  status === 'approved'
                    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : status === 'rejected'
                      ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                      : { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };

                return (
                  <tr key={p.id}>
                    <td>{p.name || p.title || 'N/A'}</td>
                    <td>{p.categoryName || p.category || 'N/A'}</td>
                    <td>
                      <div style={{ minWidth: '170px' }}>
                        <div><strong>{p?.store?.name || p?.storeName || 'N/A'}</strong></div>
                        <div>{p?.store?.city || p?.store?.location || p?.city || 'N/A'}</div>
                        <div style={{ fontSize: '12px', color: '#475569' }}>{p?.store?.email || ''}</div>
                      </div>
                    </td>
                    <td>N{Number(p.price || 0).toLocaleString()}</td>
                    <td>{Number(p.quantity || p.stock || 0)}</td>
                    <td>
                      <span style={{ ...statusStyle, padding: '4px 10px', borderRadius: '999px', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block' }}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'approve' || value === 'reject') {
                            handleProductApproval(p.id, value);
                          }
                        }}
                        style={{ padding: '5px' }}
                      >
                        <option value="">Select...</option>
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => openAdminEditProduct(p)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a', background: '#fffbeb', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminEditPrice(p)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#eef2ff', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Edit Price
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminEditStock(p)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#ecfdf3', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Edit Stock
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {editingProduct && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Edit Product</h3>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  style={{ fontSize: '24px', lineHeight: 1, border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Name</label>
                    <input
                      value={editProductForm.name}
                      onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5f5', borderRadius: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Description</label>
                    <textarea
                      value={editProductForm.description}
                      onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                      rows={4}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5f5', borderRadius: '8px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Price</label>
                      <input
                        type="number"
                        value={editProductForm.price}
                        onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5f5', borderRadius: '8px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Stock</label>
                      <input
                        type="number"
                        value={editProductForm.stock}
                        onChange={(e) => setEditProductForm({ ...editProductForm, stock: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5f5', borderRadius: '8px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Category</label>
                      <input
                        value={editProductForm.category}
                        onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5f5', borderRadius: '8px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Subcategory</label>
                      <input
                        value={editProductForm.subcategory}
                        onChange={(e) => setEditProductForm({ ...editProductForm, subcategory: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5f5', borderRadius: '8px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '6px' }}>Images</label>
                    <S3ImageUploader
                      folder="products"
                      maxImages={1}
                      onUploadComplete={(urls) => setEditProductForm({ ...editProductForm, images: urls.slice(0, 1) })}
                      onError={(error) => setError(`Image upload failed: ${error.message}`)}
                    />
                    {Array.isArray(editProductForm.images) && editProductForm.images.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        {editProductForm.images.map((img: string, idx: number) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <img src={img} alt={`Product image ${idx + 1}`} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            <button
                              type="button"
                              onClick={() => setEditProductForm({ ...editProductForm, images: editProductForm.images.filter((_: string, i: number) => i !== idx) })}
                              style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '999px', width: '20px', height: '20px', border: 'none', cursor: 'pointer' }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={handleAdminSaveProduct}
                    disabled={savingProductEdit}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {savingProductEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5f5', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStoresTab = () => (
    <div className={styles.tabContent}>
      {storesLoading ? <div>Loading stores...</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Store Name</th>
              <th>Location</th>
              <th>City</th>
              <th>Email</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.location}</td>
                <td>{s.city}</td>
                <td>{s.email}</td>
                <td>{s.isVerified ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderEvStoresTab = () => {
    const evStores = stores.filter((store: any) => {
      const categories = Array.isArray(store?.categories) ? store.categories : [];
      return categories.some((c: any) => String(c || '').toLowerCase() === evCategoryName.toLowerCase());
    });

    return (
      <div className={styles.tabContent}>
        <div style={{ marginBottom: '12px', fontWeight: 700 }}>
          EV Stores: {evStores.length}
        </div>
        {storesLoading ? <div>Loading stores...</div> : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Store Name</th>
                <th>Location</th>
                <th>City</th>
                <th>Email</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {evStores.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.location}</td>
                  <td>{s.city}</td>
                  <td>{s.email}</td>
                  <td>{s.isVerified ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderCategoriesTab = () => (
    <div className={styles.tabContent}>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => {
          setShowCategoryForm(!showCategoryForm);
          setCategoryForm(initialFormState);
          setEditingCategoryId(null);
        }} style={{ background: '#00d4ff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {showCategoryForm ? '✕ Close' : '+ New Category'}
        </button>
      </div>

      {showCategoryForm && (
        <form onSubmit={handleAddCategory} style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Category Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="text"
            placeholder="Description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="text"
            placeholder="Icon"
            value={categoryForm.icon}
            onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <textarea
            placeholder="Image URL"
            value={categoryForm.image}
            onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
            style={{ width: '100%', marginBottom: '10px', padding: '8px', minHeight: '60px' }}
          />
          <label style={{ marginRight: '10px' }}>
            <input
              type="checkbox"
              checked={categoryForm.isActive}
              onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
            />
            Active
          </label>
          <button type="submit" style={{ background: '#51cf66', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {editingCategoryId ? 'Update' : 'Create'} Category
          </button>
        </form>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => {
          setShowSubcategoryForm(!showSubcategoryForm);
          setSubcategoryForm(initialFormState);
          setEditingSubcategoryId(null);
        }} style={{ background: '#ffa94d', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {showSubcategoryForm ? '✕ Close' : '+ New Subcategory'}
        </button>
      </div>

      {showSubcategoryForm && (
        <form onSubmit={handleAddSubcategory} style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <select
            value={selectedCategoryId || ''}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Subcategory Name"
            value={subcategoryForm.name}
            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="text"
            placeholder="Description"
            value={subcategoryForm.description}
            onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <button type="submit" style={{ background: '#51cf66', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {editingSubcategoryId ? 'Update' : 'Create'} Subcategory
          </button>
        </form>
      )}

      {categoriesLoading ? <div>Loading categories...</div> : (
        <div>
          <h4>Categories</h4>
          {categories.map((c) => (
            <div key={c.id} style={{ background: '#f9f9f9', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
              <div style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '5px' }} onClick={() => setExpandedCategoryId(expandedCategoryId === c.id ? null : c.id)}>
                {expandedCategoryId === c.id ? '▼' : '▶'} {c.name} {c.isActive ? '✓' : '✗'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{c.description}</div>
              <div style={{ marginTop: '8px' }}>
                <button onClick={() => {
                  setEditingCategoryId(c.id);
                  setCategoryForm(c);
                  setShowCategoryForm(true);
                }} style={{ background: '#4dabf7', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px' }}>
                  Edit
                </button>
                <button onClick={() => handleDeleteCategory(c.id, c.name)} style={{ background: '#ff6b6b', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
              {expandedCategoryId === c.id && c.subcategories && (
                <div style={{ marginTop: '10px', paddingLeft: '20px', borderLeft: '2px solid #ddd' }}>
                  <h5>Subcategories:</h5>
                  {c.subcategories.map((sc) => (
                    <div key={sc.id} style={{ background: 'white', padding: '8px', marginBottom: '8px', borderRadius: '3px' }}>
                      <div>{sc.name} {sc.isActive ? '✓' : '✗'}</div>
                      <div style={{ marginTop: '5px' }}>
                        <button onClick={() => {
                          setEditingSubcategoryId(sc.id);
                          setSelectedCategoryId(c.id);
                          setSubcategoryForm(sc);
                          setShowSubcategoryForm(true);
                        }} style={{ background: '#4dabf7', color: 'white', padding: '3px 8px', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px', fontSize: '12px' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteSubcategory(c.id, sc.id, sc.name)} style={{ background: '#ff6b6b', color: 'white', padding: '3px 8px', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER FUNCTIONS - NEW 8 TABS
  // ============================================

  const renderPaymentsTab = () => (
    <div className={styles.tabContent}>
      <h3>Paystack Payments</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '12px 0' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', minWidth: '220px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Earnings</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            ₦{payments
              .filter((p) => paymentFilter === 'all' || p.paymentCategory === paymentFilter)
              .filter((p) => p.status === 'completed')
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
              .toLocaleString()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '12px 0 16px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
          Filter
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            style={{ marginLeft: '8px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="all">All</option>
            <option value="order">Order</option>
            <option value="service">Service</option>
            <option value="tradein">Trade-In</option>
            <option value="flash">Flash Deal</option>
            <option value="swap">Swap</option>
            <option value="ev">EV</option>
            <option value="installment">Installment</option>
          </select>
        </label>
      </div>
      {paymentsLoading ? <div>Loading payments...</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Method</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments
              .filter((p) => paymentFilter === 'all' || p.paymentCategory === paymentFilter)
              .map((p) => (
              <tr key={p.id}>
                <td>{p.reference}</td>
                <td>
                  {p.paymentCategory === 'service'
                    ? 'Service'
                    : p.paymentCategory === 'tradein'
                      ? 'Trade-In'
                      : p.paymentCategory === 'flash'
                        ? 'Flash Deal'
                        : p.paymentCategory === 'swap'
                          ? 'Swap'
                          : p.paymentCategory === 'ev'
                            ? 'EV'
                            : p.paymentCategory === 'installment'
                              ? 'Installment'
                              : 'Order'}
                </td>
                <td>{p.amount ? `₦${p.amount.toLocaleString()}` : '—'}</td>
                <td><span className={styles.statusBadge} style={{ backgroundColor: p.status === 'completed' ? '#51cf66' : '#ff922b' }}>{p.status}</span></td>
                <td>{p.paymentMethod}</td>
                <td>{new Date(p.transactionDate).toLocaleDateString()}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => setSelectedPayment(p)}
                    style={{ padding: '8px 12px', minWidth: '72px', background: '#4dabf7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePayment(p)}
                    disabled={deletingPaymentId === p.id || String(p.paymentCategory || p.paymentType || '').toLowerCase() !== 'service'}
                    style={{
                      marginLeft: '8px',
                      padding: '8px 12px',
                      minWidth: '72px',
                      background:
                        String(p.paymentCategory || p.paymentType || '').toLowerCase() === 'service' ? '#dc2626' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor:
                        deletingPaymentId === p.id || String(p.paymentCategory || p.paymentType || '').toLowerCase() !== 'service'
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: deletingPaymentId === p.id ? 0.8 : 1
                    }}
                  >
                    {deletingPaymentId === p.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderInstallmentsTab = () => (
    <div className={styles.tabContent}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '0 0 16px' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', minWidth: '240px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Pay Small Small Earnings</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
            ₦{installmentPayments
              .filter((p) => p.status === 'paid' || p.paymentStatus === 'paid')
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
              .toLocaleString()}
          </div>
        </div>
      </div>
      <div className={styles.section}>
        <h3>50% Installment Approval Requests ({installmentApplications.length})</h3>
        <div style={{ marginTop: '10px', marginBottom: '14px', maxWidth: '360px' }}>
          <input
            type="search"
            placeholder="Search installment applications..."
            value={installmentSearch}
            onChange={(e) => setInstallmentSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '999px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              fontWeight: 600
            }}
          />
        </div>
        {installmentAppsLoading ? <div>Loading...</div> : (
          <>
            <div className={styles.desktopOnly}>
              {toArray<InstallmentApplication>(installmentApplications)
                .filter((app: any) => {
                  const q = installmentSearch.trim().toLowerCase();
                  if (!q) return true;
                  const customer = app.user || app.customer || {};
                  const customerName =
                    (customer.fullName && String(customer.fullName).trim()) ||
                    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                    app.fullName ||
                    '';
                  const customerEmail = customer.email || app.email || '';
                  const customerPhone = customer.phone || app.phone || '';
                  const cartItems = Array.isArray(app.cartItems) ? app.cartItems : [];
                  const productNames = cartItems.map((i: any) => i?.productName || i?.name).filter(Boolean);
                  const createdAt = app.createdAt ? new Date(app.createdAt) : null;
                  const approvedAt = app.approvedAt ? new Date(app.approvedAt) : null;
                  const haystack = [
                    customerName,
                    customerEmail,
                    customerPhone,
                    app.address,
                    app.id,
                    createdAt ? createdAt.toLocaleDateString() : '',
                    createdAt ? createdAt.toISOString().slice(0, 10) : '',
                    approvedAt ? approvedAt.toLocaleDateString() : '',
                    approvedAt ? approvedAt.toISOString().slice(0, 10) : '',
                    ...productNames
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                  return haystack.includes(q);
                })
                .map((app: any) => {
                const customer = app.user || app.customer || {};
                const customerName =
                  (customer.fullName && String(customer.fullName).trim()) ||
                  `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                  app.fullName ||
                  'N/A';
                const customerEmail = customer.email || app.email || 'N/A';
                const customerPhone = customer.phone || app.phone || 'N/A';

                const product = app.product || app.order?.product || {};
                const store = app.store || app.order?.store || product?.store || {};
                const cartItems = Array.isArray(app.cartItems) ? app.cartItems : [];
                const rawItems = cartItems.length > 0
                  ? cartItems
                  : [
                      {
                        productName: product.name || app.order?.productName || 'N/A',
                        price: product.price || app.order?.total || 0,
                        image: product.image || app.order?.productImage || '',
                        storeName: store.name || app.order?.storeName || 'N/A',
                        storeCity: store.city || store.location || 'N/A'
                      }
                    ];
                const displayItems = rawItems.map((item: any) => {
                  const resolvedItem = resolveInstallmentItemMeta(item, store, app);
                  return {
                    ...item,
                    productName: resolvedItem.productName,
                    storeName: resolvedItem.storeName,
                    storeCity: resolvedItem.storeCity,
                    productId: item?.productId || resolvedItem.productId || undefined,
                    storeId: item?.storeId || resolvedItem.storeId || undefined
                  };
                });

                const requestedAmount = Number(app.requestedAmount || app.order?.total || app.orderTotal || 0);
                const upfrontPct = Number(app.downPaymentPercentage || app.upfrontPercentage || 50);
                const upfrontAmount = Number(app.downPaymentAmount || (requestedAmount > 0 ? (requestedAmount * upfrontPct) / 100 : 0));

                const appStatus = String(app.status || 'pending').toLowerCase();
                const derivedPaymentStatus =
                  appStatus === 'payment_completed' || appStatus === 'paid'
                    ? 'paid'
                    : appStatus === 'approved'
                      ? 'pending'
                      : 'n/a';
                const paymentStatus = String(app.paymentStatus || app.order?.paymentStatus || derivedPaymentStatus).toLowerCase();
                const safePaymentStatus = ['pending', 'paid', 'completed', 'failed'].includes(paymentStatus) ? paymentStatus : 'pending';
                const deliveryStatus = String(app.deliveryStatus || app.order?.orderStatus || app.order?.status || 'pending').toLowerCase();
                const installationStatus = String(app.installationStatus || 'pending').toLowerCase();
                const firstPaymentDate = app.firstPaymentDate ? new Date(app.firstPaymentDate) : null;
                const appStatusLabel = appStatus === 'payment_completed'
                  ? `50% payment completed${firstPaymentDate ? ` • ${firstPaymentDate.toLocaleDateString()}` : ''}`
                  : appStatus.replace(/_/g, ' ');
                const mobilePaymentStyle: CSSProperties =
                  paymentStatus === 'paid' || paymentStatus === 'completed'
                    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : paymentStatus === 'failed'
                      ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                      : { background: '#E0E7FF', color: '#3730A3', border: '1px solid #A5B4FC' };

                const pillBaseStyle = {
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  textTransform: 'capitalize' as const,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap' as const
                };

                const appStatusStyle =
                  appStatus === 'approved'
                    ? { ...pillBaseStyle, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : appStatus === 'rejected'
                      ? { ...pillBaseStyle, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                      : { ...pillBaseStyle, background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };

                const paymentStatusStyle =
                  paymentStatus === 'paid' || paymentStatus === 'completed'
                    ? { ...pillBaseStyle, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : paymentStatus === 'failed'
                      ? { ...pillBaseStyle, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                      : { ...pillBaseStyle, background: '#E0E7FF', color: '#3730A3', border: '1px solid #A5B4FC' };

                const incomeRaw = app.monthlyIncome;
                const incomeSanitized =
                  typeof incomeRaw === 'number'
                    ? incomeRaw
                    : Number(String(incomeRaw || '').replace(/[^0-9.-]/g, ''));
                const incomeDisplay = Number.isFinite(incomeSanitized) && incomeSanitized > 0
                  ? `N${incomeSanitized.toLocaleString()}`
                  : 'N/A';

                return (
                  <details key={app.id} className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3">
                    <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Customer</p>
                        <p className="text-sm font-semibold text-gray-900">{customerName}</p>
                        <p className="text-xs text-gray-500">{customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Applied</p>
                        <p className="text-sm font-semibold">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span style={appStatusStyle}>{appStatusLabel}</span>
                        <span style={paymentStatusStyle}>
                          {appStatus === 'payment_completed'
                            ? `50% paid${firstPaymentDate ? ` • ${firstPaymentDate.toLocaleDateString()}` : ''}`
                            : paymentStatus}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          Delivery: {deliveryStatus.replace(/_/g, ' ')}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          Install: {installationStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </summary>

                    <div className="mt-4 grid lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Customer Details</p>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div><strong>Name:</strong> {customerName}</div>
                          <div><strong>Email:</strong> {customerEmail}</div>
                          <div><strong>Phone:</strong> {customerPhone}</div>
                          <div><strong>Employment:</strong> {app.employmentStatus || 'N/A'}</div>
                          <div><strong>Income:</strong> {incomeDisplay}</div>
                          <div><strong>Organization:</strong> {app.organization || 'N/A'}</div>
                          <div><strong>Address:</strong> {app.address || 'N/A'}</div>
                          <div><strong>BVN:</strong> {app.bvn || 'N/A'}</div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Product / Store</p>
                        <div className="space-y-3">
                          {displayItems.map((item: any, idx: number) => {
                            const imageUrl = item.image ? getImageUrl(item.image) : getSmallFallbackImage('No Image');
                            return (
                              <div key={`${app.id}-${idx}`} className="flex gap-3 items-center">
                                <img
                                  src={imageUrl || getSmallFallbackImage('No Image')}
                                  alt={item.productName || 'Product'}
                                  className="h-12 w-12 rounded-lg border object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getSmallFallbackImage('No Image');
                                  }}
                                />
                                <div className="text-sm text-gray-700">
                                  <div className="font-semibold">{item.productName || item.name || 'N/A'}</div>
                                  <div>Price: N{Number(item.price || 0).toLocaleString()}</div>
                                  <div>Store: {item.storeName || item.store?.name || store.name || app.storeName || 'N/A'}</div>
                                  <div>City: {item.storeCity || item.city || item.store?.city || store.city || store.location || app.storeCity || 'N/A'}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Application</p>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div><strong>{upfrontPct}% Upfront</strong></div>
                          <div>Total: N{Number(app.totalAmount || requestedAmount).toLocaleString()}</div>
                          <div>Required Now: N{Number(app.firstPayment || upfrontAmount).toLocaleString()}</div>
                          <div>Monthly: N{Number(app.monthlyPayment || 0).toLocaleString()}</div>
                          <div>Duration: {app.months || 'N/A'} months</div>
                          <div><strong>Applied:</strong> {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}</div>
                          <div><strong>Approved:</strong> {app.approvedAt ? new Date(app.approvedAt).toLocaleDateString() : 'N/A'}</div>
                          <div><strong>Installed:</strong> {app.installedAt ? new Date(app.installedAt).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <div className="mt-3 grid gap-2">
                          <select
                            value={safePaymentStatus}
                            onChange={(e) => handleInstallmentPaymentAction(app.id, e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#fff' }}
                          >
                            <option value="pending">Payment: Pending</option>
                            <option value="paid">Payment: Paid</option>
                            <option value="completed">Payment: Completed</option>
                            <option value="failed">Payment: Failed</option>
                            <option value="reconcile">Payment: Reconcile & Refresh</option>
                          </select>
                          <select
                            value={deliveryStatus}
                            onChange={(e) => handleUpdateInstallmentProgress(app.id, { deliveryStatus: e.target.value })}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#fff' }}
                          >
                            <option value="pending">Delivery: Pending</option>
                            <option value="processing">Delivery: Processing</option>
                            <option value="shipped">Delivery: Shipped</option>
                            <option value="in_transit">Delivery: In Transit</option>
                            <option value="out_for_delivery">Delivery: Out for Delivery</option>
                            <option value="delivered">Delivery: Delivered</option>
                            <option value="cancelled">Delivery: Cancelled</option>
                          </select>
                          <select
                            value={installationStatus}
                            onChange={(e) => handleUpdateInstallmentProgress(app.id, { installationStatus: e.target.value })}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#fff' }}
                          >
                            <option value="pending">Install: Pending</option>
                            <option value="scheduled">Install: Scheduled</option>
                            <option value="in_progress">Install: In Progress</option>
                            <option value="installed">Install: Installed</option>
                            <option value="cancelled">Install: Cancelled</option>
                          </select>
                        </div>
                        {appStatus === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => handleApproveInstallment(app.id)} className={styles.approveBtn}>Approve</button>
                            <button onClick={() => handleRejectInstallment(app.id)} className={styles.rejectBtn}>Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                );
                })}
            </div>

            <div className={styles.mobileOnly}>
              {toArray<InstallmentApplication>(installmentApplications)
                .filter((app: any) => {
                  const q = installmentSearch.trim().toLowerCase();
                  if (!q) return true;
                  const customer = app.user || app.customer || {};
                  const customerName =
                    (customer.fullName && String(customer.fullName).trim()) ||
                    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                    app.fullName ||
                    '';
                  const customerEmail = customer.email || app.email || '';
                  const customerPhone = customer.phone || app.phone || '';
                  const cartItems = Array.isArray(app.cartItems) ? app.cartItems : [];
                  const productNames = cartItems.map((i: any) => i?.productName || i?.name).filter(Boolean);
                  const createdAt = app.createdAt ? new Date(app.createdAt) : null;
                  const approvedAt = app.approvedAt ? new Date(app.approvedAt) : null;
                  const haystack = [
                    customerName,
                    customerEmail,
                    customerPhone,
                    app.address,
                    app.id,
                    createdAt ? createdAt.toLocaleDateString() : '',
                    createdAt ? createdAt.toISOString().slice(0, 10) : '',
                    approvedAt ? approvedAt.toLocaleDateString() : '',
                    approvedAt ? approvedAt.toISOString().slice(0, 10) : '',
                    ...productNames
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                  return haystack.includes(q);
                })
                .map((app: any) => {
                const customer = app.user || app.customer || {};
                const customerName =
                  (customer.fullName && String(customer.fullName).trim()) ||
                  `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                  app.fullName ||
                  'N/A';
                const customerEmail = customer.email || app.email || 'N/A';
                const customerPhone = customer.phone || app.phone || 'N/A';

                const cartItems = Array.isArray(app.cartItems) ? app.cartItems : [];
                const product = app.product || app.order?.product || {};
                const store = app.store || app.order?.store || product?.store || {};
                const rawItems = cartItems.length > 0
                  ? cartItems
                  : [
                      {
                        productName: product.name || app.order?.productName || 'N/A',
                        price: product.price || app.order?.total || 0,
                        image: product.image || app.order?.productImage || '',
                        storeName: store.name || app.order?.storeName || 'N/A',
                        storeCity: store.city || store.location || 'N/A'
                      }
                    ];
                const displayItems = rawItems.map((item: any) => {
                  const resolvedItem = resolveInstallmentItemMeta(item, store, app);
                  return {
                    ...item,
                    productName: resolvedItem.productName,
                    storeName: resolvedItem.storeName,
                    storeCity: resolvedItem.storeCity,
                    productId: item?.productId || resolvedItem.productId || undefined,
                    storeId: item?.storeId || resolvedItem.storeId || undefined
                  };
                });

                const requestedAmount = Number(app.requestedAmount || app.order?.total || app.orderTotal || 0);
                const upfrontPct = Number(app.downPaymentPercentage || app.upfrontPercentage || 50);
                const upfrontAmount = Number(app.downPaymentAmount || (requestedAmount > 0 ? (requestedAmount * upfrontPct) / 100 : 0));

                const appStatus = String(app.status || 'pending').toLowerCase();
                const derivedPaymentStatus =
                  appStatus === 'payment_completed' || appStatus === 'paid'
                    ? 'paid'
                    : appStatus === 'approved'
                      ? 'pending'
                      : 'n/a';
                const paymentStatus = String(app.paymentStatus || app.order?.paymentStatus || derivedPaymentStatus).toLowerCase();
                const safePaymentStatus = ['pending', 'paid', 'completed', 'failed'].includes(paymentStatus) ? paymentStatus : 'pending';
                const deliveryStatus = String(app.deliveryStatus || app.order?.orderStatus || app.order?.status || 'pending').toLowerCase();
                const installationStatus = String(app.installationStatus || 'pending').toLowerCase();
                const firstPaymentDate = app.firstPaymentDate ? new Date(app.firstPaymentDate) : null;
                const appStatusLabel = appStatus === 'payment_completed'
                  ? `50% payment completed${firstPaymentDate ? ` • ${firstPaymentDate.toLocaleDateString()}` : ''}`
                  : appStatus.replace(/_/g, ' ');
                const mobilePaymentStyle: CSSProperties =
                  paymentStatus === 'paid' || paymentStatus === 'completed'
                    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : paymentStatus === 'failed'
                      ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                      : { background: '#E0E7FF', color: '#3730A3', border: '1px solid #A5B4FC' };

                return (
                  <div key={app.id} className={styles.installmentCard}>
                    <div className={styles.installmentCardHeader}>
                      <div className={styles.installmentCardLabel}>{customerName}</div>
                      <span style={{ padding: '4px 10px', borderRadius: '999px', fontWeight: 700, textTransform: 'capitalize', background: appStatus === 'approved' ? '#DCFCE7' : appStatus === 'rejected' ? '#FEE2E2' : '#FEF3C7', color: appStatus === 'approved' ? '#166534' : appStatus === 'rejected' ? '#991B1B' : '#92400E', border: '1px solid #E5E7EB' }}>
                        {appStatusLabel}
                      </span>
                    </div>

                    <div className={styles.installmentCardSection}>
                      <div className={styles.installmentCardLabel}>Customer</div>
                      <div className={styles.installmentCardValue}>{customerEmail} • {customerPhone}</div>
                      <div className={styles.installmentCardValue}>Address: {app.address || 'N/A'}</div>
                    </div>

                    <div className={styles.installmentCardSection}>
                      <div className={styles.installmentCardLabel}>Products</div>
                      {displayItems.map((item: any, idx: number) => (
                        <div key={`${app.id}-item-${idx}`} className={styles.installmentCardValue}>
                          {(item.productName || item.name || 'N/A')} • ₦{Number(item.price || 0).toLocaleString()} • {item.storeName || 'N/A'}
                        </div>
                      ))}
                    </div>

                    <div className={styles.installmentCardSection}>
                      <div className={styles.installmentCardLabel}>Application</div>
                      <div className={styles.installmentCardValue}>{upfrontPct}% upfront • Total ₦{Number(app.totalAmount || requestedAmount).toLocaleString()}</div>
                      <div className={styles.installmentCardValue}>Required now ₦{Number(app.firstPayment || upfrontAmount).toLocaleString()}</div>
                      <div className={styles.installmentCardValue}>Monthly ₦{Number(app.monthlyPayment || 0).toLocaleString()} • {app.months || 'N/A'} months</div>
                      <div className={styles.installmentCardValue}>Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}</div>
                    </div>

                    <div className={styles.installmentStatusRow}>
                      <span style={{ ...mobilePaymentStyle, padding: '4px 12px', borderRadius: '999px', fontWeight: 700, textTransform: 'capitalize' }}>
                        {appStatus === 'payment_completed'
                          ? `50% paid${firstPaymentDate ? ` • ${firstPaymentDate.toLocaleDateString()}` : ''}`
                          : paymentStatus}
                      </span>
                      <select
                        value={safePaymentStatus}
                        onChange={(e) => handleInstallmentPaymentAction(app.id, e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#fff' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="reconcile">Reconcile & Refresh</option>
                      </select>
                      <select
                        value={deliveryStatus}
                        onChange={(e) => handleUpdateInstallmentProgress(app.id, { deliveryStatus: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#fff' }}
                      >
                        <option value="pending">Delivery: Pending</option>
                        <option value="processing">Delivery: Processing</option>
                        <option value="shipped">Delivery: Shipped</option>
                        <option value="in_transit">Delivery: In Transit</option>
                        <option value="out_for_delivery">Delivery: Out for Delivery</option>
                        <option value="delivered">Delivery: Delivered</option>
                        <option value="cancelled">Delivery: Cancelled</option>
                      </select>
                      <select
                        value={installationStatus}
                        onChange={(e) => handleUpdateInstallmentProgress(app.id, { installationStatus: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5f5', background: '#fff' }}
                      >
                        <option value="pending">Install: Pending</option>
                        <option value="scheduled">Install: Scheduled</option>
                        <option value="in_progress">Install: In Progress</option>
                        <option value="installed">Install: Installed</option>
                        <option value="cancelled">Install: Cancelled</option>
                      </select>
                    </div>

                    {appStatus === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleApproveInstallment(app.id)} className={styles.approveBtn}>Approve</button>
                        <button onClick={() => handleRejectInstallment(app.id)} className={styles.rejectBtn}>Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className={styles.section}>
        <h3>Installment Payment Schedule ({installmentPayments.length})</h3>
        {installmentPaymentsLoading ? <div>Loading...</div> : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product / Store</th>
                <th>Amount</th>
                <th>Installment</th>
                <th>Payment Status</th>
                <th>Delivery Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {toArray<InstallmentPayment>(installmentPayments).map((ip: any) => {
                const customer = ip.user || ip.order?.customer || {};
                const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.fullName || 'N/A';
                const product = ip.product || ip.order?.product || {};
                const store = ip.store || ip.order?.store || product?.store || {};
                const paymentStatus = String(ip.paymentStatus || ip.status || 'pending').toLowerCase();
                const deliveryStatus = String(ip.deliveryStatus || ip.order?.status || 'N/A').toLowerCase();

                const paymentStyle =
                  paymentStatus === 'paid' || paymentStatus === 'completed'
                    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : paymentStatus === 'failed' || paymentStatus === 'overdue'
                      ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }
                      : { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };

                const deliveryStyle =
                  deliveryStatus === 'delivered'
                    ? { background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }
                    : deliveryStatus === 'shipped' || deliveryStatus === 'in_transit' || deliveryStatus === 'out_for_delivery'
                      ? { background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #93C5FD' }
                      : { background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1' };

                return (
                  <tr key={ip.id}>
                    <td>{String(ip.orderId || '').slice(0, 8) || 'N/A'}</td>
                    <td>{customerName}</td>
                    <td>
                      <div style={{ minWidth: '190px' }}>
                        <div><strong>{product.name || ip.order?.productName || 'N/A'}</strong></div>
                        <div>{store.name || ip.order?.storeName || 'N/A'}</div>
                      </div>
                    </td>
                    <td>N{Number(ip.amount || 0).toLocaleString()}</td>
                    <td>{ip.installmentNumber}/{ip.totalInstallments}</td>
                    <td>
                      <span style={{ ...paymentStyle, padding: '4px 10px', borderRadius: '999px', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block' }}>
                        {paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span style={{ ...deliveryStyle, padding: '4px 10px', borderRadius: '999px', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block' }}>
                        {deliveryStatus}
                      </span>
                    </td>
                    <td>{ip.dueDate ? new Date(ip.dueDate).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderChequesTab = () => (
    <div className={styles.tabContent}>
      <h3>Cheque Tracking</h3>
      {chequesLoading ? <div>Loading cheques...</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cheque #</th>
              <th>Bank</th>
              <th>Amount</th>
              <th>Maturity Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {cheques.map((c) => (
              <tr key={c.id}>
                <td>{c.chequeNumber}</td>
                <td>{c.bankName}</td>
                <td>₦{c.amount.toLocaleString()}</td>
                <td>{new Date(c.maturityDate).toLocaleDateString()}</td>
                <td><span className={styles.statusBadge}>{c.status}</span></td>
                <td>
                  <select onChange={(e) => handleUpdateChequeStatus(c.id, e.target.value)} style={{ padding: '5px' }}>
                    <option value="">Update...</option>
                    <option value="verified">Verify</option>
                    <option value="deposited">Deposited</option>
                    <option value="cleared">Cleared</option>
                    <option value="rejected">Reject</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderReturnsTab = () => (
    <div className={styles.tabContent}>
      <h3>Product Returns ({returns.length})</h3>
      {returnsLoading ? <div>Loading returns...</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>RMA #</th>
              <th>Order ID</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Refund Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id}>
                <td>{r.rmaNumber}</td>
                <td>{r.orderId.slice(0, 8)}</td>
                <td>{r.reason}</td>
                <td><span className={styles.statusBadge}>{r.status}</span></td>
                <td>₦{(r.refundAmount || 0).toLocaleString()}</td>
                <td>
                  {r.status === 'requested' && (
                    <>
                      <button onClick={() => handleApproveReturn(r.id)} className={styles.approveBtn}>Approve</button>
                      <button onClick={() => handleRejectReturn(r.id)} className={styles.rejectBtn}>Reject</button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button style={{ padding: '5px 10px', background: '#51cf66', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Process Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderCouponsTab = () => (
    <div className={styles.tabContent}>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setShowCouponForm(!showCouponForm)} style={{ background: '#00d4ff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {showCouponForm ? '✕ Close' : '+ Create Coupon'}
        </button>
      </div>

      {showCouponForm && (
        <form onSubmit={handleCreateCoupon} style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Coupon Code"
            value={couponForm.code}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <input
              type="number"
              placeholder="Discount %"
              value={couponForm.discountPercentage}
              onChange={(e) => setCouponForm({ ...couponForm, discountPercentage: parseFloat(e.target.value) })}
              style={{ padding: '8px' }}
            />
            <input
              type="number"
              placeholder="Discount amount (e.g. 10,000)"
              value={couponForm.discountAmount}
              onChange={(e) => setCouponForm({ ...couponForm, discountAmount: parseFloat(e.target.value) })}
              style={{ padding: '8px' }}
            />
          </div>
          <input
            type="number"
            placeholder="Minimum order (e.g. 50,000)"
            value={couponForm.minimumOrderAmount}
            onChange={(e) => setCouponForm({ ...couponForm, minimumOrderAmount: parseFloat(e.target.value) })}
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="date"
            value={couponForm.expiryDate}
            onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
            required
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <input
            type="number"
            placeholder="Usage Limit (0 for unlimited)"
            value={couponForm.usageLimit}
            onChange={(e) => setCouponForm({ ...couponForm, usageLimit: parseInt(e.target.value) })}
            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
          />
          <button type="submit" style={{ background: '#51cf66', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Create Coupon
          </button>
        </form>
      )}

      <h3>Active Coupons ({coupons.length})</h3>
      {couponsLoading ? <div>Loading coupons...</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min Order</th>
              <th>Expires</th>
              <th>Usage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((cp) => (
              <tr key={cp.id}>
                <td><strong>{cp.code}</strong></td>
                <td>
                  {cp.discountPercentage ? `${cp.discountPercentage}%` : `₦${cp.discountAmount}`}
                </td>
                <td>₦{cp.minimumOrderAmount.toLocaleString()}</td>
                <td>{new Date(cp.expiryDate).toLocaleDateString()}</td>
                <td>{cp.timesUsed}/{cp.usageLimit === 0 ? '∞' : cp.usageLimit}</td>
                <td><span className={styles.statusBadge} style={{ backgroundColor: cp.isActive ? '#51cf66' : '#ff922b' }}>{cp.status}</span></td>
                <td>
                  <button
                    onClick={() => handleToggleCouponStatus(cp.id, !cp.isActive)}
                    style={{ background: cp.isActive ? '#ffa94d' : '#51cf66', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px' }}
                  >
                    {cp.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDeleteCoupon(cp.id)} style={{ background: '#ff6b6b', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderWishlistsTab = () => (
    <div className={styles.tabContent}>
      <h3>Customer Wishlists ({wishlists.length} items)</h3>
      {wishlistsLoading ? <div>Loading wishlists...</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product</th>
              <th>Price</th>
              <th>Added Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {wishlists.map((w) => (
              <tr key={w.id}>
                <td>{w.user?.firstName || 'N/A'} {w.user?.lastName || ''}</td>
                <td>{w.productName || w.product?.name || 'Wishlist item'}</td>
                <td>₦{(w.productPrice || w.product?.price || 0).toLocaleString()}</td>
                <td>{new Date((w as any).addedAt || w.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => setSelectedWishlistItem(w)}
                    style={{ padding: '8px 12px', minWidth: '72px', background: '#4dabf7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderFinancialTab = () => (
    <div className={styles.tabContent}>
      <h3>Financial Report</h3>
      {financialLoading ? <div>Loading financial data...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Revenue</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₦{(financialReport?.totalRevenue || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Orders</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{financialReport?.totalOrders || 0}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Refunds</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₦{(financialReport?.totalRefunds || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Completed Payments</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{financialReport?.completedPayments || 0}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Failed Payments</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{financialReport?.failedPayments || 0}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Average Order Value</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₦{(financialReport?.averageOrderValue || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Installments</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₦{(financialReport?.totalInstallments || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', color: 'white', padding: '20px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Paid Installments</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₦{(financialReport?.paidInstallments || 0).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  const normalizedRole = String(user?.role || '').toLowerCase();
  const normalizedAccountType = String((user as any)?.accountType || '').toLowerCase();
  const adminLevel = String((user as any)?.adminLevel || '').toUpperCase();
  const isAdminLike =
    normalizedRole === 'admin' ||
    normalizedAccountType === 'admin' ||
    adminLevel.startsWith('SA');

  if (!isHydrated || !user || !isAdminLike) {
    return <div>Loading...</div>;
  }

  const tabLabels: Record<TabType, string> = {
    overview: 'Overview',
    users: 'Users',
    admins: 'Admin Accounts',
    vendors: 'Vendors',
    orders: 'Orders',
    products: 'Products',
    stores: 'Stores',
    'ev-stores': 'E V Stores',
    categories: 'Categories',
    payments: 'Payments',
    installments: 'Installments',
    cheques: 'Cheques',
    returns: 'Returns',
    coupons: 'Coupons',
    wishlists: 'Wishlists',
    financial: 'Financial',
    quotations: 'Quotations',
  };

  const adminSidebarItems = [
    ...(['overview', 'users', 'admins', 'vendors', 'orders', 'products', 'stores', 'ev-stores', 'categories', 'payments', 'installments', 'cheques', 'returns', 'coupons', 'wishlists', 'financial'] as TabType[]).map((tab) => {
      const iconMap: Record<string, string> = {
        overview: '📊',
        users: '👥',
        admins: '🛡️',
        vendors: '🏪',
        orders: '🧾',
        products: '📦',
        stores: '🏬',
        'ev-stores': '🚗',
        categories: '🗂️',
        payments: '💳',
        installments: '🧩',
        cheques: '📄',
        returns: '↩️',
        coupons: '🎟️',
        wishlists: '❤️',
        financial: '💹',
      };
      return { key: tab, label: tabLabels[tab] || tab, icon: iconMap[tab] };
    }),
    { key: 'tool-installer-verification', label: 'Installer Verification', icon: '✅', onClick: () => router.push('/admin/installer-verification') },
    { key: 'tool-referrals', label: 'Referral Management', icon: '🤝', onClick: () => router.push('/admin/referrals') },
    { key: 'tool-payouts', label: 'Payout Requests', icon: '💵', onClick: () => router.push('/admin/payout-requests') },
    { key: 'tool-chat', label: adminChatPendingCount > 0 ? `Live Chat Inbox (${adminChatPendingCount})` : 'Live Chat Inbox', icon: '💬', onClick: () => router.push('/admin/chat') },
    { key: 'tool-service-requests', label: 'Service Requests', icon: '📝', onClick: () => router.push('/admin/service-requests') },
    { key: 'tool-installation-requests', label: 'Installation Requests', icon: '🛠️', onClick: () => router.push('/admin/installation-requests') },
    { key: 'tool-installer-inquiries', label: 'Installer Inquiries', icon: '📨', onClick: () => router.push('/admin/installer-inquiries') },
    { key: 'tool-add-product', label: 'Add Product To Store', icon: '➕', onClick: () => router.push('/admin/post-product') },
    { key: 'tool-swap', label: 'Swap & Resell', icon: '🔄', onClick: () => router.push('/admin/swap-resell') },
    { key: 'tool-orders-management', label: 'Orders Management', icon: '📦', onClick: () => router.push('/admin/orders-management') },
    { key: 'tool-returns', label: 'Returns / Refunds', icon: '↩️', onClick: () => router.push('/admin-returns-management') },
    { key: 'tool-flash-deals', label: 'Flash Deals', icon: '⚡', onClick: () => router.push('/deals') },
    { key: 'tool-adverts', label: 'Advert Banners', icon: '🖼️', onClick: () => router.push('/admin/advert-banners') },
  ];

  return (
    <>
      <Header />
      <DashboardLayout
      title="Admin Dashboard"
      subtitle="Complete Management System"
      sidebarItems={adminSidebarItems}
      activeKey={activeTab}
      onNavigate={(key) => {
        const nextTab = key as TabType;
        setError('');
        setActiveTab(nextTab);
        loadTabData(nextTab);
      }}
      headerRight={(
        <>
          <DashboardHeaderActions messageHref="/messages?tab=notifications" settingsHref="/account-details" />
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            style={{
              padding: '10px 14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#111827',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Back
          </button>
        </>
      )}
    >
      {/* Error & Success Messages */}
      {error && <div style={{ background: '#ff6b6b', color: 'white', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>✗ {error}</div>}
      {success && <div style={{ background: '#51cf66', color: 'white', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>✓ {success}</div>}

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'admins' && renderAdminsTab()}
      {activeTab === 'vendors' && renderVendorsTab()}
      {activeTab === 'orders' && renderOrdersTab()}
      {activeTab === 'products' && renderProductsTab()}
      {activeTab === 'stores' && renderStoresTab()}
      {activeTab === 'ev-stores' && renderEvStoresTab()}
      {activeTab === 'categories' && renderCategoriesTab()}
      {activeTab === 'payments' && renderPaymentsTab()}
      {activeTab === 'installments' && renderInstallmentsTab()}
      {activeTab === 'cheques' && renderChequesTab()}
      {activeTab === 'returns' && renderReturnsTab()}
      {activeTab === 'coupons' && renderCouponsTab()}
      {activeTab === 'wishlists' && renderWishlistsTab()}
      {activeTab === 'financial' && renderFinancialTab()}

      {chatPopupVisible && chatPopupConversation && (
        <div
          style={{
            position: 'fixed',
            right: '16px',
            bottom: '16px',
            width: 'min(380px, calc(100vw - 24px))',
            maxHeight: '70vh',
            zIndex: 10030,
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid #bbf7d0',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.28)',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(90deg, #065f46 0%, #0f766e 100%)',
              color: '#fff',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 800 }}>New Live Chat Message</div>
                <div style={{ fontSize: '11px', opacity: 0.95 }}>
                {chatPopupConversation.displayName || 'Customer'} • {chatPopupConversation.channel === 'whatsapp' ? `WhatsApp${chatPopupConversation.phone ? ` (${chatPopupConversation.phone})` : ''}` : 'Web Chat'}
                </div>
              </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => router.push('/admin/chat')}
                style={{
                  border: '1px solid rgba(255,255,255,0.45)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '6px 10px',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Open Inbox
              </button>
              <button
                type="button"
                onClick={() => setChatPopupVisible(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
                aria-label="Close chat popup"
              >
                ×
              </button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              background: '#f8fafc',
              padding: '10px'
            }}
          >
            {chatPopupLoading ? (
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Loading messages...</div>
            ) : (
              chatPopupMessages.slice(-8).map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={`${msg.id || idx}-${idx}`} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                    <div
                      style={{
                        maxWidth: '85%',
                        borderRadius: '14px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        lineHeight: 1.4,
                        background: isUser ? '#172554' : '#e2e8f0',
                        color: isUser ? '#fff' : '#0f172a'
                      }}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px', background: '#fff' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={chatPopupReply}
                onChange={(e) => setChatPopupReply(e.target.value)}
                placeholder="Type reply..."
                style={{
                  flex: 1,
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendPopupReply();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSendPopupReply}
                disabled={chatPopupSending || !chatPopupReply.trim()}
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: chatPopupSending || !chatPopupReply.trim() ? '#cbd5e1' : '#10b981',
                  color: '#fff'
                }}
              >
                {chatPopupSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div
          onClick={() => setSelectedPayment(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Payment Details</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedPayment.reference}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                style={{ border: 'none', background: 'transparent', fontSize: '22px', lineHeight: 1, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '18px 20px', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Amount</span>
                <span style={{ fontWeight: 700 }}>₦{Number(selectedPayment.amount || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Status</span>
                <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{selectedPayment.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Method</span>
                <span style={{ fontWeight: 700 }}>{selectedPayment.paymentMethod || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Date</span>
                <span style={{ fontWeight: 700 }}>{selectedPayment.transactionDate ? new Date(selectedPayment.transactionDate).toLocaleString() : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Type</span>
                <span style={{ fontWeight: 700 }}>
                  {selectedPayment.paymentCategory === 'service'
                    ? 'Service'
                    : selectedPayment.paymentCategory === 'tradein'
                      ? 'Trade-In'
                      : selectedPayment.paymentCategory === 'flash'
                        ? 'Flash Deal'
                        : selectedPayment.paymentCategory === 'swap'
                          ? 'Swap'
                          : selectedPayment.paymentCategory === 'ev'
                            ? 'EV'
                            : selectedPayment.paymentCategory === 'installment'
                              ? 'Installment'
                              : 'Order'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>{selectedPayment.paymentType === 'service' ? 'Service Request ID' : 'Order ID'}</span>
                <span style={{ fontWeight: 700 }}>
                  {selectedPayment.paymentType === 'service'
                    ? (selectedPayment.serviceRequestId || 'N/A')
                    : (selectedPayment.orderId || selectedPayment.order?.id || 'N/A')}
                </span>
              </div>
              {selectedPayment.paymentType === 'service' && selectedPayment.serviceRequestId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: '#64748b' }}>Service Request</span>
                  <a
                    href={`/admin/service-requests?selected=${selectedPayment.serviceRequestId}`}
                    style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'underline' }}
                  >
                    View Service Request
                  </a>
                </div>
              )}
              {(selectedPayment.customer || selectedPayment.order?.user) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: '#64748b' }}>Customer</span>
                  <span style={{ fontWeight: 700 }}>
                    {selectedPayment.customer?.fullName ||
                      `${selectedPayment.customer?.firstName || ''} ${selectedPayment.customer?.lastName || ''}`.trim() ||
                      `${selectedPayment.order?.user?.firstName || ''} ${selectedPayment.order?.user?.lastName || ''}`.trim()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedWishlistItem && (
        <div
          onClick={() => setSelectedWishlistItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Wishlist Item</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedWishlistItem.productName || selectedWishlistItem.product?.name || 'Wishlist item'}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWishlistItem(null)}
                style={{ border: 'none', background: 'transparent', fontSize: '22px', lineHeight: 1, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '18px 20px', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Customer</span>
                <span style={{ fontWeight: 700 }}>
                  {selectedWishlistItem.user?.firstName || 'N/A'} {selectedWishlistItem.user?.lastName || ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Price</span>
                <span style={{ fontWeight: 700 }}>₦{Number(selectedWishlistItem.productPrice || selectedWishlistItem.product?.price || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#64748b' }}>Added</span>
                <span style={{ fontWeight: 700 }}>
                  {new Date((selectedWishlistItem as any).addedAt || selectedWishlistItem.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </>
  );
}





