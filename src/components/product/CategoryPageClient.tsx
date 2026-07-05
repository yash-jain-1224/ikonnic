"use client";

import { useMemo, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Category, Product } from "@/types";
import { FilterPills } from "@/components/ui/FilterPills";
import { ProductGrid } from "@/components/product/ProductGrid";

function CategoryPageClientInner({ category, products }: { category: Category; products: Product[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const filters = category.filters ?? [];
  const selected = searchParams.get("filter") || "All";

  const setSelected = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === "All") {
      params.delete("filter");
    } else {
      params.set("filter", filter);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const visibleProducts = useMemo(() => {
    if (selected === "All") return products;
    return products.filter((product) =>
      product.filterTags.some((tag) => tag.toLowerCase() === selected.toLowerCase())
    );
  }, [products, selected]);

  const cappedProducts = useMemo(() => visibleProducts.slice(0, 8), [visibleProducts]);

  return (
    <div className="space-y-7">
      {filters.length ? <FilterPills filters={filters} selected={selected} onChange={setSelected} /> : null}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold text-slate-500">{cappedProducts.length} designs</p>
        {selected !== "All" ? (
          <button type="button" onClick={() => setSelected("All")} className="text-xs font-bold text-giftora-red hover:underline">
            Clear filter
          </button>
        ) : null}
      </div>
      {cappedProducts.length ? (
        <ProductGrid products={cappedProducts} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
          No designs match this filter yet.
        </div>
      )}
    </div>
  );
}

export function CategoryPageClient(props: { category: Category; products: Product[] }) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-white" />}>
      <CategoryPageClientInner {...props} />
    </Suspense>
  );
}
