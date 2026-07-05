import type { Category } from "@/types";
import { categories as staticCategories } from "@/data/categories";
import { CategoryTile } from "@/components/home/CategoryTile";
import { WHITELISTED_CATEGORY_SLUGS } from "@/config/whitelist";

const categoryBySlug = new Map(staticCategories.map((category) => [category.slug, category]));
const defaultCategories = WHITELISTED_CATEGORY_SLUGS.flatMap((slug) => {
  const category = categoryBySlug.get(slug);
  return category ? [category] : [];
});

export function CategoryGrid({ categories = defaultCategories }: { categories?: Category[] }) {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4">
      {categories.map((category, index) => <CategoryTile key={category.slug} category={category} featured={index === 0} priority={index < 4} />)}
    </div>
  );
}
