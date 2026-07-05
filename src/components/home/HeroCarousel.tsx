"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { heroSlides } from "@/data/heroSlides";
import { SmartImage } from "@/components/ui/SmartImage";

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % heroSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const move = (direction: number) => setActive((current) => (current + direction + heroSlides.length) % heroSlides.length);
  const slide = heroSlides[active];

  return (
    <section className="relative overflow-hidden bg-[#19191c] text-white">
      <div className="grid min-h-[470px] md:grid-cols-2">
        <div className="relative min-h-[300px] overflow-hidden md:min-h-[470px]">
          <SmartImage
            src={slide.image}
            alt=""
            priority
            wrapperClassName="absolute inset-0 h-full w-full"
            imageClassName="h-full w-full object-cover"
          />
          <button type="button" onClick={() => move(-1)} aria-label="Previous slide" className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/70">
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="relative flex min-h-[360px] items-center justify-center px-8 py-14 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 1, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="max-w-md"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">{active + 1} / {heroSlides.length}</p>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-red-400">{slide.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl">{slide.title}</h1>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-300">{slide.description}</p>
              <Link href={`/category/${slide.categorySlug}`} className="mt-7 inline-flex rounded-full border border-white bg-white px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-giftora-red hover:text-white">
                Shop now
              </Link>
              <div className="mt-8 flex justify-center gap-1.5">
                {heroSlides.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => setActive(index)} aria-label={`Go to slide ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-white" : "w-1.5 bg-slate-600 hover:bg-slate-400"}`} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          <button type="button" onClick={() => move(1)} aria-label="Next slide" className="absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 transition hover:bg-black/70">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
