import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Header from '@/components/layout/Header';
import S3ImageUploader from '@/components/uploaders/S3ImageUploader';
import { ProtectAdminPage } from '@/components/services-requests/ProtectAdminPage';
import { apiClient } from '@/lib/api-client';

interface Store {
  id: string;
  name: string;
  categories?: string[];
}

interface Category {
  id: string;
  name: string;
  subcategories?: Array<{ id: string; name: string }>;
}

const evCategoryName = 'Electric Vehicles & Parts';

export default function AdminPostProductPage() {
  const [submitting, setSubmitting] = useState(false);
  const [postType, setPostType] = useState<'normal' | 'flash'>('normal');
  const [storeMode, setStoreMode] = useState<'all' | 'ev'>('all');
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const [flashForm, setFlashForm] = useState({
    batteryType: 'lithium',
    inverterType: 'standard',
    powers: '',
    warranty: 'Standard warranty',
    quantity: '',
  });

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    subcategory: '',
    storeId: '',
    city: '',
  });

  const evCategory = useMemo(
    () => categories.find((c) => String(c.name || '').toLowerCase() === evCategoryName.toLowerCase()),
    [categories]
  );

  const filteredStores = useMemo(() => {
    if (storeMode !== 'ev') return stores;
    return stores.filter((store) => {
      const list = Array.isArray(store.categories) ? store.categories : [];
      return list.some((c) => String(c || '').toLowerCase() === evCategoryName.toLowerCase());
    });
  }, [stores, storeMode]);

  const filteredCategories = useMemo(() => {
    if (storeMode !== 'ev') return categories;
    return evCategory ? [evCategory] : [];
  }, [categories, evCategory, storeMode]);

  const selectedCategory = useMemo(
    () => filteredCategories.find((c) => String(c.id) === String(form.category)),
    [filteredCategories, form.category]
  );

  const fetchSetup = async () => {
    try {
      const [storeRes, categoryRes] = await Promise.all([
        apiClient.get('/admin/stores'),
        apiClient.get('/categories'),
      ]);

      const storePayload = storeRes.data?.data ?? storeRes.data ?? [];
      const categoryPayload = categoryRes.data?.data ?? categoryRes.data ?? [];
      const parsedStores = Array.isArray(storePayload) ? storePayload : [];
      const parsedCategories = Array.isArray(categoryPayload) ? categoryPayload : [];

      setStores(parsedStores);
      setCategories(parsedCategories);

      if (parsedCategories[0]) {
        setForm((prev) => ({
          ...prev,
          category: prev.category || parsedCategories[0].id,
          subcategory: prev.subcategory || parsedCategories[0]?.subcategories?.[0]?.id || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch setup data:', error);
      setStores([]);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchSetup();
  }, []);

  useEffect(() => {
    if (storeMode === 'ev') {
      if (evCategory) {
        setForm((prev) => ({
          ...prev,
          category: prev.category || evCategory.id,
          subcategory: prev.subcategory || evCategory.subcategories?.[0]?.id || '',
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          category: '',
          subcategory: '',
        }));
      }
    }
  }, [storeMode, evCategory]);

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.price || !form.storeId) {
      alert('Please complete all required fields');
      return;
    }

    if (postType === 'normal' && (!form.description || !form.stock || !form.category)) {
      alert('Please complete all required fields for normal product upload');
      return;
    }
    if (postType === 'flash' && !flashForm.quantity) {
      alert('Please enter quantity for the flash deal');
      return;
    }

    if (!images[0]) {
      alert('Please upload at least one product image');
      return;
    }

    setSubmitting(true);
    try {
      if (postType === 'normal') {
        await apiClient.post('/admin/products/create', {
          name: form.name.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price),
          stock: parseInt(form.stock, 10),
          category: form.category,
          subcategory: form.subcategory || null,
          storeId: form.storeId,
          city: form.city || '',
          image: images[0],
        });
      } else {
        await apiClient.post('/packages/admin/flash-deals', {
          selectedPackageName: form.name.trim(),
          batteryType: flashForm.batteryType,
          maxBatteryLithium: flashForm.batteryType === 'lithium' ? 10 : 0,
          maxBatteryTubular: flashForm.batteryType === 'tubular' ? 10 : 0,
          inverterType: flashForm.inverterType,
          powers: flashForm.powers?.trim() || form.description?.trim() || 'Custom package configuration',
          warranty: flashForm.warranty?.trim() || 'Standard warranty',
          price: parseFloat(form.price),
          quantity: parseInt(flashForm.quantity || '0', 10),
          storeId: form.storeId,
          images,
        });
      }

      alert(postType === 'normal' ? 'Product created successfully' : 'Flash deal created successfully');
      const resetCategory = filteredCategories[0];
      setForm({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: resetCategory?.id || '',
        subcategory: resetCategory?.subcategories?.[0]?.id || '',
        storeId: '',
        city: '',
      });
      setFlashForm({
        batteryType: 'lithium',
        inverterType: 'standard',
        powers: '',
        warranty: 'Standard warranty',
        quantity: '',
      });
      setImages([]);
    } catch (error: any) {
      alert(error?.response?.data?.message || `Failed to create ${postType === 'normal' ? 'product' : 'flash deal'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Post Product - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Product to Vendor Store</h1>
          <p className="text-gray-700 font-semibold mb-6">
            Create products directly as admin and assign them to any vendor store.
          </p>

          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">Select What To Post</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as 'normal' | 'flash')}
              className="w-full md:w-[360px] p-3 border rounded-lg font-semibold text-gray-900"
            >
              <option value="normal">Normal Product Post</option>
              <option value="flash" disabled={storeMode === 'ev'}>Flash Deal Post</option>
            </select>
            <p className="text-xs text-gray-600 font-semibold mt-2">
              The form below changes automatically based on selected upload type.
            </p>
            {storeMode === 'ev' && postType === 'flash' && (
              <p className="text-xs text-emerald-700 font-semibold mt-2">
                EV stores use the standard product form. Flash deal packages are not available for EV postings.
              </p>
            )}

            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Store Type</label>
              <select
                value={storeMode}
                onChange={(e) => {
                  const nextMode = e.target.value as 'all' | 'ev';
                  setStoreMode(nextMode);
                  if (nextMode === 'ev') {
                    setPostType('normal');
                  }
                }}
                className="w-full md:w-[360px] p-3 border rounded-lg font-semibold text-gray-900"
              >
                <option value="all">All Stores</option>
                <option value="ev">E V Stores Only</option>
              </select>
              {storeMode === 'ev' && (
                <p className="text-xs text-emerald-700 font-semibold mt-2">
                  Posting to EV stores locks the category to {evCategoryName}.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={submitProduct} className="bg-white rounded-xl shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                {postType === 'flash' ? 'Flash Deal Package Name' : 'Product Name'}
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                placeholder={postType === 'flash' ? 'e.g. Starter Backup Package' : 'e.g. 5kVA Hybrid Inverter'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                {postType === 'flash' ? 'Package Description' : 'Description'}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                placeholder={postType === 'flash' ? 'Describe what is included in this package' : 'Describe product specifications and key features'}
                rows={4}
                required={postType === 'normal'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">
                  {postType === 'flash' ? 'Flash Deal Price (Naira)' : 'Price (Naira)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                  placeholder="e.g. 250000"
                  required
                />
              </div>

              {postType === 'normal' ? (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                    className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                    placeholder="e.g. 20"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Battery Type</label>
                  <select
                    value={flashForm.batteryType}
                    onChange={(e) => setFlashForm((prev) => ({ ...prev, batteryType: e.target.value }))}
                    className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                  >
                    <option value="lithium">Lithium</option>
                    <option value="tubular">Tubular</option>
                  </select>
                </div>
              )}
            </div>

            {postType === 'flash' && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Quantity (Stock)</label>
                <input
                  type="number"
                  min="1"
                  value={flashForm.quantity}
                  onChange={(e) => setFlashForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                  placeholder="e.g. 10"
                  required
                />
              </div>
            )}

            {postType === 'normal' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => {
                        const category = filteredCategories.find((c) => String(c.id) === String(e.target.value));
                        return {
                          ...prev,
                          category: e.target.value,
                          subcategory: category?.subcategories?.[0]?.id || '',
                        };
                      })
                    }
                    className="w-full p-3 border rounded-lg font-semibold text-gray-900 disabled:bg-gray-100 disabled:text-gray-600"
                    required
                    disabled={storeMode === 'ev'}
                  >
                    <option value="">Select category</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Subcategory</label>
                  <select
                    value={form.subcategory}
                    onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                    className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                  >
                    <option value="">Select subcategory</option>
                    {(selectedCategory?.subcategories || []).map((subcat) => (
                      <option key={subcat.id} value={subcat.id}>
                        {subcat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Inverter Type</label>
                  <select
                    value={flashForm.inverterType}
                    onChange={(e) => setFlashForm((prev) => ({ ...prev, inverterType: e.target.value }))}
                    className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                  >
                    <option value="standard">Standard</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Warranty</label>
                  <input
                    value={flashForm.warranty}
                    onChange={(e) => setFlashForm((prev) => ({ ...prev, warranty: e.target.value }))}
                    className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                    placeholder="e.g. 2 years"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-1">Power / Package Details</label>
                  <textarea
                    value={flashForm.powers}
                    onChange={(e) => setFlashForm((prev) => ({ ...prev, powers: e.target.value }))}
                    className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                    rows={3}
                    placeholder="e.g. 3 bedrooms, lights, fan, TV, decoder..."
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Vendor Store</label>
              <select
                value={form.storeId}
                onChange={(e) => setForm((prev) => ({ ...prev, storeId: e.target.value }))}
                className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                required
              >
                <option value="">Select store</option>
                {filteredStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">City (optional)</label>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full p-3 border rounded-lg font-semibold text-gray-900"
                placeholder="e.g. Abuja"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {postType === 'flash' ? 'Flash Deal Images' : 'Images'}
              </label>
              <S3ImageUploader
                folder={postType === 'flash' ? 'admin-flash-deals' : 'admin-products'}
                maxImages={1}
                onUploadComplete={(urls) => setImages(urls.slice(0, 1))}
                onError={(error) => alert(error.message)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-900 text-white py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {submitting
                ? (postType === 'flash' ? 'Creating Flash Deal...' : 'Creating Product...')
                : (postType === 'flash' ? 'Create Flash Deal' : 'Create Product')}
            </button>
          </form>
        </main>
      </div>
    </ProtectAdminPage>
  );
}

