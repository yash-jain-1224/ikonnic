"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product, WishlistItem } from "@/types";
import { wishlistAPI, tokenStorage } from "@/lib/api";

const isAuthenticated = () => !!tokenStorage.getAccessToken();

type WishlistState = {
  items: WishlistItem[];
  isSyncing: boolean;
  addProduct: (product: Product) => void;
  removeItem: (lineId: string) => void;
  removeByProductId: (productId: string) => void;
  hasProduct: (productId: string) => boolean;
  clearWishlist: () => void;
  syncFromBackend: () => Promise<void>;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isSyncing: false,

      addProduct: (product) => {
        if (get().items.some((item) => item.productId === product.id)) return;

        const newItem: WishlistItem = {
          lineId: `${product.id}-${Date.now()}`,
          productId: product.id,
          slug: product.slug,
          title: product.title,
          category: product.categoryName,
          image: product.image,
          price: product.price,
          addedAt: new Date().toISOString(),
        };
        set((state) => ({ items: [...state.items, newItem] }));

        // Sync to backend if authenticated
        if (isAuthenticated()) {
          wishlistAPI.add(product.id).catch(() => {});
        }
      },

      removeItem: (lineId) => {
        const item = get().items.find((i) => i.lineId === lineId);
        set((state) => ({ items: state.items.filter((i) => i.lineId !== lineId) }));
        if (item && isAuthenticated()) {
          wishlistAPI.remove(item.productId).catch(() => {});
        }
      },

      removeByProductId: (productId) => {
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) }));
        if (isAuthenticated()) {
          wishlistAPI.remove(productId).catch(() => {});
        }
      },

      hasProduct: (productId) => get().items.some((item) => item.productId === productId),

      clearWishlist: () => {
        set({ items: [] });
        if (isAuthenticated()) {
          wishlistAPI.clear().catch(() => {});
        }
      },

      // Fetch wishlist from backend and replace local state
      syncFromBackend: async () => {
        if (!isAuthenticated()) return;
        set({ isSyncing: true });
        try {
          const { data } = await wishlistAPI.get();
          const items: WishlistItem[] = (data.items || data || []).map((item: any) => ({
            lineId: item.id || `${item.productId}-${Date.now()}`,
            productId: item.productId,
            slug: item.product?.slug || item.slug || "",
            title: item.product?.title || item.title || "",
            category: item.product?.categoryName || item.category || "",
            image: item.product?.image || item.image || "",
            price: item.product?.price || item.price || 0,
            addedAt: item.createdAt || item.addedAt || new Date().toISOString(),
          }));
          set({ items });
        } catch {
          // Keep local state as fallback
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "ikonnic-wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
