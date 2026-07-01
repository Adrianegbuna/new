import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import Head from 'next/head';
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountPercentage: number;
  discountAmount: number;
  minimumOrderAmount: number;
  applicableCategories: string[];
  expiryDate: string;
}

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/coupons/list');
      setCoupons(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      setMessage('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setMessage('Coupon code copied!');
    setTimeout(() => {
      setCopiedCode(null);
      setMessage('');
    }, 3000);
  };

  const applyCouponAtCheckout = (code: string) => {
    localStorage.setItem('appliedCoupon', code);
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
          <p className="mt-4 text-gray-900 font-bold">Loading available coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Promotions & Coupons - RenewableZmart</title>
      </Head>

      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🎯 Promotions & Coupons</h1>
            <p className="text-gray-900 font-bold">Save on your purchases with our exclusive offers</p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              {message}
            </div>
          )}

          {coupons.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">🎁</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No active coupons at the moment</h2>
              <p className="text-gray-900 font-bold mb-6">Check back soon for new offers and promotions!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                  >
                    {/* Coupon Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm opacity-90">Special Offer</p>
                          <h3 className="text-3xl font-bold">
                            {coupon.discountPercentage ? `${coupon.discountPercentage}%` : `?${coupon.discountAmount}`} OFF
                          </h3>
                        </div>
                        <div className="text-4xl">🌟</div>
                      </div>
                      {coupon.description && (
                        <p className="text-sm opacity-95">{coupon.description}</p>
                      )}
                    </div>

                    {/* Coupon Details */}
                    <div className="p-6">
                      {/* Coupon Code */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-900 font-bold mb-2">Coupon Code</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono font-bold text-lg">
                            {coupon.code}
                          </code>
                          <button
                            onClick={() => copyCouponCode(coupon.code)}
                            className={`px-4 py-3 rounded-lg font-semibold transition ${
                              copiedCode === coupon.code
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                            }`}
                          >
                            {copiedCode === coupon.code ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      {/* Conditions */}
                      <div className="space-y-3 text-sm mb-6 pb-6 border-b">
                        {coupon.minimumOrderAmount > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-500">✓</span>
                            <span className="text-gray-900 font-bold">
                              Minimum order: <strong>₦{coupon.minimumOrderAmount.toLocaleString()}</strong>
                            </span>
                          </div>
                        )}
                        {coupon.applicableCategories && coupon.applicableCategories.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-blue-500">✓</span>
                            <div className="text-gray-900 font-semibold">
                              <p><strong>Valid for:</strong></p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {coupon.applicableCategories.map((cat) => (
                                  <span key={cat} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">✓</span>
                          <span className="text-gray-900 font-bold">
                            Expires: <strong>{new Date(coupon.expiryDate).toLocaleDateString()}</strong>
                          </span>
                        </div>
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => applyCouponAtCheckout(coupon.code)}
                          className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-semibold hover:bg-slate-900 transition"
                        >
                          Shop & Use
                        </button>
                        <button
                          onClick={() => copyCouponCode(coupon.code)}
                          className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                        >
                          Copy Code
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* How to Use Section */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Use Coupons</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="text-4xl mb-3">1️⃣</div>
                    <h3 className="font-bold text-lg mb-2">Select a Coupon</h3>
                    <p className="text-gray-900 font-bold">Choose from our available promotions above</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-3">2️⃣</div>
                    <h3 className="font-bold text-lg mb-2">Copy or Note Code</h3>
                    <p className="text-gray-900 font-bold">Copy the coupon code or note it down</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl mb-3">3️⃣</div>
                    <h3 className="font-bold text-lg mb-2">Apply at Checkout</h3>
                    <p className="text-gray-900 font-bold">Paste the code during checkout to save</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Additional Info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4">💡 Pro Tips</h3>
              <ul className="space-y-2 text-sm text-gray-900 font-semibold">
                <li>📦 Stack coupons with bundle deals for maximum savings</li>
                <li>📅 Check expiry dates before using coupons</li>
                <li>📱 Follow us on social media for exclusive flash sales</li>
                <li>📧 Subscribe to our newsletter for exclusive deals</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4">🎁 Referral Rewards</h3>
              <p className="text-sm text-gray-900 font-bold mb-4">
                Refer friends to RenewableZmart and get rewards! You and your friend both receive NGN 500 credit when they make their first purchase.
              </p>
              <button
                onClick={() => router.push('/referrals')}
                className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition"
              >
                Start Referring
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}



