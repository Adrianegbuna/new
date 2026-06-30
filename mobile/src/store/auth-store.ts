import { useEffect } from "react";
import { create } from "zustand";
import { API_BASE_URL } from "@/config/env";
import { secureStorage } from "@/store/storage";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  setSession: (payload: { user: User; token: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const AUTH_KEY = "rz_auth_v1";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  setSession: async ({ user, token }) => {
    await secureStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
    set({ user, token });
  },
  logout: async () => {
    await secureStorage.removeItem(AUTH_KEY);
    set({ user: null, token: null });
  },
  hydrate: async () => {
    const raw = await secureStorage.getItem(AUTH_KEY);
    if (!raw) {
      set({ hydrated: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const token = parsed.token ?? null;
      const fallbackUser = parsed.user ?? null;

      if (!token) {
        await secureStorage.removeItem(AUTH_KEY);
        set({ hydrated: true, user: null, token: null });
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Session validation failed");
        }

        const user = (await response.json()) as User;
        await secureStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
        set({
          user,
          token,
          hydrated: true
        });
        return;
      } catch {
        if (fallbackUser) {
          set({
            user: fallbackUser,
            token,
            hydrated: true
          });
          return;
        }

        await secureStorage.removeItem(AUTH_KEY);
        set({ hydrated: true, user: null, token: null });
        return;
      }

    } catch {
      await secureStorage.removeItem(AUTH_KEY);
      set({ hydrated: true, user: null, token: null });
    }
  }
}));

export function useBootstrapAuth() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
