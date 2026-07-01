/**
 * API Request Cache & Batching Utility
 * Reduces API calls by caching responses and batching requests
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const cache: Map<string, CacheEntry> = new Map();

// Cache configuration
const CACHE_CONFIG = {
  categories: 1 * 60 * 1000, // 1 minute
  products: 5 * 60 * 1000, // 5 minutes
  productRatings: 10 * 60 * 1000, // 10 minutes
  stores: 5 * 60 * 1000, // 5 minutes
};

/**
 * Get cached value if still valid
 */
export const getCached = (key: string): any | null => {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > entry.ttl;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

/**
 * Set cache value
 */
export const setCached = (key: string, data: any, ttl: number): void => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

/**
 * Clear specific cache entry
 */
export const clearCache = (key: string): void => {
  cache.delete(key);
};

/**
 * Clear all cache
 */
export const clearAllCache = (): void => {
  cache.clear();
};

/**
 * Batch fetch product ratings
 * Instead of fetching each rating individually, batch them
 */
let ratingBatch: string[] = [];
let ratingBatchTimeout: NodeJS.Timeout | null = null;

export const batchGetProductRatings = (productIds: string[]): Promise<Map<string, number>> => {
  return new Promise((resolve) => {
    // Add product IDs to batch
    ratingBatch.push(...productIds);
    ratingBatch = [...new Set(ratingBatch)]; // Remove duplicates

    // Clear previous timeout
    if (ratingBatchTimeout) {
      clearTimeout(ratingBatchTimeout);
    }

    // Wait 100ms to collect more requests, then batch fetch
    ratingBatchTimeout = setTimeout(async () => {
      const idsToFetch = [...ratingBatch];
      ratingBatch = [];

      const cacheKey = `ratings:${idsToFetch.sort().join(',')}`;
      const cached = getCached(cacheKey);
      
      if (cached) {
        resolve(new Map(Object.entries(cached)));
        return;
      }

      try {
        const { apiClient } = await import('./api-client');
        
        // Fetch ratings in batches of 20
        const batchSize = 20;
        const ratingsMap = new Map<string, number>();

        for (let i = 0; i < idsToFetch.length; i += batchSize) {
          const batch = idsToFetch.slice(i, i + batchSize);
          try {
            const response = await apiClient.post('/products/ratings', {
              productIds: batch,
            });
            
            if (response.data && typeof response.data === 'object') {
              Object.entries(response.data).forEach(([id, rating]: [string, any]) => {
                ratingsMap.set(id, rating.rating || 0);
              });
            }
          } catch (error) {
            console.error('Error fetching batch ratings:', error);
          }
        }

        // Cache results
        const ratingsObj = Object.fromEntries(ratingsMap);
        setCached(cacheKey, ratingsObj, CACHE_CONFIG.productRatings);

        resolve(ratingsMap);
      } catch (error) {
        console.error('Error in batchGetProductRatings:', error);
        resolve(new Map());
      }
    }, 100);
  });
};

/**
 * Debounced fetch with caching
 */
export const cachedFetch = async (
  key: string,
  fetcher: () => Promise<any>,
  ttl: number = CACHE_CONFIG.products
): Promise<any> => {
  // Check cache first
  const cached = getCached(key);
  if (cached !== null) {
    return cached;
  }

  try {
    const data = await fetcher();
    setCached(key, data, ttl);
    return data;
  } catch (error) {
    console.error(`Error fetching ${key}:`, error);
    throw error;
  }
};

/**
 * Debounce function to limit request frequency
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        try {
          const result = func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
};

/**
 * Throttle function to limit request frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => ReturnType<T>) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      inThrottle = true;
      const result = func(...args);
      setTimeout(() => (inThrottle = false), limit);
      return result;
    }
    return undefined as any;
  };
};
