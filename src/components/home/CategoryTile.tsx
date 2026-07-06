import Link from "next/link";
import type { Category } from "@/types";
import { SmartImage } from "@/components/ui/SmartImage";

export function CategoryTile({ category, featured = false, priority = false }: { category: Category; featured?: boolean; priority?: boolean }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={`group relative overflow-hidden rounded-2xl bg-rosegold-100 shadow-card ${featured ? "sm:col-span-2 sm:row-span-2" : ""}`}
    >
      <SmartImage
        src={category.image || category.accent}
        alt={category.alt || category.name}
        priority={priority}
        wrapperClassName={featured ? "h-full min-h-72 w-full" : "h-48 w-full sm:h-56"}
        imageClassName="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-12 text-white">
        <h3 className="text-sm font-black sm:text-base">{category.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-white/75">Personalise yours</p>
      </div>
    </Link>
  );
}
