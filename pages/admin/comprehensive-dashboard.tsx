import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/admin-dashboard.module.css';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';

// ============================================
// INTERFACES
// ============================================

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  accountType: string;
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
  orderStatus?: string;
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
  subcategories?: SubCategory[];
  createdAt: string;
}

interface SubCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  categoryId: string;
  createdAt: string;
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  image: string;
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
};

type TabType = 'overview' | 'users' | 'vendors' | 'orders' | 'products' | 'stores' | 'categories' | 'quotations' | 'jobs' | 'installments';

export default function ComprehensiveAdminDashboard() {
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

  // Vendors Tab State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
  const [rejectionNotes, setRejectionNotes] = useState<{ [key: string]: string }>({});

  // Orders Tab State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Products Tab State
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

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

  // Expanded category for subcategories view
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // ============================================
  // AUTH CHECK & TAB LOADING
  // ============================================

  useEffect(() => {
    if (!isHydrated) return;

    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    // Load data based on active tab
    loadTabData(activeTab);
  }, [activeTab, isHydrated, user, router]);

  const loadTabData = (tab: TabType) => {
    switch (tab) {
      case 'overview':
        fetchStats();
        break;
      case 'users':
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
      case 'categories':
        fetchCategories();
        break;
    }
  };

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await apiClient.get('/admin/stats');
      setStats(response.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await apiClient.get('/admin/users');
      setUsers(response.data || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);
      const [allVendors, pending] = await Promise.all([
        apiClient.get('/admin/vendors').catch(() => ({ data: [] })),
        apiClient.get('/admin/vendors/pending').catch(() => ({ data: [] }))
      ]);
      setVendors(allVendors.data || []);
      setPendingVendors(pending.data || []);
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
      const response = await apiClient.get('/admin/orders');
      setOrders(response.data || []);
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
      const response = await apiClient.get('/admin/products');
      setProducts(response.data || []);
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
      const response = await apiClient.get('/admin/stores');
      setStores(response.data || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching stores:', err);
      setError('Failed to fetch stores');
      setStores([]);
    } finally {
      setStoresLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiClient.get('/admin/categories');
      setCategories(response.data || []);
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
  // VENDOR ACTIONS
  // ============================================

  const handleVerifyVendor = async (vendorId: string, status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      const notes = status === 'rejected' ? rejectionNotes[vendorId] : '';
      await apiClient.post(`/admin/vendors/${vendorId}/verify`, { status, notes });
      setSuccess(`Vendor ${status} successfully`);
      fetchVendors();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${status} vendor`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      setLoading(true);
      await apiClient.delete(`/admin/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      setLoading(true);
      await apiClient.patch(`/admin/orders/${orderId}/status`, { status });
      setSuccess('Order status updated successfully');
      fetchOrders();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CATEGORY HANDLERS
  // ============================================

  const handleCategoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setCategoryForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubcategoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setSubcategoryForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!categoryForm.name.trim()) {
        setError('Category name is required');
        return;
      }

      if (editingCategoryId) {
        await apiClient.patch(`/admin/categories/${editingCategoryId}`, categoryForm);
        setSuccess('Category updated successfully');
      } else {
        await apiClient.post('/admin/categories', categoryForm);
        setSuccess('Category created successfully');
      }

      setCategoryForm(initialFormState);
      setEditingCategoryId(null);
      setShowCategoryForm(false);
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description,
      icon: category.icon,
      image: category.image,
    });
    setEditingCategoryId(category.id);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" and all its subcategories?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/categories/${id}`);
      setSuccess('Category deleted successfully');
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedCategoryId) {
        setError('Please select a category');
        return;
      }

      if (!subcategoryForm.name.trim()) {
        setError('Subcategory name is required');
        return;
      }

      if (editingSubcategoryId) {
        await apiClient.patch(
          `/admin/categories/${selectedCategoryId}/subcategories/${editingSubcategoryId}`,
          subcategoryForm
        );
        setSuccess('Subcategory updated successfully');
      } else {
        await apiClient.post(`/admin/categories/${selectedCategoryId}/subcategories`, subcategoryForm);
        setSuccess('Subcategory created successfully');
      }

      setSubcategoryForm(initialFormState);
      setEditingSubcategoryId(null);
      setShowSubcategoryForm(false);
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subcategory');
    }
  };

  const handleEditSubcategory = (subcategory: SubCategory) => {
    setSubcategoryForm({
      name: subcategory.name,
      description: subcategory.description,
      icon: subcategory.icon,
      image: subcategory.image,
    });
    setEditingSubcategoryId(subcategory.id);
    setSelectedCategoryId(subcategory.categoryId);
    setShowSubcategoryForm(true);
  };

  const handleDeleteSubcategory = async (categoryId: string, subcategoryId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/categories/${categoryId}/subcategories/${subcategoryId}`);
      setSuccess('Subcategory deleted successfully');
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete subcategory');
    }
  };

  const cancelCategoryForm = () => {
    setCategoryForm(initialFormState);
    setEditingCategoryId(null);
    setShowCategoryForm(false);
  };

  const cancelSubcategoryForm = () => {
    setSubcategoryForm(initialFormState);
    setEditingSubcategoryId(null);
    setSelectedCategoryId(null);
    setShowSubcategoryForm(false);
  };

  // ============================================
  // RENDER TAB CONTENT
  // ============================================

  const renderOverviewTab = () => (
    <div className={styles.tabContent}>
      <h2>Dashboard Overview</h2>
      {statsLoading ? (
        <div className={styles.loadingSpinner}>Loading statistics...</div>
      ) : stats ? (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statInfo}>
              <h3>Total Users</h3>
              <p className={styles.statNumber}>{stats.totalUsers || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🏪</div>
            <div className={styles.statInfo}>
              <h3>Vendors</h3>
              <p className={styles.statNumber}>{stats.totalVendors || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🔧</div>
            <div className={styles.statInfo}>
              <h3>Installers</h3>
              <p className={styles.statNumber}>{stats.totalInstallers || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🛍️</div>
            <div className={styles.statInfo}>
              <h3>Customers</h3>
              <p className={styles.statNumber}>{stats.totalCustomers || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statInfo}>
              <h3>Orders</h3>
              <p className={styles.statNumber}>{stats.totalOrders || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statInfo}>
              <h3>Revenue</h3>
              <p className={styles.statNumber}>₦{(stats.totalRevenue || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🏬</div>
            <div className={styles.statInfo}>
              <h3>Stores</h3>
              <p className={styles.statNumber}>{stats.totalStores || 0}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📋</div>
            <div className={styles.statInfo}>
              <h3>Products</h3>
              <p className={styles.statNumber}>{stats.totalProducts || 0}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.errorMessage}>Failed to load statistics</div>
      )}
    </div>
  );

  const renderUsersTab = () => (
    <div className={styles.tabContent}>
      <h2>User Management</h2>
      {usersLoading ? (
        <div className={styles.loadingSpinner}>Loading users...</div>
      ) : users.length === 0 ? (
        <div className={styles.errorMessage}>No users found</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Name</th>
                <th className={styles.tableHeader}>Email</th>
                <th className={styles.tableHeader}>Role</th>
                <th className={styles.tableHeader}>Phone</th>
                <th className={styles.tableHeader}>Location</th>
                <th className={styles.tableHeader}>Joined</th>
                <th className={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {users.map(u => (
                <tr key={u.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>{u.firstName} {u.lastName}</td>
                  <td className={styles.tableCell}>{u.email}</td>
                  <td className={styles.tableCell}>
                    <span className={styles.roleTag}>{u.role}</span>
                  </td>
                  <td className={styles.tableCell}>{u.phone || 'N/A'}</td>
                  <td className={styles.tableCell}>{u.city || 'N/A'}</td>
                  <td className={styles.tableCell}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className={styles.tableCell}>
                    <button className={styles.deleteBtn} onClick={() => handleDeleteUser(u.id)}>
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderVendorsTab = () => (
    <div className={styles.tabContent}>
      <h2>Vendor Management</h2>
      
      {/* Pending Vendors Section */}
      <div className={styles.section}>
        <h3 style={{ color: '#FF6B6B', marginTop: '20px' }}>⏳ Pending Approval ({pendingVendors.length})</h3>
        {vendorsLoading ? (
          <div className={styles.loadingSpinner}>Loading vendors...</div>
        ) : pendingVendors.length === 0 ? (
          <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>No pending vendors</div>
        ) : (
          <div className={styles.vendorsList}>
            {pendingVendors.map(vendor => (
              <div key={vendor.id} className={styles.vendorCard}>
                <div className={styles.vendorInfo}>
                  <h4>{vendor.firstName} {vendor.lastName}</h4>
                  <p><strong>Business:</strong> {vendor.businessName}</p>
                  <p><strong>Email:</strong> {vendor.email}</p>
                  <p><strong>Phone:</strong> {vendor.phone}</p>
                  <p><strong>Reg Number:</strong> {vendor.businessRegNumber}</p>
                  <p><strong>Applied:</strong> {new Date(vendor.createdAt).toLocaleDateString()}</p>
                </div>
                <div className={styles.vendorActions}>
                  <div>
                    <textarea
                      placeholder="Rejection notes (if rejecting)..."
                      value={rejectionNotes[vendor.id] || ''}
                      onChange={(e) => setRejectionNotes({ ...rejectionNotes, [vendor.id]: e.target.value })}
                      rows={2}
                      style={{ width: '100%', marginBottom: '10px', padding: '8px', borderRadius: '4px' }}
                    />
                  </div>
                  <button 
                    className={styles.approveBtn}
                    onClick={() => handleVerifyVendor(vendor.id, 'approved')}
                    disabled={loading}
                  >
                    ✓ Approve
                  </button>
                  <button 
                    className={styles.rejectBtn}
                    onClick={() => handleVerifyVendor(vendor.id, 'rejected')}
                    disabled={loading}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Vendors Section */}
      <div className={styles.section}>
        <h3 style={{ color: '#51CF66', marginTop: '30px' }}>✓ Approved Vendors ({vendors.filter(v => v.isVerified).length})</h3>
        {vendors.filter(v => v.isVerified).length === 0 ? (
          <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>No approved vendors</div>
        ) : (
          <div className={styles.tableWrapper} style={{ marginTop: '15px' }}>
            <table className={styles.dataTable}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeader}>Name</th>
                  <th className={styles.tableHeader}>Business</th>
                  <th className={styles.tableHeader}>Email</th>
                  <th className={styles.tableHeader}>Approved Date</th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {vendors.filter(v => v.isVerified).map(vendor => (
                  <tr key={vendor.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{vendor.firstName} {vendor.lastName}</td>
                    <td className={styles.tableCell}>{vendor.businessName}</td>
                    <td className={styles.tableCell}>{vendor.email}</td>
                    <td className={styles.tableCell}>{new Date(vendor.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrdersTab = () => (
    <div className={styles.tabContent}>
      <h2>Order Management</h2>
      <div style={{ marginBottom: '15px' }}>
        <select 
          value={orderStatusFilter}
          onChange={(e) => setOrderStatusFilter(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {ordersLoading ? (
        <div className={styles.loadingSpinner}>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className={styles.errorMessage}>No orders found</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Order #</th>
                <th className={styles.tableHeader}>Customer</th>
                <th className={styles.tableHeader}>Total</th>
                <th className={styles.tableHeader}>Status</th>
                <th className={styles.tableHeader}>Payment</th>
                <th className={styles.tableHeader}>Date</th>
                <th className={styles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {orders.map(order => (
                <tr key={order.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>{order.orderNumber || order.id.substring(0, 8)}</td>
                  <td className={styles.tableCell}>{order.customer?.fullName || order.customerName || 'N/A'}</td>
                  <td className={styles.tableCell}>₦{(order.totalPrice || order.total || 0).toLocaleString()}</td>
                  <td className={styles.tableCell}>
                    <span className={styles.statusBadge} style={{ 
                      backgroundColor: order.orderStatus === 'delivered' ? '#51CF66' : order.orderStatus === 'shipped' ? '#4ECDC4' : '#FFA500'
                    }}>
                      {order.orderStatus || 'pending'}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    <span style={{ color: order.paymentStatus === 'completed' ? '#51CF66' : '#FF6B6B' }}>
                      {order.paymentStatus || 'pending'}
                    </span>
                  </td>
                  <td className={styles.tableCell}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td className={styles.tableCell}>
                    <select
                      defaultValue={order.orderStatus || 'pending'}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderProductsTab = () => (
    <div className={styles.tabContent}>
      <h2>Product Management</h2>
      {productsLoading ? (
        <div className={styles.loadingSpinner}>Loading products...</div>
      ) : products.length === 0 ? (
        <div className={styles.errorMessage}>No products found</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Product Name</th>
                <th className={styles.tableHeader}>Category</th>
                <th className={styles.tableHeader}>Price</th>
                <th className={styles.tableHeader}>Status</th>
                <th className={styles.tableHeader}>Added</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {products.map(product => (
                <tr key={product.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>{product.name}</td>
                  <td className={styles.tableCell}>{product.category}</td>
                  <td className={styles.tableCell}>₦{product.price.toLocaleString()}</td>
                  <td className={styles.tableCell}>
                    <span className={styles.statusBadge} style={{ 
                      backgroundColor: product.approvalStatus === 'approved' ? '#51CF66' : product.approvalStatus === 'rejected' ? '#FF6B6B' : '#FFA500'
                    }}>
                      {product.approvalStatus || 'pending'}
                    </span>
                  </td>
                  <td className={styles.tableCell}>{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderStoresTab = () => (
    <div className={styles.tabContent}>
      <h2>Store Management</h2>
      {storesLoading ? (
        <div className={styles.loadingSpinner}>Loading stores...</div>
      ) : stores.length === 0 ? (
        <div className={styles.errorMessage}>No stores found</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeader}>Store Name</th>
                <th className={styles.tableHeader}>Location</th>
                <th className={styles.tableHeader}>Email</th>
                <th className={styles.tableHeader}>Phone</th>
                <th className={styles.tableHeader}>Status</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {stores.map(store => (
                <tr key={store.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>{store.name}</td>
                  <td className={styles.tableCell}>{store.city}</td>
                  <td className={styles.tableCell}>{store.email}</td>
                  <td className={styles.tableCell}>{store.phone}</td>
                  <td className={styles.tableCell}>
                    <span className={styles.statusBadge} style={{ 
                      backgroundColor: store.isVerified ? '#51CF66' : '#FFA500'
                    }}>
                      {store.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderCategoriesTab = () => (
    <div className={styles.tabContent}>
      <h2>Category Management</h2>
      
      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {/* Category Form */}
      {showCategoryForm && (
        <div className={styles.formContainer}>
          <h3>{editingCategoryId ? 'Edit Category' : 'Add New Category'}</h3>
          <form onSubmit={handleAddCategory}>
            <div className={styles.formGroup}>
              <label>Category Name *</label>
              <input
                type="text"
                name="name"
                value={categoryForm.name}
                onChange={handleCategoryFormChange}
                placeholder="e.g., Solar Panels"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                name="description"
                value={categoryForm.description}
                onChange={handleCategoryFormChange}
                placeholder="Category description (optional)"
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Icon</label>
                <input
                  type="text"
                  name="icon"
                  value={categoryForm.icon}
                  onChange={handleCategoryFormChange}
                  placeholder="Icon name or URL"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Image URL</label>
                <input
                  type="text"
                  name="image"
                  value={categoryForm.image}
                  onChange={handleCategoryFormChange}
                  placeholder="Image URL"
                />
              </div>


            </div>



            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryBtn}>
                {editingCategoryId ? 'Update Category' : 'Create Category'}
              </button>
              <button type="button" onClick={cancelCategoryForm} className={styles.secondaryBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subcategory Form */}
      {showSubcategoryForm && (
        <div className={styles.formContainer}>
          <h3>{editingSubcategoryId ? 'Edit Subcategory' : 'Add New Subcategory'}</h3>
          
          {!editingSubcategoryId && (
            <div className={styles.formGroup}>
              <label>Select Category *</label>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                required
              >
                <option value="">-- Select a Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleAddSubcategory}>
            <div className={styles.formGroup}>
              <label>Subcategory Name *</label>
              <input
                type="text"
                name="name"
                value={subcategoryForm.name}
                onChange={handleSubcategoryFormChange}
                placeholder="e.g., Monocrystalline"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                name="description"
                value={subcategoryForm.description}
                onChange={handleSubcategoryFormChange}
                placeholder="Subcategory description (optional)"
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Icon</label>
                <input
                  type="text"
                  name="icon"
                  value={subcategoryForm.icon}
                  onChange={handleSubcategoryFormChange}
                  placeholder="Icon name or URL"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Image URL</label>
                <input
                  type="text"
                  name="image"
                  value={subcategoryForm.image}
                  onChange={handleSubcategoryFormChange}
                  placeholder="Image URL"
                />
              </div>


            </div>



            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryBtn}>
                {editingSubcategoryId ? 'Update Subcategory' : 'Create Subcategory'}
              </button>
              <button type="button" onClick={cancelSubcategoryForm} className={styles.secondaryBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      {!showCategoryForm && !showSubcategoryForm && (
        <div className={styles.actionButtonsContainer}>
          <button onClick={() => setShowCategoryForm(true)} className={styles.primaryBtn}>
            + Add Category
          </button>
          <button onClick={() => setShowSubcategoryForm(true)} className={styles.primaryBtn}>
            + Add Subcategory
          </button>
        </div>
      )}

      {/* Categories List */}
      {categoriesLoading ? (
        <div className={styles.loadingSpinner}>Loading categories...</div>
      ) : (
        <div className={styles.categoriesContainer}>
          <h3>Categories & Subcategories</h3>
          {categories.length === 0 ? (
            <p>No categories found. Click "Add Category" to create one.</p>
          ) : (
            <div className={styles.categoryList}>
              {categories.map(category => (
                <div key={category.id} className={styles.categoryItem}>
                  <div className={styles.categoryHeader}>
                    <div className={styles.categoryInfo}>
                      <h4>
                        {category.name}
                      </h4>
                      {category.description && <p>{category.description}</p>}
                      <small>Created: {new Date(category.createdAt).toLocaleDateString()}</small>
                    </div>
                    <div className={styles.categoryActions}>
                      <button
                        onClick={() => handleEditCategory(category)}
                        className={styles.editBtn}
                        title="Edit"
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className={styles.deleteBtn}
                        title="Delete"
                      >
                        🗑 Delete
                      </button>
                      <button
                        onClick={() => setExpandedCategoryId(
                          expandedCategoryId === category.id ? null : category.id
                        )}
                        className={styles.toggleBtn}
                      >
                        {expandedCategoryId === category.id ? '▼' : '▶'} Subcategories ({category.subcategories?.length || 0})
                      </button>
                    </div>
                  </div>

                  {/* Subcategories List */}
                  {expandedCategoryId === category.id && category.subcategories && (
                    <div className={styles.subcategoryList}>
                      {category.subcategories.length === 0 ? (
                        <p className={styles.noSubcategories}>No subcategories.</p>
                      ) : (
                        category.subcategories.map(subcategory => (
                          <div key={subcategory.id} className={styles.subcategoryItem}>
                            <div className={styles.subcategoryInfo}>
                              <h5>
                                {subcategory.name}
                              </h5>
                              {subcategory.description && <p>{subcategory.description}</p>}
                            </div>
                            <div className={styles.subcategoryActions}>
                              <button
                                onClick={() => handleEditSubcategory(subcategory)}
                                className={styles.editBtn}
                                title="Edit"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => handleDeleteSubcategory(category.id, subcategory.id, subcategory.name)}
                                className={styles.deleteBtn}
                                title="Delete"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER
  // ============================================

  if (!isHydrated || !user || user.role !== 'admin') {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Redirecting...</div>;
  }

  return (
    <div className={styles.adminContainer}>
      <h1 className={styles.adminTitle}>✨ Professional Admin Dashboard</h1>

      {/* Global Error/Success Messages */}
      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'vendors' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('vendors')}
        >
          🏪 Vendors
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'orders' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📦 Orders
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'products' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📋 Products
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'stores' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('stores')}
        >
          🏬 Stores
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'categories' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          📁 Categories
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'vendors' && renderVendorsTab()}
      {activeTab === 'orders' && renderOrdersTab()}
      {activeTab === 'products' && renderProductsTab()}
      {activeTab === 'stores' && renderStoresTab()}
      {activeTab === 'categories' && renderCategoriesTab()}
    </div>
  );
}

