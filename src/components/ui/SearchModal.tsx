"use client";

import { Search, X, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { categories } from "@/data/categories";
import { products } from "@/data/products";
import { searchAPI } from "@/lib/api";
import { isWhitelistedCategory, WHITELISTED_CATEGORY_SLUGS } from "@/config/whitelist";

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
const searchableCategories = WHITELISTED_CATEGORY_SLUGS.flatMap((slug) => {
  const category = categoryBySlug.get(slug);
  return category ? [category] : [];
});
const searchableProductSlugs = new Set(searchableCategories.flatMap((category) => category.productSlugs ?? []));
const searchableProducts = products.filter(
  (product) => isWhitelistedCategory(product.categorySlug) && searchableProductSlugs.has(product.slug)
);

type DisplayCategory = { slug: string; name: string; image?: string; description?: string };
type DisplayProduct = { id: string; slug: string; title: string; image: string; price: number; categoryName: string };

export function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<{ categories: DisplayCategory[]; products: DisplayProduct[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Backend search with debounce; falls back to static filtering on failure
  useEffect(() => {
    if (query.trim().length < 2) {
      setRemote(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchAPI.query(query.trim());
        if (cancelled) return;
        const remoteProducts: DisplayProduct[] = (data.products ?? [])
          .filter((p: { category?: { slug?: string } }) => !p.category?.slug || isWhitelistedCategory(p.category.slug))
          .map((p: { id: string; slug: string; title: string; image: string; price: number | string; category?: { slug?: string } }) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            image: p.image,
            price: Number(p.price),
            categoryName: (p.category?.slug && categoryBySlug.get(p.category.slug)?.name) || "",
          }));
        const remoteCategories: DisplayCategory[] = (data.categories ?? [])
          .filter((c: { slug: string }) => isWhitelistedCategory(c.slug))
          .map((c: { slug: string; name: string; image?: string }) => ({
            slug: c.slug,
            name: c.name,
            image: c.image ?? categoryBySlug.get(c.slug)?.image,
            description: categoryBySlug.get(c.slug)?.description,
          }));
        setRemote(
          remoteProducts.length || remoteCategories.length
            ? { products: remoteProducts.slice(0, 8), categories: remoteCategories }
            : null
        );
      } catch {
        if (!cancelled) setRemote(null); // backend unavailable → static fallback
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const normalize = useCallback((text: string) => text.toLowerCase().trim(), []);

  const staticCategories: DisplayCategory[] = query.length >= 2
    ? searchableCategories.filter(
        (c) =>
          normalize(c.name).includes(normalize(query)) ||
          normalize(c.description).includes(normalize(query))
      )
    : [];

  const staticProducts: DisplayProduct[] = query.length >= 2
    ? searchableProducts
        .filter(
          (p) =>
            normalize(p.title).includes(normalize(query)) ||
            normalize(p.categoryName).includes(normalize(query)) ||
            normalize(p.description).includes(normalize(query))
        )
        .slice(0, 8)
    : [];

  const displayCategories = remote?.categories.length ? remote.categories : staticCategories;
  const displayProducts = remote?.products.length ? remote.products : staticProducts;
  const hasResults = displayCategories.length > 0 || displayProducts.length > 0;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="mx-auto mt-16 w-full max-w-2xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            {searching ? (
              <Loader2 size={20} className="animate-spin text-slate-400" />
            ) : (
              <Search size={20} className="text-slate-400" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories, gifts..."
              className="min-w-0 flex-1 text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Close search"
            >
              <X size={16} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {query.length < 2 && (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-400">Start typing to search...</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["Acrylic Photo", "Wall Clock", "Keychain", "Name Plate", "Fridge Magnet"].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-600 transition hover:border-[#d90000] hover:text-[#d90000]"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query.length >= 2 && !hasResults && !searching && (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-slate-500">No results for &quot;{query}&quot;</p>
                <p className="mt-1 text-[12px] text-slate-400">Try different keywords or browse categories</p>
              </div>
            )}

            {/* Category Results */}
            {displayCategories.length > 0 && (
              <div className="border-b border-slate-50 p-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Categories</p>
                {displayCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    {cat.image && (
                      <img src={cat.image} alt={cat.name} className="size-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{cat.name}</p>
                      {cat.description && (
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                    <ArrowRight size={14} className="text-slate-300" />
                  </Link>
                ))}
              </div>
            )}

            {/* Product Results */}
            {displayProducts.length > 0 && (
              <div className="p-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Products</p>
                {displayProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/customise/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      className="size-10 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{product.title}</p>
                      {product.categoryName && (
                        <p className="mt-0.5 text-[11px] text-slate-500">{product.categoryName}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-[#d90000]">₹{product.price}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="text-center text-[11px] text-slate-400">
              Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
