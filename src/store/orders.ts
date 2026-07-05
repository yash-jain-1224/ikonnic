"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, GiftoraOrder, OrderStatus } from "@/types";

const defaultStatuses: OrderStatus[] = [
  "Order placed",
  "Payment confirmed",
  "Image processing",
  "Design approval",
  "Printing",
  "Quality check",
  "Packing",
  "Shipped",
  "Out for delivery",
  "Delivered",
  "Cancelled",
  "Refunded",
  "Reprint initiated",
];

type OrderState = {
  orders: GiftoraOrder[];
  createOrder: (input: { email: string; phone: string; items: CartItem[]; total: number }) => GiftoraOrder;
};

export const trackingStatuses = defaultStatuses;

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: [],
      createOrder: (input) => {
        const now = new Date();
        const order: GiftoraOrder = {
          id: `GFT-${now.getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          email: input.email,
          phone: input.phone,
          total: input.total,
          status: "Order placed",
          items: input.items,
          createdAt: now.toISOString(),
          trackingEvents: [
            { status: "Order placed", timestamp: now.toISOString(), note: "Demo order created in local Giftora storage." },
            { status: "Image processing", timestamp: now.toISOString(), note: "Uploaded artwork is queued for review." },
          ],
        };
        set((state) => ({ orders: [order, ...state.orders] }));
        return order;
      },
    }),
    {
      name: "giftora-orders",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
