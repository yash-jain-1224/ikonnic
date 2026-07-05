"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";

export function WishlistClient() {
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const addItem = useCartStore((state) => state.addItem);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-72 animate-pulse rounded-3xl bg-white" />;
  if (!items.length) return <EmptyState title="Your wishlist is empty" description="Save products while browsing and move them to cart when you are ready." />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.lineId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Link href={`/product/${item.slug}`} className="relative block aspect-[4/3] w-full">
            <Image src={item.image} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          </Link>
          <div className="p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-ikonnic-red">{item.category}</p>
            <Link href={`/product/${item.slug}`} className="mt-1 block font-black text-slate-950 hover:text-ikonnic-red">{item.title}</Link>
            <p className="mt-2 text-sm font-black">Rs {item.price.toLocaleString("en-IN")}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  addItem({
                    productId: item.productId,
                    productName: item.title,
                    slug: item.slug,
                    title: item.title,
                    category: item.category,
                    image: item.image,
                    price: item.price,
                    quantity: 1,
                    selectedOptions: { shape: "custom", size: "8 x 10 in" },
                    previewImage: item.image,
                  });
                  removeItem(item.lineId);
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ikonnic-red px-4 py-2.5 text-xs font-black text-white hover:bg-red-700"
              >
                <ShoppingCart size={15} /> Move to cart
              </button>
              <button type="button" onClick={() => removeItem(item.lineId)} className="grid size-10 place-items-center rounded-full border border-red-200 bg-red-50 text-ikonnic-red">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
