/**
 * API Configuration
 * Centralized configuration for all API endpoints
 * Vercel Deployment - Testing v1
 */

export const getApiBaseUrl = () => {
  // Check if we're in client-side environment
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or hardcoded production URL
    return process.env.NEXT_PUBLIC_API_URL || 'https://renewablezmart-backend.onrender.com/api'
  }
  
  // Client-side: detect environment
  const hostname = window.location.hostname
  const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1'
  
  if (isProduction) {
    // Production environment: use Render backend
    return 'https://renewablezmart-backend.onrender.com/api'
  }
  
  // Local development: use localhost
  return 'http://localhost:4000/api'
}

export const getBackendBaseUrl = () => {
  // Check if we're in client-side environment
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or hardcoded production URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://renewablezmart-backend.onrender.com/api'
    return apiUrl.replace('/api', '')
  }
  
  // Client-side: detect environment
  const hostname = window.location.hostname
  const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1'
  
  if (isProduction) {
    // Production environment: use Render backend
    return 'https://renewablezmart-backend.onrender.com'
  }
  
  // Local development: use localhost
  return 'http://localhost:4000'
}

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh'
  },
  PRODUCTS: {
    GET_ALL: '/products',
    GET_BY_ID: (id: string) => `/products/${id}`,
    SEARCH: '/products/search',
    GET_ALL_VENDOR: '/products/all-vendor'
  },
  STORES: {
    GET_ALL: '/stores',
    GET_BY_ID: (id: string) => `/stores/${id}`
  },
  ORDERS: {
    CREATE: '/orders',
    GET_MY_ORDERS: '/orders/my-orders',
    GET_BY_ID: (id: string) => `/orders/${id}`,
    GET_TRACKING: (id: string) => `/orders/${id}/tracking`
  },
  ADMIN: {
    STATS: '/admin/stats/public',
    USERS: '/admin/users',
    ORDERS: '/admin/orders',
    PRODUCTS: '/admin/products',
    STORES: '/admin/stores',
    PENDING_PRODUCTS: '/admin/products/pending'
  },
  UPLOADS: {
    GET_FILE: (path: string) => `/uploads${path}`
  }
}
