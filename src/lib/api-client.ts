import axios from 'axios';
import { getApiBaseUrl } from './apiConfig';
import { useAuthStore } from '@/store/authStore';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 5, // Max 5 concurrent requests
  retryAttempts: 3,
  retryDelay: 1000, // Start with 1 second
  backoffMultiplier: 2,
};

// Request queue for rate limiting
let activeRequests = 0;
const requestQueue: (() => Promise<any>)[] = [];

const processQueue = async () => {
  while (requestQueue.length > 0 && activeRequests < RATE_LIMIT_CONFIG.maxRequests) {
    activeRequests++;
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
      } catch (error) {
        console.error('Queued request error:', error);
      } finally {
        activeRequests--;
        processQueue(); // Continue processing queue
      }
    }
  }
};

// Create a base axios instance - baseURL will be set dynamically
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to set dynamic baseURL and add JWT token
apiClient.interceptors.request.use(
  async (config) => {
    // Set baseURL dynamically for each request
    if (typeof window !== 'undefined') {
      // Client-side: use dynamic detection
      config.baseURL = getApiBaseUrl();
    } else {
      // Server-side: use environment variable or Vercel config
      config.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://renewablezmart-backend.onrender.com/api';
    }
    
    // Get JWT token from auth store
    try {
      if (typeof window !== 'undefined') {
        let token = useAuthStore.getState().token;
        if (!token) {
          try {
            const stored = localStorage.getItem('auth-store');
            if (stored) {
              const parsed = JSON.parse(stored);
              token = parsed?.state?.token || parsed?.state?.accessToken || token;
            }
          } catch (storageError) {
            console.warn('Failed to read auth-store token:', storageError);
          }
        }
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error getting JWT token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 429 (Too Many Requests) - Rate Limiting
    if (error.response?.status === 429 && (!originalRequest._retryCount || originalRequest._retryCount < RATE_LIMIT_CONFIG.retryAttempts)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const delay = RATE_LIMIT_CONFIG.retryDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, originalRequest._retryCount - 1);
      
      console.warn(`Rate limited (429). Retry ${originalRequest._retryCount}/${RATE_LIMIT_CONFIG.retryAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return apiClient(originalRequest);
    }

    // Handle 401 (Unauthorized) - JWT token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Clear auth state and redirect to login
        if (typeof window !== 'undefined') {
          const { logout } = useAuthStore.getState();
          logout();
          window.location.href = '/login';
        }
      } catch (logoutError) {
        console.error('Logout error:', logoutError);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(logoutError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
