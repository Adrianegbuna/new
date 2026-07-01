import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { getImageUrl, getVideoMimeType, isVideoUrl } from '@/lib/imageUtils';
import { openVideoFullscreen } from '@/lib/videoFullscreen';
import { useCart } from '@/context/CartContext';

export default function ResaleDetailsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToCart } = useCart();
  const { id } = router.query;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewEligibility, setReviewEligibility] = useState<{ checked: boolean; allowed: boolean; reason?: string }>({
    checked: false,
    allowed: false
  });
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/resales/${id}`);
        setProduct(response.data.data || response.data);
      } catch (err: any) {
        console.error('Failed to fetch resale details:', err);
        setError(err.response?.data?.message || 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const direct = await apiClient.get(`/reviews/resales/${id}`).catch(() => null);
        if (direct?.data) {
          setReviews(direct.data?.data || direct.data || []);
          return;
        }
        const fallback = await apiClient.get(`/reviews?itemType=resale&itemId=${id}`);
        setReviews(fallback.data?.data || fallback.data || []);
      } catch (err) {
        console.warn('Failed to fetch resale reviews:', err);
        setReviews([]);
      }
    };

    fetchProduct();
    fetchReviews();
  }, [id]);

  const ensureReviewEligibility = async () => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const effectiveToken = storedToken;

    if (!user || !effectiveToken) {
      return { allowed: false, reason: 'Please login to leave a review.' };
    }

    if (!id) {
      return { allowed: false, reason: 'Unable to find this product.' };
    }

    if (reviewEligibility.checked) {
      return reviewEligibility;
    }

    setCheckingEligibility(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to verify delivery status');
      }

      const data = await response.json();
      const orders = Array.isArray(data) ? data : [];
      const productId = String(id);
      const hasDeliveredOrder = orders.some((order: any) => {
        const status = String(order?.orderStatus || '').toLowerCase();
        const delivered = status === 'delivered' || status === 'completed';
        if (!delivered) return false;
        return Array.isArray(order?.items) && order.items.some((item: any) => {
          return Boolean(item?.isSwapItem) &&
            String(item?.swapItemType || '').toLowerCase() === 'resale' &&
            String(item?.productId || '') === productId;
        });
      });

      const eligibility = {
        checked: true,
        allowed: hasDeliveredOrder,
        reason: hasDeliveredOrder ? undefined : 'Reviews are available after successful delivery.',
      };
      setReviewEligibility(eligibility);
      return eligibility;
    } catch (error) {
      const eligibility = {
        checked: true,
        allowed: false,
        reason: 'Unable to verify delivery yet. Please try again shortly.',
      };
      setReviewEligibility(eligibility);
      return eligibility;
    } finally {
      setCheckingEligibility(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onChange?: (value: number) => void) => (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, idx) => {
        const value = idx + 1;
        return (
          <button
            key={value}
            type="button"
            onClick={() => interactive && onChange?.(value)}
            className={`text-2xl ${value <= rating ? 'text-orange-500' : 'text-gray-300'} ${interactive ? 'hover:scale-110 transition' : ''}`}
            aria-label={`${value} star`}
          >
            ★
          </button>
        );
      })}
    </div>
  );

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewLoading(true);
    const eligibility = await ensureReviewEligibility();
    if (!eligibility.allowed) {
      setReviewError(eligibility.reason || 'Please login to leave a review.');
      setReviewLoading(false);
      return;
    }
    if (!reviewForm.rating) {
      setReviewError('Please select a rating (1-5 stars).');
      setReviewLoading(false);
      return;
    }
    try {
      await apiClient.post('/reviews', {
        itemType: 'resale',
        itemId: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      setReviewForm({ rating: 0, comment: '' });
      setShowReviewForm(false);
      const refresh = await apiClient.get(`/reviews?itemType=resale&itemId=${id}`).catch(() => null);
      if (refresh?.data) {
        setReviews(refresh.data?.data || refresh.data || []);
      }
    } catch (err: any) {
      setReviewError(err?.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... | RenewableZmart</title>
        </Head>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-4">Loading product details...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Head>
          <title>Product Not Found | RenewableZmart</title>
        </Head>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Oops! Product Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist or has been removed.'}</p>
            <button
              onClick={() => router.push('/swap-sell')}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const rawMedia = [
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.media) ? product.media : []),
    ...(Array.isArray(product.videos) ? product.videos : []),
  ];
  const mediaItems = Array.from(
    new Set(
      rawMedia
        .map((item: any) => (typeof item === 'string' ? item : item?.url || item?.path || ''))
        .map((item: string) => getImageUrl(String(item || '').trim()))
        .filter(Boolean)
    )
  );
  const displayImage = mediaItems[selectedImageIndex] || '';
  const displayIsVideo = isVideoUrl(displayImage);
  const numericPrice = Number(product.price);
  const markupPrice = Number.isFinite(numericPrice) ? numericPrice : 0;
  const handleAddToCart = () => {
    addToCart({
      id: `resale-${product.id}`,
      title: product.productName,
      price: markupPrice,
      image: displayImage || '',
      category: 'Resale',
      stock: Number(product.quantity ?? 1),
    });
    router.push('/cart');
  };

  return (
    <>
      <Head>
        <title>{product.productName} - Resale | RenewableZmart</title>
        <meta name="description" content={product.description || `Buy ${product.productName} on RenewableZmart`} />
      </Head>
      <Header />

      <main>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-6xl mx-auto px-4">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="mb-6 flex items-center text-green-600 hover:text-green-700 font-bold"
            >
              ← Back
            </button>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="grid md:grid-cols-2 gap-8 p-8">
                {/* Image Section */}
                <div>
                  <div className="relative h-96 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden mb-4 p-6">
                    {displayImage ? (
                      displayIsVideo ? (
                        <video
                          src={displayImage}
                          className="max-w-full max-h-full object-contain bg-gray-100"
                          autoPlay
                          muted
                          playsInline
                          controls={false}
                          loop
                          preload="auto"
                          onClick={(event) => openVideoFullscreen(event.currentTarget)}
                        >
                          <source src={displayImage} type={getVideoMimeType(displayImage)} />
                        </video>
                      ) : (
                        <img
                          src={displayImage}
                          alt={product.productName}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '♻️';
                          }}
                        />
                      )
                    ) : (
                      <span className="text-8xl">♻️</span>
                    )}
                  </div>

                  {/* Thumbnail Gallery */}
                  {mediaItems.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {mediaItems.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`h-20 w-20 rounded-lg flex-shrink-0 border-2 overflow-hidden flex items-center justify-center ${
                            selectedImageIndex === idx ? 'border-green-600' : 'border-gray-300'
                          }`}
                        >
                          {img ? (
                            isVideoUrl(img) ? (
                              <video
                                src={img}
                                className="max-w-full max-h-full object-contain bg-gray-100"
                                autoPlay
                                muted
                                playsInline
                                loop
                                controls={false}
                                preload="auto"
                                onClick={(event) => openVideoFullscreen(event.currentTarget)}
                              />
                            ) : (
                              <img src={img} alt={`View ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                            )
                          ) : (
                            <span className="text-2xl">♻️</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div>
                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`px-4 py-2 rounded-full text-white font-bold text-sm ${
                      product.status === 'approved' ? 'bg-green-600' :
                      product.status === 'pending' ? 'bg-yellow-600' :
                      product.status === 'rejected' ? 'bg-red-600' :
                      product.status === 'sold' ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      {product.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>

                  {/* Product Name */}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.productName}</h1>

                  {/* Seller Info - Admin Only */}
                  {user?.role === 'admin' && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-6 border-2 border-blue-300">
                      <p className="text-sm text-blue-600 font-bold">🔐 ADMIN VIEW - Seller Details</p>
                      <p className="font-bold text-gray-900 mt-2">{product.user?.firstName || 'Seller'}</p>
                      <p className="text-sm text-gray-600">{product.user?.email}</p>
                      {product.user?.city && (
                        <p className="text-sm text-gray-600">📍 {product.user.city}</p>
                      )}
                    </div>
                  )}

                  {/* Price Section */}
                  <div className="bg-green-50 border-2 border-green-200 p-6 rounded-lg mb-6">
                    <p className="text-sm text-gray-600 mb-2">Total Price</p>
                    <p className="text-4xl font-bold text-green-600">₦{markupPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    {user?.id === product.user?.id && (
                      <p className="text-xs text-gray-500 mt-2">(Includes 10% platform fee)</p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Condition</p>
                      <p className="font-bold text-gray-900">{product.productCondition || 'Good'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Delivery Option</p>
                      <p className="font-bold text-gray-900 capitalize">{product.deliveryOption?.replace('_', ' ') || 'Pickup & Delivery'}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {product.description && (
                    <div className="mb-6">
                      <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold transition"
                    >
                      Add to Cart
                    </button>
                    <button
                      onClick={() => router.push('/swap-sell')}
                      className="flex-1 bg-gray-300 text-gray-900 py-3 rounded-lg hover:bg-gray-400 font-bold transition"
                    >
                      ← Back to Marketplace
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Need help? Use the support chat button at the bottom-right of the page.
                  </p>

                  {/* Reviews */}
                  <div id="reviews" className="mt-10 border-t pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">Reviews</h3>
                      <button
                        onClick={async () => {
                          const eligibility = await ensureReviewEligibility();
                          if (!eligibility.allowed) {
                            alert(eligibility.reason || 'Please login to leave a review');
                            return;
                          }
                          setShowReviewForm((prev) => !prev);
                        }}
                        disabled={checkingEligibility || (reviewEligibility.checked && !reviewEligibility.allowed)}
                        className={`px-4 py-2 rounded-lg font-bold transition ${
                          checkingEligibility
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : reviewEligibility.checked && !reviewEligibility.allowed
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {checkingEligibility ? 'Checking...' : (showReviewForm ? 'Close' : 'Write a Review')}
                      </button>
                    </div>

                    {showReviewForm && (
                      <form onSubmit={handleSubmitReview} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                        <label className="block text-sm font-bold text-gray-900 mb-2">Your Rating</label>
                        {renderStars(reviewForm.rating, true, (rating) => setReviewForm((prev) => ({ ...prev, rating })))}
                        <label className="block text-sm font-bold text-gray-900 mt-4 mb-2">Your Review</label>
                        <textarea
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                          rows={4}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          placeholder="Share your experience..."
                        />
                        {reviewError && <p className="text-sm text-red-600 mt-2">{reviewError}</p>}
                        <button
                          type="submit"
                          disabled={reviewLoading}
                          className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-60"
                        >
                          {reviewLoading ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </form>
                    )}

                    {reviews.length === 0 ? (
                      <div className="text-sm text-gray-600">No reviews yet. Be the first to review this item.</div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((review: any) => (
                          <div key={review.id || review._id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-bold text-gray-900">{review.userName || review.name || 'Customer'}</p>
                              <span className="text-xs text-gray-500">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</span>
                            </div>
                            {renderStars(Number(review.rating || 0))}
                            {review.comment && <p className="text-gray-700 mt-2">{review.comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

