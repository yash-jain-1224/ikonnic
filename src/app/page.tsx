import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { TrustPromiseCard } from "@/components/home/TrustPromiseCard";
import { FeaturedProductsCarousel } from "@/components/home/FeaturedProductsCarousel";
import { WhyIkonnic } from "@/components/home/WhyIkonnic";
import { PageContainer } from "@/components/ui/PageContainer";
import { getFeaturedProducts, getHomeCategories } from "@/lib/server-data";

// Revalidate home data every 5 minutes (ISR)
export const revalidate = 300;

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    getHomeCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <>
      <HeroCarousel />
      <PageContainer className="py-14 sm:py-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ikonnic-red">Made around your memories</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-rosegold-900 sm:text-4xl">More Than Décor. It&apos;s Personal.</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Personalised acrylic photos, wall décor, clocks, frames, albums, keychains, tags, magnets, and gifts—designed to make everyday spaces feel more like yours.
          </p>
        </div>
        <CategoryGrid categories={categories} />
        <FeaturedProductsCarousel products={featuredProducts} />
        <WhyIkonnic />
        <div className="mt-14"><TrustPromiseCard /></div>
      </PageContainer>
    </>
  );
}
