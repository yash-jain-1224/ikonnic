"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { heroSlides } from "@/data/heroSlides";
import { SmartImage } from "@/components/ui/SmartImage";

const stats = [
  { value: "10K+", label: "Happy Customers" },
  { value: "50K+", label: "Prints Delivered" },
  { value: "4.9★", label: "Avg Rating" },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % heroSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const move = (direction: number) => setActive((current) => (current + direction + heroSlides.length) % heroSlides.length);
  const slide = heroSlides[active];

  return (
    <section className="relative h-[85vh] min-h-[560px] max-h-[780px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <SmartImage
          src={slide.image}
          alt=""
          priority
          wrapperClassName="absolute inset-0 h-full w-full"
          imageClassName="h-full w-full object-cover"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-[1240px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-rosegold-300 sm:text-sm">
                {slide.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-black leading-[1.1] text-white sm:text-5xl lg:text-6xl">
                {slide.title}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
                {slide.description}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={`/category/${slide.categorySlug}`}
                  className="inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-bold text-rosegold-900 shadow-lg transition hover:bg-rosegold-100 hover:shadow-xl"
                >
                  Explore Collection
                </Link>
                <Link
                  href="/category/all"
                  className="inline-flex rounded-full border border-white/30 px-7 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/10"
                >
                  View All Products
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stats Bar */}
          <div className="mt-12 flex gap-8 sm:gap-12">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-black text-white sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={() => move(-1)}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 sm:left-6"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => move(1)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 sm:right-6"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {heroSlides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === active
                ? "w-8 bg-white"
                : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
