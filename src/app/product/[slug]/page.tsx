import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { ProductSchema } from "@/components/seo/ProductSchema";
import { productBySlug, products } from "@/data/products";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
  return {
    title: product?.slug === "acrylic-wall-photo-2" ? "Portrait Acrylic Wall Photo" : product?.title ?? "Product",
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <ProductSchema product={product} />
      <ProductDetailClient product={product} />
    </>
  );
}
