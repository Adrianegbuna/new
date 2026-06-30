import { useEffect } from "react";
import { create } from "zustand";
import { secureStorage } from "@/store/storage";
import type { CartItem, Product } from "@/types";

interface CartState {
  items: CartItem[];
  hydrated: boolean;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  hydrate: () => Promise<void>;
}

const CART_KEY = "rz_cart_v1";

const normalizeTitle = (product: Product) => product.title || product.name || "Product";

const normalizeImage = (product: Product) => {
  const primary = product.image || product.images?.[0];
  return primary || undefined;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  hydrated: false,
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === String(product.id));
      const stock = Math.max(Number(product.stock || 1), 1);

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === String(product.id)
              ? { ...item, qty: Math.min(item.qty + 1, stock) }
              : item
          )
        };
      }

      return {
        items: [
          ...state.items,
          {
            id: String(product.id),
            title: normalizeTitle(product),
            price: Number(product.price || 0),
            image: normalizeImage(product),
            qty: 1,
            stock
          }
        ]
      };
    }),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    })),
  updateQty: (id, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((item) => item.id !== id)
          : state.items.map((item) =>
              item.id === id
                ? { ...item, qty: Math.min(Math.max(qty, 1), item.stock) }
                : item
            )
    })),
  clear: () => set({ items: [] }),
  hydrate: async () => {
    const raw = await secureStorage.getItem(CART_KEY);
    if (!raw) {
      set({ hydrated: true });
      return;
    }

    try {
      const items = JSON.parse(raw) as CartItem[];
      set({ items: Array.isArray(items) ? items : [], hydrated: true });
    } catch {
      await secureStorage.removeItem(CART_KEY);
      set({ items: [], hydrated: true });
    }
  }
}));

useCartStore.subscribe(async (state) => {
  if (!state.hydrated) return;
  await secureStorage.setItem(CART_KEY, JSON.stringify(state.items));
});

export function useBootstrapCart() {
  const hydrate = useCartStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
