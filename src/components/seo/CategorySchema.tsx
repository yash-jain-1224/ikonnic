import type { Category, Product } from "@/types";

export function CategorySchema({ category, products }: { category: Category; products: Product[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "url": `https://ikonnic.com/category/${category.slug}`,
    "name": category.name,
    "description": category.description,
    "itemListElement": products.map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "url": `https://ikonnic.com/customise/${product.slug}`,
        "name": product.title,
        "image": product.image,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "INR",
          "price": product.price
        }
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
