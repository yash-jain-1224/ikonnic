import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { ProductSchema } from "@/components/seo/ProductSchema";
import { products } from "@/data/products";
import { getProductBySlug } from "@/lib/server-data";

// Pre-render known products at build time; API-backed pages revalidate via ISR
export const revalidate = 300;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product?.slug === "acrylic-wall-photo-2" ? "Portrait Acrylic Wall Photo" : product?.title ?? "Product",
    description: product?.seoDescription ?? product?.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <ProductSchema product={product} />
      <ProductDetailClient product={product} />
    </>
  );
}
