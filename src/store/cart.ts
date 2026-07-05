"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/types";

type CartState = {
  items: CartItem[];
  coupon?: string;
  addItem: (item: Omit<CartItem, "lineId">) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  applyCoupon: (coupon: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: undefined,
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              productName: item.productName ?? item.title,
              category: item.category ?? "Personalised Gifts",
              thumbnail: item.thumbnail ?? item.image,
              unitPrice: item.unitPrice ?? item.price,
              optionsPrice: item.optionsPrice ?? 0,
              discount: item.discount ?? 0,
              tax: item.tax ?? 0,
              shippingEstimate: item.shippingEstimate ?? 0,
              finalTotal: item.finalTotal ?? item.price * item.quantity,
              previewImage: item.previewImage ?? item.uploadedImagePreview ?? item.image,
              userIdOrGuestSessionId: item.userIdOrGuestSessionId ?? "guest-local",
              lineId: `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            },
          ],
        })),
      removeItem: (lineId) => set((state) => ({ items: state.items.filter((item) => item.lineId !== lineId) })),
      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.lineId !== lineId) return item;
            const nextQuantity = Math.max(1, quantity);
            return {
              ...item,
              quantity: nextQuantity,
              selectedOptions: { ...item.selectedOptions, quantity: nextQuantity },
              finalTotal: (item.unitPrice ?? item.price) * nextQuantity + (item.optionsPrice ?? 0) - (item.discount ?? 0),
            };
          }),
        })),
      applyCoupon: (coupon) => set({ coupon: coupon.trim().toUpperCase() || undefined }),
      clearCart: () => set({ items: [], coupon: undefined }),
      cartTotal: () => get().items.reduce((total, item) => total + (item.finalTotal ?? item.price * item.quantity), 0),
      cartCount: () => get().items.reduce((total, item) => total + item.quantity, 0),
    }),
    {
      name: "ikonnic-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
