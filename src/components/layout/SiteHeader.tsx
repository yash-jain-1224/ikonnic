"use client";

import Link from "next/link";
import { ArrowLeft, Home, LogIn, Search, ShoppingCart, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { brand } from "@/config/brand";
import { useCartStore } from "@/store/cart";
import { SearchModal } from "@/components/ui/SearchModal";

export function SiteHeader() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  const cartCount = mounted ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-rosegold-200/60 bg-[#fce4da]">
        <div className="mx-auto grid h-[68px] max-w-[1240px] grid-cols-3 items-center px-4 sm:px-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="grid size-10 place-items-center rounded-full text-rosegold-900 transition hover:bg-rosegold-100"
            >
              <ArrowLeft size={24} strokeWidth={2.4} />
            </button>
            <Link href="/" aria-label="Home" className="grid size-10 place-items-center rounded-full text-rosegold-900 transition hover:bg-rosegold-100">
              <Home size={23} strokeWidth={2.4} />
            </Link>
          </div>

          <Link href="/" className="mx-auto inline-flex h-8 items-center gap-1 rounded-[2px] bg-rosegold-900 px-2.5 text-[19px] font-black tracking-[-0.03em] text-rosegold-50">
            {brand.logoText}
            <span className="grid size-6 place-items-center rounded-[2px] bg-ikonnic-red text-white">
              <Tag size={15} fill="currentColor" />
            </span>
          </Link>

          <div className="flex items-center justify-end gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="grid size-10 place-items-center rounded-full text-rosegold-900 transition hover:bg-rosegold-100"
            >
              <Search size={22} strokeWidth={2.3} />
            </button>
            <Link href="/login" className="hidden items-center gap-2 rounded-full px-3 py-2 text-[18px] font-medium text-rosegold-900 transition hover:bg-rosegold-100 sm:flex">
              <LogIn size={24} strokeWidth={2.3} />
              Login
            </Link>
            <Link href="/cart" aria-label={`Cart with ${cartCount} items`} className="relative grid size-11 place-items-center rounded-full text-rosegold-900 transition hover:bg-rosegold-100">
              <ShoppingCart size={28} strokeWidth={2.25} />
              {cartCount > 0 ? (
                <span className="absolute right-0 top-0 grid size-5 place-items-center rounded-full bg-ikonnic-red text-[10px] font-black text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}
