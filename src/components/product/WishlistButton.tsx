"use client";

import { Heart } from "lucide-react";
import type { Product } from "@/types";
import { useWishlistStore } from "@/store/wishlist";

export function WishlistButton({ product, compact = false }: { product: Product; compact?: boolean }) {
  const addProduct = useWishlistStore((state) => state.addProduct);
  const removeByProductId = useWishlistStore((state) => state.removeByProductId);
  const liked = useWishlistStore((state) => state.hasProduct(product.id));

  return (
    <button
      type="button"
      onClick={() => (liked ? removeByProductId(product.id) : addProduct(product))}
      aria-pressed={liked}
      className={`inline-flex items-center justify-center gap-2 rounded-full border text-xs font-black transition ${compact ? "size-10 p-0" : "px-4 py-3"} ${liked ? "border-ikonnic-red bg-red-50 text-ikonnic-red" : "border-rosegold-200/60 bg-white text-slate-600 hover:border-red-200 hover:text-ikonnic-red"}`}
    >
      <Heart size={16} fill={liked ? "currentColor" : "none"} />
      {compact ? <span className="sr-only">Wishlist</span> : liked ? "Saved" : "Wishlist"}
    </button>
  );
}
