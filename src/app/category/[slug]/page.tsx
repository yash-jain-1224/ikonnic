import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageContainer } from "@/components/ui/PageContainer";
import { CategoryPageClient } from "@/components/product/CategoryPageClient";
import { categories, categoryMap } from "@/data/categories";
import { productBySlug, productsByCategory } from "@/data/products";
import { CategorySchema } from "@/components/seo/CategorySchema";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { isWhitelistedCategory, WHITELISTED_CATEGORY_SLUGS } from "@/config/whitelist";

export function generateStaticParams() {
  return WHITELISTED_CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryMap[slug];
  return { title: category?.name ?? "Category" };
}

const categoryFaqs = [
  { question: "How is the quality of your personalized items?", answer: "We use state-of-the-art UV printing and high-grade materials to ensure every piece is vibrant and durable." },
  { question: "Can I see a preview before ordering?", answer: "Yes! Our live 3D preview on the product page allows you to see exactly how your image will look before you buy." },
  { question: "Do you offer bulk discounts?", answer: "Yes, we offer volume pricing for corporate gifting and large events. Contact our support team for a quote." },
];

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Guard: only whitelisted categories are accessible
  if (!isWhitelistedCategory(slug)) notFound();

  const category = categoryMap[slug];
  if (!category) notFound();
  const linkedProducts = (category.productSlugs ?? []).flatMap((productSlug) => {
    const product = productBySlug(productSlug);
    return product ? [product] : [];
  });
  const categoryProducts = productsByCategory(slug);
  const visibleProducts = (linkedProducts.length ? linkedProducts : categoryProducts).slice(0, 8);

  return (
    <>
      <CategorySchema category={category} products={visibleProducts} />
      <PageContainer className="py-8 sm:py-10">
        <Breadcrumb current={category.name} />
        <div className="mb-7 mt-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{category.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{category.description}</p>
        </div>
        <CategoryPageClient category={category} products={visibleProducts} />
        
        <div className="mt-20 rounded-3xl bg-slate-50 p-6 sm:p-10">
          <h2 className="mb-6 text-2xl font-black text-slate-900">Questions about {category.name}?</h2>
          <FAQAccordion items={categoryFaqs} />
        </div>
      </PageContainer>
    </>
  );
}
