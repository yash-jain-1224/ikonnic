"use client";

import { create } from "zustand";
import { authAPI, tokenStorage, usersAPI } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
};

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { email: string; phone?: string; firstName: string; lastName?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser | null) => void;
};

// Helper to trigger cart/wishlist sync after auth state changes
async function syncStoresAfterAuth() {
  // Dynamic imports to avoid circular dependencies
  const { useCartStore } = await import("@/store/cart");
  const { useWishlistStore } = await import("@/store/wishlist");

  // Merge guest cart into authenticated cart, then sync
  await useCartStore.getState().mergeGuestCart();
  // Sync wishlist from backend
  await useWishlistStore.getState().syncFromBackend();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ identifier, password });
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      // Sync cart & wishlist in background (non-blocking)
      syncStoresAfterAuth().catch(() => {});
    } catch (err: any) {
      const message = err.response?.data?.message || "Login failed. Please check your credentials.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register(userData);
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      // Sync cart & wishlist in background
      syncStoresAfterAuth().catch(() => {});
    } catch (err: any) {
      const message = err.response?.data?.message || "Registration failed. Please try again.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      await authAPI.logout(refreshToken || undefined);
    } catch {
      // Ignore errors on logout
    } finally {
      tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchProfile: async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    set({ isLoading: true });
    try {
      const { data } = await usersAPI.getProfile();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      // Token invalid/expired — clear auth
      tokenStorage.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
