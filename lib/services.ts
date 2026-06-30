import { Product, Order, AuthResponse, PaymentIntent } from '@/types';
import { apiClient } from './api-client';

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const response = await apiClient.get('/products');
    const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
    return list.filter((product: any) => {
      if (typeof product?.isApproved === 'boolean') return product.isApproved;
      const status = String(product?.approvalStatus || product?.status || '').toLowerCase();
      return status === 'approved' || status === 'active' || status === 'published';
    });
  },

  getByCountry: async (country: string): Promise<Product[]> => {
    const response = await apiClient.get(`/products?country=${encodeURIComponent(country)}`);
    const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
    return list.filter((product: any) => {
      if (typeof product?.isApproved === 'boolean') return product.isApproved;
      const status = String(product?.approvalStatus || product?.status || '').toLowerCase();
      return status === 'approved' || status === 'active' || status === 'published';
    });
  },

  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  search: async (query: string, country?: string): Promise<Product[]> => {
    const url = country 
      ? `/products/search?q=${query}&country=${encodeURIComponent(country)}`
      : `/products/search?q=${query}`;
    const response = await apiClient.get(url);
    const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
    return list.filter((product: any) => {
      if (typeof product?.isApproved === 'boolean') return product.isApproved;
      const status = String(product?.approvalStatus || product?.status || '').toLowerCase();
      return status === 'approved' || status === 'active' || status === 'published';
    });
  },
};

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    country?: string;
    city?: string;
    accountType?: string;
    businessName?: string;
    businessRegNumber?: string;
    certifications?: string;
    yearsOfExperience?: number;
    serviceAreas?: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

export const orderService = {
  create: async (orderData: any): Promise<Order> => {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },

  getMyOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders/my-orders');
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },
};

export const paymentService = {
  initializePayment: async (amount: number, orderId: string): Promise<PaymentIntent> => {
    const response = await apiClient.post('/payments/initialize', {
      amount,
      orderId,
    });
    return response.data;
  },

  verifyPayment: async (reference: string): Promise<any> => {
    const response = await apiClient.get(`/payments/verify/${reference}`);
    return response.data;
  },
};
