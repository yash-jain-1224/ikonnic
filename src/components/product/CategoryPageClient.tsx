"use client";

import { useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Category, Product } from "@/types";
import { FilterPills } from "@/components/ui/FilterPills";
import { ProductGrid } from "@/components/product/ProductGrid";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function productMatchesFilter(product: Product, filter: string) {
  const selected = normalize(filter);
  if (!selected || selected === "all") return true;

  const exactTagMatch = product.filterTags.some((tag) => normalize(tag) === selected);
  if (exactTagMatch) return true;

  return [product.title, product.categoryName, product.description, ...product.filterTags]
    .filter(Boolean)
    .some((value) => normalize(value).includes(selected));
}

function CategoryPageClientInner({ category, products }: { category: Category; products: Product[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const filters = category.filters ?? [];
  const requestedFilter = searchParams.get("filter") || "All";
  const selected = filters.some((filter) => normalize(filter) === normalize(requestedFilter)) ? requestedFilter : "All";

  const setSelected = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "All") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const visibleProducts = useMemo(() => {
    return products.filter((product) => productMatchesFilter(product, selected));
  }, [products, selected]);

  const cappedProducts = useMemo(() => visibleProducts.slice(0, 8), [visibleProducts]);

  return (
    <div className="space-y-7">
      {filters.length ? <FilterPills filters={filters} selected={selected} onChange={setSelected} /> : null}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold text-slate-500">{cappedProducts.length} designs</p>
        {selected !== "All" ? (
          <button type="button" onClick={() => setSelected("All")} className="text-xs font-bold text-ikonnic-red hover:underline">
            Clear filter
          </button>
        ) : null}
      </div>
      {cappedProducts.length ? (
        <ProductGrid products={cappedProducts} />
      ) : (
        <div className="rounded-2xl border border-rosegold-200/60 bg-white py-14 text-center text-sm text-ikonnic-muted">
          No designs match this filter yet.
        </div>
      )}
    </div>
  );
}

export function CategoryPageClient(props: { category: Category; products: Product[] }) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-rosegold-100" />}>
      <CategoryPageClientInner {...props} />
    </Suspense>
  );
}
