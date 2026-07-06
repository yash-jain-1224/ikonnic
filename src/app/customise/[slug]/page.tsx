import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCustomizerPanel } from "@/components/customizer/ProductCustomizerPanel";
import { getProductBySlug } from "@/lib/server-data";
import { ProductSchema } from "@/components/seo/ProductSchema";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { ReviewsSection } from "@/components/product/ReviewsSection";

// Render on demand with ISR instead of prerendering every product at build
// time — prerendering here duplicated the full product fetch fan-out of
// /product/[slug] and helped exhaust the backend's DB connections during
// builds. dynamicParams (default true) serves any slug on first visit.
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: `Customise ${product?.slug === "acrylic-wall-photo-2" ? "Portrait Acrylic Wall Photo" : product?.title ?? "Product"}`,
  };
}

const faqs = [
  { question: "How long does shipping take?", answer: "We usually dispatch within 48 hours. Delivery takes 4-7 business days depending on your location." },
  { question: "Is the acrylic breakable?", answer: "No, our premium acrylic is highly durable and shatter-resistant compared to traditional glass." },
  { question: "How do I mount it on the wall?", answer: "We provide easy-to-use adhesive hooks or premium steel studs depending on the thickness you select. No drill required for adhesive hooks!" },
  { question: "Can I return a personalized item?", answer: "Since products are custom made for you, we don't accept returns. However, if the item arrives damaged or has a defect, we will replace it free of charge." },
];

export default async function CustomisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <ProductSchema product={product} />
      <ProductCustomizerPanel product={product} />

      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
        <ReviewsSection reviews={product.reviews} productName={product.title} productId={product.id} />
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-black text-slate-900">Frequently Asked Questions</h2>
        <FAQAccordion items={faqs} />
      </div>
    </>
  );
}
