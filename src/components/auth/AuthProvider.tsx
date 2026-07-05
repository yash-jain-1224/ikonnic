"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";

/**
 * AuthProvider: Initializes auth state on app mount.
 * Fetches user profile if a token exists, syncs cart/wishlist from backend,
 * and listens for forced logout events.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const syncCart = useCartStore((s) => s.syncFromBackend);
  const syncWishlist = useWishlistStore((s) => s.syncFromBackend);

  useEffect(() => {
    // Attempt to restore session on mount
    fetchProfile();

    // Listen for forced logout (e.g., from token refresh failure)
    const handleForcedLogout = () => {
      logout();
    };
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [fetchProfile, logout]);

  // Sync stores from backend once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      syncCart().catch(() => {});
      syncWishlist().catch(() => {});
    }
  }, [isAuthenticated, syncCart, syncWishlist]);

  return <>{children}</>;
}
