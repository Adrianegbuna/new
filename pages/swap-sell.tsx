import { useState, useEffect, useRef, MouseEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { getImageUrl, getVideoMimeType, isVideoUrl } from '@/lib/imageUtils';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { getWishlistIds } from '@/lib/wishlist';
import { addProductToWishlist, ensureWishlistSync, removeProductFromWishlist } from '@/lib/wishlist-api';
import { openVideoFullscreen } from '@/lib/videoFullscreen';

export default function SwapSellPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToCart } = useCart();
  const [resaleProducts, setResaleProducts] = useState<any[]>([]);
  const [tradeInProducts, setTradeInProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'resale' | 'tradein'>('resale');
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const resaleGridRef = useRef<HTMLDivElement>(null);
  const tradeInGridRef = useRef<HTMLDivElement>(null);
  const [visibleResaleCount, setVisibleResaleCount] = useState(24);
  const [visibleTradeInCount, setVisibleTradeInCount] = useState(24);
  const [showEntryNotice, setShowEntryNotice] = useState(true);
  const shuffleList = <T,>(items: T[]) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

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
    if (!raw) return '';
    return getImageUrl(String(raw));
  };

  const resolveSwapMedia = (item: any) => {
    const url = resolveSwapImage(item);
    return {
      url,
      isVideo: isVideoUrl(url),
    };
  };

  const getRatingData = (item: any) => {
    const ratingValue = Number(item?.rating || item?.averageRating || item?.avgRating || item?.storeRating || 0);
    const safeRating = Number.isFinite(ratingValue) ? Math.max(0, Math.min(5, ratingValue)) : 0;
    const reviewsCount = Number(item?.reviewCount || item?.reviews?.length || item?.comments?.length || 0) || 0;
    const latestComment =
      item?.latestComment ||
      item?.comments?.[0]?.comment ||
      item?.reviews?.[0]?.comment ||
      item?.reviews?.[0]?.review ||
      '';
    return { rating: safeRating, reviewsCount, latestComment: String(latestComment || '').trim() };
  };

  const renderStars = (rating: number) => {
    const filled = Math.round(rating);
    return Array.from({ length: 5 }).map((_, idx) => (
      <span key={idx} className={idx < filled ? 'text-amber-500' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowEntryNotice(false);
    }, 30000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Admins see all items, regular users see only approved
        const resaleEndpoint = user?.role === 'admin' ? '/resales?limit=100' : '/resales/approved?limit=100';
        const tradeInEndpoint = user?.role === 'admin' ? '/trade-ins?limit=100' : '/trade-ins/approved?limit=100';
        
        const resaleResponse = await apiClient.get(resaleEndpoint);
        const resaleData = Array.isArray(resaleResponse.data)
          ? resaleResponse.data
          : (resaleResponse.data?.data || []);
        const filteredResales = resaleData.filter((item: any) => Number(item.quantity ?? item.stock ?? item.availableQuantity ?? 0) > 0);
        setResaleProducts(shuffleList(filteredResales));

        const tradeInResponse = await apiClient.get(tradeInEndpoint);
        const tradeInData = Array.isArray(tradeInResponse.data)
          ? tradeInResponse.data
          : (tradeInResponse.data?.data || []);
        const filteredTradeIns = tradeInData.filter((item: any) => Number(item.quantity ?? item.stock ?? item.availableQuantity ?? 0) > 0);
        setTradeInProducts(shuffleList(filteredTradeIns));
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setResaleProducts([]);
        setTradeInProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [user?.role]);

  useEffect(() => {
    const initWishlist = async () => {
      if (!user) {
        setWishlistIds(getWishlistIds());
        return;
      }
      try {
        await ensureWishlistSync();
      } catch (error) {
        console.error('Failed to sync wishlist on swap page:', error);
      } finally {
        setWishlistIds(getWishlistIds());
      }
    };
    initWishlist();
  }, [user]);
  
  useEffect(() => {
    if (activeTab === 'resale') {
      setVisibleResaleCount(24);
    } else {
      setVisibleTradeInCount(24);
    }
  }, [activeTab]);

  const handleWishlistToggle = async (
    event: MouseEvent<HTMLButtonElement>,
    id: string,
    metadata?: { productName?: string; productPrice?: number; productImage?: string; productCategory?: string }
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const current = getWishlistIds();
      const isWishlisted = current.includes(id);
      if (isWishlisted) {
        await removeProductFromWishlist(id);
      } else {
        await addProductToWishlist(id, metadata);
      }
      setWishlistIds(getWishlistIds());
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
      console.error('Failed to update wishlist on swap page:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Swap & Resell | RenewableZmart</title>
        <meta name="description" content="Browse swap and resale renewable energy products on RenewableZmart" />
      </Head>
      <Header />

      <main>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-gray-50 to-gray-100 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto px-4">
            {showEntryNotice && (
              <div className="mb-4">
                <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm sm:text-base font-bold text-blue-950">Swap & Resell Marketplace</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold">
                        Only verified items are displayed. This message closes automatically in 30 seconds.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEntryNotice(false)}
                      className="text-xs font-bold text-blue-900 hover:text-blue-950"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Tab Navigation */}
            <div className="flex gap-3 mb-8 justify-center bg-white border border-slate-200 rounded-2xl p-2 shadow-sm max-w-xl mx-auto">
              <button
                onClick={() => setActiveTab('resale')}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition ${
                  activeTab === 'resale'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-400'
                }`}
              >
                Resale Products
              </button>
              <button
                onClick={() => setActiveTab('tradein')}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition ${
                  activeTab === 'tradein'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400'
                }`}
              >
                Trade-In Products
              </button>
            </div>

            {/* Resale Products Tab */}
            {activeTab === 'resale' && (
              <div>
                {loading ? (
                  <div className="text-center py-12 text-gray-600">Loading resale products...</div>
                ) : resaleProducts.length === 0 ? (
                  <div className="bg-white rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4"></div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">No resale products available</h3>
                    <p className="text-gray-600 mb-6">Be the first to list a product for resale!</p>
                    <button
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                        } else {
                          router.push('/account?tab=swap');
                        }
                      }}
                      className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold"
                    >
                      Post Your Resale Item
                    </button>
                  </div>
                ) : (
                  <div ref={resaleGridRef} className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                    {resaleProducts.slice(0, visibleResaleCount).map((product, index) => {
                      const wishlistKey = `resale:${product.id}`;
                      const isWishlisted = wishlistIds.includes(wishlistKey);
                      const media = resolveSwapMedia(product);
                      return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition border border-gray-100 hover:border-green-300 flex flex-col h-full cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/resale-details?id=${product.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            router.push(`/resale-details?id=${product.id}`);
                          }
                        }}
                      >
                        {/* Image Section */}
                        <div className="relative bg-white aspect-square p-2 flex items-center justify-center overflow-hidden">
                          {media.url ? (
                            media.isVideo ? (
                              <video
                                className="w-full h-full object-contain bg-gray-100"
                                autoPlay
                                muted
                                playsInline
                                controls={false}
                                loop
                                preload="auto"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openVideoFullscreen(event.currentTarget);
                                }}
                                onTouchStart={(event) => event.stopPropagation()}
                              >
                                <source src={media.url} type={getVideoMimeType(media.url)} />
                              </video>
                            ) : (
                              <img 
                                src={media.url} 
                                alt={product.productName} 
                                className="w-full h-full object-contain" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                }}
                              />
                            )
                          ) : (
                            <span className="text-4xl font-black text-gray-300">Swap</span>
                          )}
                          <button
                            type="button"
                            aria-label="Add to wishlist"
                            onClick={(event) =>
                              handleWishlistToggle(event, wishlistKey, {
                                productName: String(product?.productName || '').trim() || 'Resale Item',
                                productPrice: Number(product?.price || 0),
                                  productImage: media.url,
                                productCategory: 'Resale',
                              })
                            }
                            className={`absolute top-2 left-2 h-8 w-8 rounded-full border flex items-center justify-center text-sm transition ${
                              isWishlisted ? 'border-orange-200 text-orange-500 bg-white' : 'border-gray-200 text-gray-400 hover:text-orange-500 bg-white'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <path d="M12 21s-6.7-4.35-9.33-7.98C-0.4 9.3 1.2 4.5 5.3 3.6 7.3 3.1 9.2 4 10.2 5.4 11.2 4 13.1 3.1 15.1 3.6c4.1.9 5.7 5.7 2.63 9.42C18.7 16.65 12 21 12 21z" />
                            </svg>
                          </button>
                          <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {product.condition?.toUpperCase() || 'GOOD'}
                          </div>
                          {user?.role === 'admin' && (
                            <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                              ADMIN {product.status?.toUpperCase() || 'UNKNOWN'}
                            </div>
                          )}
                        </div>

                        <div className="p-3 flex flex-col gap-2">
                          <h3 className="text-[14px] font-semibold leading-[1.35] text-gray-900 line-clamp-2">{product.productName}</h3>

                          <div className="flex items-center justify-between gap-2">
                            {product.price ? (
                              <p className="text-[18px] font-bold text-green-600 price-inline">₦{Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            ) : (
                              <p className="text-[12px] text-gray-600 font-semibold">Price on request</p>
                            )}
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                addToCart({
                                  id: `resale-${product.id}`,
                                  title: product.productName,
                                  price: product.price,
                                  image: media.url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="240" height="240"%3E%3Crect width="240" height="240" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".35em" fill="%239ca3af" font-size="16" font-family="Arial"%3ESWAP%3C/text%3E%3C/svg%3E',
                                  category: 'Resale',
                                  stock: Number(product.quantity ?? 1)
                                });
                                router.push('/cart');
                              }}
                              className="h-9 w-9 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center justify-center"
                              aria-label="Add to Cart"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H7" />
                                <circle cx="9.5" cy="20" r="1.3" />
                                <circle cx="18" cy="20" r="1.3" />
                              </svg>
                            </button>
                          </div>

                          {(() => {
                            const ratingData = getRatingData(product);
                            return (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/resale-details?id=${product.id}#reviews`);
                                }}
                                className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium">
                                  <div className="flex">{renderStars(ratingData.rating)}</div>
                                  <span className="text-gray-700">{ratingData.rating.toFixed(1)}</span>
                                  <span className="text-gray-500">({ratingData.reviewsCount} reviews)</span>
                                </div>
                                {ratingData.latestComment ? (
                                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">"{ratingData.latestComment}"</p>
                                ) : (
                                  <p className="text-[11px] text-gray-400 mt-1">No comments yet</p>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
                {resaleProducts.length > visibleResaleCount && (
                  <div className="flex justify-center mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        const nextCount = Math.min(visibleResaleCount + 24, resaleProducts.length);
                        setVisibleResaleCount(nextCount);
                        requestAnimationFrame(() => {
                          resaleGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        });
                      }}
                      className="px-6 py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition"
                    >
                      See more
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Trade-In Products Tab */}
            {activeTab === 'tradein' && (
              <div>
                {loading ? (
                  <div className="text-center py-12 text-gray-600">Loading trade-in products...</div>
                ) : tradeInProducts.length === 0 ? (
                  <div className="bg-white rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">SWAP</div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">No trade-in products available</h3>
                    <p className="text-gray-600 mb-6">Browse other options or submit your own trade-in request!</p>
                    <button
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                        } else {
                          router.push('/account?tab=swap');
                        }
                      }}
                      className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold"
                    >
                      Submit Trade-In Request
                    </button>
                  </div>
                ) : (
                  <div ref={tradeInGridRef} className="max-w-[1600px] mx-auto grid grid-cols-2 md:grid-cols-3 min-[1200px]:grid-cols-4 min-[1400px]:grid-cols-5 gap-5 items-stretch">
                    {tradeInProducts.slice(0, visibleTradeInCount).map((product, index) => {
                      const wishlistKey = `tradein:${product.id}`;
                      const isWishlisted = wishlistIds.includes(wishlistKey);
                      const media = resolveSwapMedia(product);
                      return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition border border-gray-100 hover:border-blue-300 flex flex-col h-full cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/trade-in-details?id=${product.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            router.push(`/trade-in-details?id=${product.id}`);
                          }
                        }}
                      >
                        {/* Image Section */}
                        <div className="relative bg-white aspect-square p-2 flex items-center justify-center overflow-hidden">
                          {media.url ? (
                            media.isVideo ? (
                              <video
                                className="w-full h-full object-contain bg-gray-100"
                                autoPlay
                                muted
                                playsInline
                                controls={false}
                                loop
                                preload="auto"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openVideoFullscreen(event.currentTarget);
                                }}
                                onTouchStart={(event) => event.stopPropagation()}
                              >
                                <source src={media.url} type={getVideoMimeType(media.url)} />
                              </video>
                            ) : (
                              <img 
                                src={media.url} 
                                alt={product.productName} 
                                className="w-full h-full object-contain" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                }}
                              />
                            )
                          ) : (
                            <span className="text-4xl font-black text-gray-300">Swap</span>
                          )}
                          <button
                            type="button"
                            aria-label="Add to wishlist"
                            onClick={(event) =>
                              handleWishlistToggle(event, wishlistKey, {
                                productName: String(product?.productName || '').trim() || 'Trade-In Item',
                                productPrice: Number(product?.estimatedValue || 0),
                                  productImage: media.url,
                                productCategory: 'Trade-In',
                              })
                            }
                            className={`absolute top-2 left-2 h-8 w-8 rounded-full border flex items-center justify-center text-sm transition ${
                              isWishlisted ? 'border-orange-200 text-orange-500 bg-white' : 'border-gray-200 text-gray-400 hover:text-orange-500 bg-white'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                              <path d="M12 21s-6.7-4.35-9.33-7.98C-0.4 9.3 1.2 4.5 5.3 3.6 7.3 3.1 9.2 4 10.2 5.4 11.2 4 13.1 3.1 15.1 3.6c4.1.9 5.7 5.7 2.63 9.42C18.7 16.65 12 21 12 21z" />
                            </svg>
                          </button>
                          <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {product.condition?.toUpperCase() || 'GOOD'}
                          </div>
                          {user?.role === 'admin' && (
                            <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                              ADMIN {product.status?.toUpperCase() || 'UNKNOWN'}
                            </div>
                          )}
                        </div>

                        <div className="p-3 flex flex-col gap-2">
                          <h3 className="text-[14px] font-semibold leading-[1.35] text-gray-900 line-clamp-2">{product.productName}</h3>

                          <div className="flex items-center justify-between gap-2">
                            {product.estimatedValue ? (
                              <p className="text-[18px] font-bold text-blue-600 price-inline">?{Number(product.estimatedValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            ) : (
                              <p className="text-[12px] text-gray-600 font-semibold">Value to be determined</p>
                            )}

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                addToCart({
                                  id: `tradein-${product.id}`,
                                  title: product.productName,
                                  price: product.estimatedValue ?? 0,
                                  image: media.url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="240" height="240"%3E%3Crect width="240" height="240" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".35em" fill="%239ca3af" font-size="16" font-family="Arial"%3ESWAP%3C/text%3E%3C/svg%3E',
                                  category: 'Trade-In',
                                  stock: Number(product.quantity ?? product.availableQuantity ?? 1)
                                });
                                router.push('/cart');
                              }}
                              className="h-9 w-9 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition flex items-center justify-center"
                              aria-label="Add to Cart"
                            >
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H7" />
                                <circle cx="9.5" cy="20" r="1.3" />
                                <circle cx="18" cy="20" r="1.3" />
                              </svg>
                            </button>
                          </div>

                          {(() => {
                            const ratingData = getRatingData(product);
                            return (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/trade-in-details?id=${product.id}#reviews`);
                                }}
                                className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium">
                                  <div className="flex">{renderStars(ratingData.rating)}</div>
                                  <span className="text-gray-700">{ratingData.rating.toFixed(1)}</span>
                                  <span className="text-gray-500">({ratingData.reviewsCount} reviews)</span>
                                </div>
                                {ratingData.latestComment ? (
                                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">"{ratingData.latestComment}"</p>
                                ) : (
                                  <p className="text-[11px] text-gray-400 mt-1">No comments yet</p>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
                {tradeInProducts.length > visibleTradeInCount && (
                  <div className="flex justify-center mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        const nextCount = Math.min(visibleTradeInCount + 24, tradeInProducts.length);
                        setVisibleTradeInCount(nextCount);
                        requestAnimationFrame(() => {
                          tradeInGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        });
                      }}
                      className="px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                    >
                      See more
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Post Item CTA */}
            <div className="max-w-4xl mx-auto mt-16 bg-gradient-to-r from-blue-900 via-blue-800 to-emerald-700 p-8 sm:p-10 rounded-3xl shadow-xl text-white text-center">
              <h2 className="text-2xl sm:text-3xl font-black mb-3">Have a Product to Sell or Trade?</h2>
              <p className="mb-6 text-base sm:text-lg font-semibold text-blue-50">
                Submit your item through your dashboard and it will appear here once approved!
              </p>
              <button
                onClick={() => {
                  if (!user) {
                    router.push('/login');
                  } else {
                    router.push('/account?tab=swap');
                  }
                }}
                className="inline-block bg-white text-blue-900 font-bold py-3 px-8 rounded-xl hover:bg-gray-100 transition shadow-md"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}











