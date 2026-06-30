import { apiClient } from "@/api/client";
import type {
  Address,
  AddressPayload,
  AuthResponse,
  Order,
  Product,
  RegisterPayload,
  WishlistItem
} from "@/types";

const asArray = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: T[] }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
};

export const authApi = {
  async login(email: string, password: string) {
    const response = await apiClient.post<AuthResponse>("/auth/login", { email, password });
    return response.data;
  },
  async register(payload: RegisterPayload) {
    const response = await apiClient.post<AuthResponse>("/auth/register", payload);
    return response.data;
  },
  async me() {
    const response = await apiClient.get<AuthResponse["user"]>("/auth/me");
    return response.data;
  }
};

export const productApi = {
  async list() {
    const response = await apiClient.get("/products");
    return asArray<Product>(response.data).filter((product) => {
      const status = String((product as Product & { status?: string }).status || "").toLowerCase();
      return status === "" || status === "approved" || status === "active" || status === "published";
    });
  },
  async getById(id: string) {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },
  async search(query: string) {
    const response = await apiClient.get(`/products/search?q=${encodeURIComponent(query)}`);
    const items = asArray<Product>(response.data);
    if (items.length > 0) {
      return items;
    }

    const fallback = await this.list();
    const needle = query.trim().toLowerCase();
    return fallback.filter((product) => {
      const title = product.title || product.name || "";
      const category = product.categoryName || product.category || "";
      return `${title} ${category}`.toLowerCase().includes(needle);
    });
  }
};

export const orderApi = {
  async myOrders() {
    const response = await apiClient.get<Order[]>("/orders/my-orders");
    return asArray<Order>(response.data);
  },
  async create(payload: { items: Array<{ productId: string; quantity: number; price: number }>; shippingAddress: Address }) {
    const response = await apiClient.post<Order | { data?: Order }>("/orders", payload);
    return (response.data as { data?: Order }).data || (response.data as Order);
  }
};

export const addressApi = {
  async list() {
    const response = await apiClient.get<Address[]>("/addresses");
    return asArray<Address>(response.data);
  },
  async create(payload: AddressPayload) {
    const response = await apiClient.post<Address>("/addresses", payload);
    return response.data;
  },
  async setDefault(id: string) {
    const response = await apiClient.patch<Address>(`/addresses/${id}/default`);
    return response.data;
  },
  async remove(id: string) {
    await apiClient.delete(`/addresses/${id}`);
  }
};

export const wishlistApi = {
  async list() {
    const response = await apiClient.get<{ success: boolean; data: WishlistItem[] }>("/wishlist");
    return asArray<WishlistItem>(response.data);
  },
  async add(product: Product) {
    const response = await apiClient.post("/wishlist/add", {
      productId: product.id,
      productName: product.title || product.name || "Product",
      productPrice: Number(product.price || 0),
      productImage: product.image || product.images?.[0],
      productCategory: product.categoryName || product.category || "Product"
    });
    return response.data;
  },
  async remove(id: string) {
    await apiClient.delete(`/wishlist/${id}`);
  }
};
