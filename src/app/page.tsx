import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { TrustPromiseCard } from "@/components/home/TrustPromiseCard";
import { FeaturedProductsCarousel } from "@/components/home/FeaturedProductsCarousel";
import { WhyGiftora } from "@/components/home/WhyGiftora";
import { PageContainer } from "@/components/ui/PageContainer";

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <PageContainer className="py-14 sm:py-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-giftora-red">Made around your memories</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">More Than Décor. It&apos;s Personal.</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            Personalised acrylic photos, wall décor, clocks, frames, albums, keychains, tags, magnets, and gifts—designed to make everyday spaces feel more like yours.
          </p>
        </div>
        <CategoryGrid />
        <FeaturedProductsCarousel />
        <WhyGiftora />
        <div className="mt-14"><TrustPromiseCard /></div>
      </PageContainer>
    </>
  );
}
