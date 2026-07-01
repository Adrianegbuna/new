export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  subcategory?: string;
  stock: number;
  createdAt?: string;
  updatedAt?: string;
}

// Frontend catalog product shape used by static `data/products.json`
export interface CatalogProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  eco?: boolean;
  freeShipping?: boolean;
  stock: number;
  description?: string;
  storeId?: string;
  storeName?: string;
  rating?: number;
  ratingCount?: number;
  sales?: number;
  views?: number;
}

export interface CatalogCartItem extends CatalogProduct {
  qty: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
  vendorId?: string;
  storeName?: string;
  storeCity?: string;
  isSwapItem?: boolean;
  swapItemType?: 'resale' | 'tradein';
  originalSellerId?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PaymentIntent {
  amount: number;
  currency: string;
  reference: string;
  authorizationUrl: string;
}
