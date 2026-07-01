import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export interface FeedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  storeName?: string;
  storeId?: string;
  rating?: number;
  sales?: number;
  stock?: number;
  description?: string;
  isRecommendation?: boolean;
  recommendedProducts?: any[];
}

interface useProductFeedProps {
  limit?: number;
  country?: string;
  autoStart?: boolean;
}

export const useProductFeed = ({
  limit = 20,
  country = 'Nigeria',
  autoStart = true,
}: useProductFeedProps = {}) => {
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sessionSeed, setSessionSeed] = useState<number>(Math.floor(Date.now() / 60000));
  const [viewedProductIds, setViewedProductIds] = useState<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * Fetch products from feed API
   */
  const fetchProducts = useCallback(
    async (currentCursor: string | null = null) => {
      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(Math.min(limit, 50)),
          sessionSeed: String(sessionSeed),
          country,
        });

        if (currentCursor) {
          params.append('cursor', currentCursor);
        }

        console.log('[PRODUCT FEED] Fetching with params:', params.toString());
        const response = await apiClient.get(`/feed?${params.toString()}`);
        console.log('[PRODUCT FEED] Response received:', {
          statusCode: response.status,
          dataType: typeof response.data,
          hasData: !!response.data?.data,
          dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'not-array',
          pagination: response.data?.pagination,
        });

        const { data, pagination } = response.data;

        console.log('[PRODUCT FEED] Extracted data:', {
          dataLength: Array.isArray(data) ? data.length : 'not-array',
          dataType: typeof data,
        });

        // Normalize product data to use 'title' instead of 'name' for consistency
        const normalizedData = (data || []).map((product: any) => ({
          ...product,
          title: product.title || product.name,
          price: product.price || 0,
          image: product.image || '',
        }));

        console.log('[PRODUCT FEED] After normalization:', {
          count: normalizedData.length,
          firstProductName: normalizedData[0]?.name || normalizedData[0]?.title,
        });

        if (currentCursor) {
          // Append to existing products
          setProducts((prev) => [...prev, ...normalizedData]);
        } else {
          // Replace products (refresh)
          console.log('[PRODUCT FEED] Setting products, count:', normalizedData.length);
          setProducts(normalizedData);
        }

        // Update cursor for next page
        setCursor(pagination?.nextCursor || null);
        setHasMore(pagination?.hasMore ?? false);
        console.log('[PRODUCT FEED] State updated. Current product count:', normalizedData.length);
      } catch (err: any) {
        console.error('[PRODUCT FEED] Error fetching products:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        });
        setError(err.response?.data?.message || 'Failed to load products');
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [limit, sessionSeed, country, isLoading]
  );

  /**
   * Load more products
   */
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || !cursor) return;
    fetchProducts(cursor);
  }, [cursor, hasMore, isLoading, fetchProducts]);

  /**
   * Refresh products with new session seed
   */
  const refresh = useCallback(() => {
    const newSeed = Math.floor(Date.now() / 60000);
    setSessionSeed(newSeed);
    setCursor(null);
    setProducts([]);
    setViewedProductIds(new Set());
  }, []);

  /**
   * Track product click
   */
  const trackClick = useCallback(async (productId: string) => {
    try {
      await apiClient.post(`/products/${productId}/click`);
    } catch (err) {
      console.warn('Error tracking click:', err);
    }
  }, []);

  /**
   * Track product purchase
   */
  const trackPurchase = useCallback(async (productId: string) => {
    try {
      await apiClient.post(`/products/${productId}/purchase`);
    } catch (err) {
      console.warn('Error tracking purchase:', err);
    }
  }, []);

  /**
   * Setup Intersection Observer for infinite scroll
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading]);

  /**
   * Auto-fetch first page on mount if autoStart enabled
   */
  useEffect(() => {
    if (autoStart && products.length === 0) {
      fetchProducts();
    }
  }, [autoStart, fetchProducts, products.length]);

  /**
   * Update session seed every 60 seconds
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeed(Math.floor(Date.now() / 60000));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    products,
    isLoading,
    hasMore,
    error,
    cursor,
    sessionSeed,
    viewedProductIds,
    observerTarget,
    fetchProducts,
    loadMore,
    refresh,
    trackClick,
    trackPurchase,
  };
};
