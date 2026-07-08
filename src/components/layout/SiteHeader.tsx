"use client";

import Link from "next/link";
import Image from "next/image";
import { LogIn, Search, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { SearchModal } from "@/components/ui/SearchModal";

export function SiteHeader() {
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  const cartCount = mounted ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-rosegold-200/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Image
              src="/images/ikonnic-wbg.png"
              alt="Ikonnic"
              width={160}
              height={48}
              priority
              className="h-12 w-auto"
            />
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
