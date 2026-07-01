import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useCurrency } from '@/context/CurrencyContext';
import { ProtectAdminPage } from '@/components/services-requests/ProtectAdminPage';

interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  image?: string;
  category?: string;
  stock?: number;
  country?: string;
  city?: string;
  approvalStatus?: string;
  isApproved?: boolean;
  store?: {
    id?: string;
    name?: string;
  };
}

export default function AdminProductApprovalPage() {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterCountry, setFilterCountry] = useState('all');
  const [message, setMessage] = useState('');
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);

  const fetchPendingProducts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/products/pending');
      const payload = response.data?.data ?? response.data ?? [];
      setPendingProducts(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Error fetching pending products:', error);
      setPendingProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const handleApproval = async (productId: string, approved: boolean) => {
    setProcessingId(productId);
    try {
      await apiClient.post(`/admin/approve-product/${productId}`, { approved });
      setPendingProducts((prev) => prev.filter((item) => item.id !== productId));
      setMessage(approved ? 'Product approved successfully' : 'Product rejected');
      setTimeout(() => setMessage(''), 2500);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Failed to process product approval');
    } finally {
      setProcessingId(null);
    }
  };

  const countries = useMemo(
    () => [...new Set(pendingProducts.map((p) => p.country).filter(Boolean) as string[])],
    [pendingProducts]
  );

  const filteredProducts = useMemo(
    () => (filterCountry === 'all' ? pendingProducts : pendingProducts.filter((p) => p.country === filterCountry)),
    [pendingProducts, filterCountry]
  );

  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Product Approval - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Approval Queue</h1>
              <p className="text-gray-900 font-bold">Approve products before they appear on the marketplace.</p>
            </div>
            <Link href="/admin" className="bg-gray-700 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-800">
              Back to Admin
            </Link>
          </div>

          {message && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              {message}
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-4 mb-6">
            <label className="font-bold text-gray-900 mr-3">Filter by country:</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="px-3 py-2 border rounded-lg font-semibold text-gray-900"
            >
              <option value="all">All ({pendingProducts.length})</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow p-8 text-center font-semibold text-gray-900">
              Loading pending products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No pending products</h2>
              <p className="text-gray-900 font-semibold">All product approvals are up to date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="relative h-52 bg-gray-100">
                    {product.image ? (
                      <img src={product.image} alt={product.name || product.title || 'Product'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-gray-700">No Image</div>
                    )}
                    <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                      PENDING
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{product.name || product.title || 'Untitled Product'}</h3>
                    <p className="text-sm font-semibold text-gray-700 mb-3 line-clamp-2">{product.description || 'No description'}</p>
                    <div className="space-y-1.5 text-sm mb-4">
                      <p className="font-semibold text-gray-900">Price: <span className="text-emerald-700 font-bold">{formatPrice(product.price || 0)}</span></p>
                      <p className="font-semibold text-gray-900">Stock: {product.stock || 0}</p>
                      <p className="font-semibold text-gray-900">Category: {product.category || 'N/A'}</p>
                      <p className="font-semibold text-gray-900">Store: {product.store?.name || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={processingId === product.id}
                        onClick={() => handleApproval(product.id, true)}
                        className="bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={processingId === product.id}
                        onClick={() => handleApproval(product.id, false)}
                        className="bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectAdminPage>
  );
}


