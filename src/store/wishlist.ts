"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product, WishlistItem } from "@/types";

type WishlistState = {
  items: WishlistItem[];
  addProduct: (product: Product) => void;
  removeItem: (lineId: string) => void;
  removeByProductId: (productId: string) => void;
  hasProduct: (productId: string) => boolean;
  clearWishlist: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addProduct: (product) =>
        set((state) => {
          if (state.items.some((item) => item.productId === product.id)) return state;
          return {
            items: [
              ...state.items,
              {
                lineId: `${product.id}-${Date.now()}`,
                productId: product.id,
                slug: product.slug,
                title: product.title,
                category: product.categoryName,
                image: product.image,
                price: product.price,
                addedAt: new Date().toISOString(),
              },
            ],
          };
        }),
      removeItem: (lineId) => set((state) => ({ items: state.items.filter((item) => item.lineId !== lineId) })),
      removeByProductId: (productId) => set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),
      hasProduct: (productId) => get().items.some((item) => item.productId === productId),
      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: "ikonnic-wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
