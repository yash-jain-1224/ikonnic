"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { categories } from "@/data/categories";
import { products as allProducts } from "@/data/products";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { SmartImage } from "@/components/ui/SmartImage";
import { isWhitelistedCategory, WHITELISTED_CATEGORY_SLUGS } from "@/config/whitelist";

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
const featuredProductSlugs = new Set(
  WHITELISTED_CATEGORY_SLUGS.flatMap((slug) => categoryBySlug.get(slug)?.productSlugs ?? [])
);
const defaultProducts = allProducts
  .filter((p) => isWhitelistedCategory(p.categorySlug) && featuredProductSlugs.has(p.slug))
  .slice(0, 8);

export function FeaturedProductsCarousel({ products = defaultProducts }: { products?: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <div className="relative mt-16 w-full">
      <div className="mb-6 flex items-end justify-between px-4 sm:px-6">
        <div>
          <h2 className="text-2xl font-black text-rosegold-900 sm:text-3xl">Trending Gifts</h2>
          <p className="mt-1 text-sm text-slate-500">The most loved personalized products this week.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            onClick={scrollLeft}
            className="grid size-10 place-items-center rounded-full border border-rosegold-200 bg-[#fffbf9] text-rosegold-700 transition hover:bg-rosegold-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={scrollRight}
            className="grid size-10 place-items-center rounded-full border border-rosegold-200 bg-[#fffbf9] text-rosegold-700 transition hover:bg-rosegold-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-8 pt-4 scrollbar-none sm:px-6"
      >
        {products.map((product, index) => (
          <Link
            key={product.id}
            href={`/customise/${product.slug}`}
            className="group flex w-[260px] shrink-0 snap-start flex-col gap-3 sm:w-[280px]"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 shadow-sm transition group-hover:shadow-md">
              <SmartImage
                src={product.image}
                alt={product.title}
                priority={index < 4}
                wrapperClassName="h-full w-full"
                imageClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              {product.sale && (
                <div className="absolute left-3 top-3 rounded-full bg-ikonnic-red px-3 py-1 text-[11px] font-black tracking-widest text-white shadow-sm">
                  SALE
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-rosegold-500">
                {product.categoryName}
              </p>
              <h3 className="mt-0.5 font-bold leading-snug text-rosegold-900 transition group-hover:text-ikonnic-red">
                {product.title}
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-black text-ikonnic-red">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                {product.oldPrice && (
                  <span className="text-sm font-bold text-slate-400 line-through">
                    ₹{product.oldPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
