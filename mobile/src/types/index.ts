export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "vendor" | "customer" | "installer";
  phone?: string;
  country?: string;
  city?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export interface Product {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  videos?: string[];
  category?: string;
  categoryName?: string;
  stock?: number;
  status?: string;
  store?: {
    id?: string;
    name?: string;
    slug?: string;
    city?: string;
  };
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image?: string;
  qty: number;
  stock: number;
}

export interface OrderItem {
  productId?: string;
  productName?: string;
  quantity: number;
  price: number;
  image?: string;
  storeName?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  orderStatus?: string;
  paymentStatus?: string;
  totalAmount?: number;
  total?: number;
  createdAt?: string;
  items?: OrderItem[];
}

export interface Address {
  id: string;
  label?: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface AddressPayload {
  label?: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  productCategory?: string;
  notifyOnPriceDrop?: boolean;
  notifyOnStockUpdate?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  accountType?: "customer";
}
