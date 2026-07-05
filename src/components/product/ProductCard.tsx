import Link from "next/link";
import { Pencil } from "lucide-react";
import type { Product } from "@/types";
import { SmartImage } from "@/components/ui/SmartImage";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const imageSrc = product.image || product.thumbnail || (product.gallery && product.gallery[0]) || `/images/categories/${product.categorySlug}.webp` || "/images/placeholder.webp";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-card">
      {product.sale ? <span className="absolute left-2 top-2 z-10 rounded-md bg-ikonnic-red px-2 py-1 text-[10px] font-black text-white">SALE</span> : null}
      <Link href={`/product/${product.slug}`} className="block overflow-hidden bg-slate-50">
        <SmartImage
          src={imageSrc}
          alt={product.alt || product.title || product.categoryName}
          priority={priority}
          wrapperClassName="aspect-[4/3] w-full"
          imageClassName="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="p-3">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 min-h-9 text-xs font-bold leading-4 text-slate-800 hover:text-ikonnic-red">
          {product.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-1.5 text-xs">
          <span className="text-slate-500">Starts from</span>
          <strong className="text-sm text-slate-950">₹{product.price.toLocaleString("en-IN")}</strong>
          {product.oldPrice ? <del className="text-[11px] text-slate-400">₹{product.oldPrice.toLocaleString("en-IN")}</del> : null}
        </div>
        <Link href={`/customise/${product.slug}`} className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-black tracking-wide text-ikonnic-red transition hover:bg-ikonnic-red hover:text-white">
          <Pencil size={11} /> CUSTOMISE
        </Link>
      </div>
    </article>
  );
}
