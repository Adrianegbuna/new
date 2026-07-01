import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  accountType?: string;
  role: 'admin' | 'vendor' | 'customer' | 'installer';
  adminLevel?: 'SA00' | 'SA10' | 'SA20';
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankCode?: string;
  bankCountry?: string;
  profilePhotoUrl?: string;
  profilePhotoKey?: string;
  logoUrl?: string;
  logoKey?: string;
  interestedInPaySmallSmall?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsHydrated: (isHydrated: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      isHydrated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token, accessToken: token }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsHydrated: (isHydrated) => set({ isHydrated }),
      
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      
      logout: () => set({ 
        user: null,
        token: null,
        accessToken: null,
        isAuthenticated: false 
      }),
      
      initializeAuth: () => {
        // Check if user data and token are already persisted
        // This will be called on app startup
        set({ isLoading: false });
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.token && state.accessToken) {
            state.token = state.accessToken;
          }
          state.isAuthenticated = !!(state.user && (state.token || state.accessToken));
          state.isHydrated = true;
          state.isLoading = false;
        }
      },
    }
  )
);

