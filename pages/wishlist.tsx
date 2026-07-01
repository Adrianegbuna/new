import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import Head from 'next/head';
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getFallbackImage, getImageUrl } from '@/lib/imageUtils';

interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  productCategory: string;
  notifyOnPriceDrop: boolean;
  notifyOnStockUpdate: boolean;
  addedAt: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { token, isAuthenticated, isHydrated, setToken } = useAuthStore();
  const { addToCart: addItemToCart } = useCart();
  const { formatPrice } = useCurrency();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token && storedToken) {
      setToken(storedToken);
    }
    const effectiveToken = token || storedToken;
    if (!isAuthenticated || !effectiveToken) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    fetchCategories();
    fetchWishlist();
  }, [isAuthenticated, token, isHydrated, router, setToken]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wishlist');
      setWishlist(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      await apiClient.delete(
        `/wishlist/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWishlist(wishlist.filter(item => item.id !== id));
      setMessage('Removed from wishlist');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to remove item');
    }
  };

  const toggleNotification = async (id: string, type: 'price' | 'stock') => {
    const item = wishlist.find(w => w.id === id);
    if (!item) return;

    try {
      await apiClient.patch(
        `/wishlist/${id}/toggle-notification`,
        {
          notifyOnPriceDrop: type === 'price' ? !item.notifyOnPriceDrop : item.notifyOnPriceDrop,
          notifyOnStockUpdate: type === 'stock' ? !item.notifyOnStockUpdate : item.notifyOnStockUpdate
        }
      );
      setMessage('Notification settings updated');
      fetchWishlist();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update settings');
    }
  };

  const addToCart = async (product: WishlistItem) => {
    const cartItem = {
      id: String(product.productId || product.id),
      title: product.productName || 'Wishlist item',
      price: Number(product.productPrice || 0),
      image: resolveWishlistImage(product.productImage),
      category: resolveCategoryLabel(product.productCategory),
      stock: 1,
      description: ''
    };
    addItemToCart(cartItem);
    try {
      await apiClient.delete(`/wishlist/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist((prev) => prev.filter((item) => item.id !== product.id));
      setMessage('Added to cart and removed from wishlist');
    } catch (error) {
      console.error('Failed to remove item from wishlist after add to cart:', error);
      setMessage('Added to cart');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setCategories(list);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const isLikelyId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const resolveCategoryLabel = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return 'Wishlist item';
    if (raw.toLowerCase() === 'unknown' || isLikelyId(raw)) return 'Wishlist item';
    const match = categories.find(
      (cat) =>
        String(cat.id) === raw ||
        String(cat.name || '').toLowerCase() === raw.toLowerCase()
    );
    return match?.name || 'Wishlist item';
  };

  const resolveWishlistImage = (url?: string) => {
    const raw = String(url || '').trim();
    if (!raw) return getFallbackImage('No Image');
    if (raw.startsWith('/placeholder') || raw.startsWith('data:image')) return raw;
    return getImageUrl(raw);
  };

  const getWishlistDetailsHref = (item: WishlistItem) => {
    const raw = String(item?.productId || '').trim();
    if (!raw) return '/products';

    if (raw.startsWith('package:')) {
      return `/package-details?id=${encodeURIComponent(raw.replace(/^package:/, ''))}`;
    }
    if (raw.startsWith('resale:')) {
      return `/resale-details?id=${encodeURIComponent(raw.replace(/^resale:/, ''))}`;
    }
    if (raw.startsWith('tradein:')) {
      return `/trade-in-details?id=${encodeURIComponent(raw.replace(/^tradein:/, ''))}`;
    }
    if (raw.startsWith('product:')) {
      return `/product/${encodeURIComponent(raw.replace(/^product:/, ''))}`;
    }
    if (isLikelyId(raw)) {
      return `/product/${encodeURIComponent(raw)}`;
    }
    return '/products';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
          <p className="mt-4 text-black">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Wishlist - RenewableZmart</title>
      </Head>

      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-2"></div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              {message}
            </div>
          )}

          {wishlist.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">💔</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
              <p className="text-black mb-6">Start adding items you love!</p>
              <button
                onClick={() => router.push('/products')}
                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-900 transition"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {wishlist.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 sm:p-8">
                  <button
                    type="button"
                    onClick={() => router.push(getWishlistDetailsHref(item))}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-6 sm:gap-8">
                      <div className="w-28 h-28 sm:w-48 sm:h-48 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={resolveWishlistImage(item.productImage)}
                          alt={item.productName || 'Wishlist item'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFallbackImage('No Image');
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-blue-950 leading-tight line-clamp-2">
                          {item.productName || 'Untitled product'}
                        </h3>
                        <div className="mt-4 text-3xl sm:text-4xl font-extrabold text-emerald-600 leading-none">
                          {formatPrice(Number(item.productPrice || 0))}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-950 transition"
                      aria-label="Add to Cart"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}



