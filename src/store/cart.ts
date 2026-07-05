"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem } from "@/types";
import { cartAPI } from "@/lib/api";
import { tokenStorage } from "@/lib/api";

// ─── Guest Session ID ─────────────────────────────────────
function getGuestSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("ikonnic_guest_session");
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("ikonnic_guest_session", id);
  }
  return id;
}

type CartState = {
  items: CartItem[];
  coupon?: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  addItem: (item: Omit<CartItem, "lineId">) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  applyCoupon: (coupon: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
  // Backend sync methods
  syncFromBackend: () => Promise<void>;
  mergeGuestCart: () => Promise<void>;
};

const isAuthenticated = () => !!tokenStorage.getAccessToken();

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: undefined,
      isSyncing: false,
      lastSyncedAt: null,

      addItem: (item) => {
        const lineId = `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newItem: CartItem = {
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
          lineId,
        };
        set((state) => ({ items: [...state.items, newItem] }));

        // Sync to backend (fire-and-forget)
        if (typeof window !== "undefined") {
          const guestSessionId = isAuthenticated() ? undefined : getGuestSessionId();
          cartAPI.addItem({
            productId: newItem.productId,
            title: newItem.title,
            slug: newItem.slug,
            image: newItem.image,
            price: newItem.price,
            quantity: newItem.quantity,
            unitPrice: newItem.unitPrice,
            optionsPrice: newItem.optionsPrice,
            selectedOptions: newItem.selectedOptions,
            uploadedImageRef: newItem.uploadedImageReference || newItem.uploadedImagePreview,
            previewImage: newItem.previewImage,
            customisationJson: newItem.customisationJson,
          }, guestSessionId).catch(() => { /* Offline fallback: localStorage holds state */ });
        }
      },

      removeItem: (lineId) => {
        const item = get().items.find((i) => i.lineId === lineId);
        set((state) => ({ items: state.items.filter((i) => i.lineId !== lineId) }));
        // Sync delete to backend
        if (item?.id) {
          cartAPI.removeItem(item.id).catch(() => {});
        }
      },

      updateQuantity: (lineId, quantity) => {
        const nextQuantity = Math.max(1, quantity);
        let backendId: string | undefined;
        set((state) => ({
          items: state.items.map((item) => {
            if (item.lineId !== lineId) return item;
            backendId = item.id;
            return {
              ...item,
              quantity: nextQuantity,
              selectedOptions: { ...item.selectedOptions, quantity: nextQuantity },
              finalTotal: (item.unitPrice ?? item.price) * nextQuantity + (item.optionsPrice ?? 0) - (item.discount ?? 0),
            };
          }),
        }));
        // Sync to backend
        if (backendId) {
          cartAPI.updateItem(backendId, { quantity: nextQuantity }).catch(() => {});
        }
      },

      applyCoupon: (coupon) => set({ coupon: coupon.trim().toUpperCase() || undefined }),

      clearCart: () => {
        set({ items: [], coupon: undefined });
        const guestSessionId = isAuthenticated() ? undefined : getGuestSessionId();
        cartAPI.clear(guestSessionId).catch(() => {});
      },

      cartTotal: () => get().items.reduce((total, item) => total + (item.finalTotal ?? item.price * item.quantity), 0),
      cartCount: () => get().items.reduce((total, item) => total + item.quantity, 0),

      // Fetch cart from backend and replace local state
      syncFromBackend: async () => {
        set({ isSyncing: true });
        try {
          const guestSessionId = isAuthenticated() ? undefined : getGuestSessionId();
          const { data } = await cartAPI.get(guestSessionId);
          const backendItems: CartItem[] = (data.items || []).map((item: any) => ({
            id: item.id,
            lineId: item.id || `${item.productId}-${Date.now()}`,
            productId: item.productId,
            productSlug: item.slug,
            productName: item.title,
            slug: item.slug,
            title: item.title,
            category: item.category || "Personalised Gifts",
            image: item.image,
            thumbnail: item.thumbnail || item.image,
            price: item.price,
            unitPrice: item.unitPrice ?? item.price,
            optionsPrice: item.optionsPrice ?? 0,
            discount: item.discount ?? 0,
            tax: item.tax ?? 0,
            shippingEstimate: item.shippingEstimate ?? 0,
            finalTotal: item.finalTotal ?? item.price * item.quantity,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions ?? { shape: "custom", size: "8 x 10 in" },
            previewImage: item.previewImage || item.image,
            uploadedImagePreview: item.uploadedImageRef,
            uploadedImageReference: item.uploadedImageRef,
            customisationJson: item.customisationJson,
          }));
          set({ items: backendItems, lastSyncedAt: new Date().toISOString() });
        } catch {
          // Keep local state as fallback
        } finally {
          set({ isSyncing: false });
        }
      },

      // Merge guest cart into authenticated user's cart after login
      mergeGuestCart: async () => {
        const guestSessionId = getGuestSessionId();
        try {
          await cartAPI.merge(guestSessionId);
          // After merge, fetch updated cart
          await get().syncFromBackend();
          // Clear guest session
          localStorage.removeItem("ikonnic_guest_session");
        } catch {
          // Merge failed — keep local items
        }
      },
    }),
    {
      name: "ikonnic-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
