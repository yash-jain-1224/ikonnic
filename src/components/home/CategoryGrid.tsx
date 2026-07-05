import { categories } from "@/data/categories";
import { CategoryTile } from "@/components/home/CategoryTile";
import { WHITELISTED_CATEGORY_SLUGS } from "@/config/whitelist";

const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
const whitelistedCategories = WHITELISTED_CATEGORY_SLUGS.flatMap((slug) => {
  const category = categoryBySlug.get(slug);
  return category ? [category] : [];
});

export function CategoryGrid() {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4">
      {whitelistedCategories.map((category, index) => <CategoryTile key={category.slug} category={category} featured={index === 0} priority={index < 4} />)}
    </div>
  );
}
