import type { Product } from "@/types";

export function ProductSchema({ product }: { product: Product }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.image,
    description: product.detailedDescription || product.description,
    sku: product.slug,
    brand: {
      "@type": "Brand",
      name: "Ikonnic"
    },
    offers: {
      "@type": "Offer",
      url: `https://www.ikonnic.com/customise/${product.slug}`,
      priceCurrency: "INR",
      price: product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "89"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
