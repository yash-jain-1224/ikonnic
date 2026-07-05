"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { generateProducts } from "@/data/products";

const allProducts = generateProducts();

export function CrossSellPopup({
  isOpen,
  onClose,
  addedProductId,
  categorySlug,
}: {
  isOpen: boolean;
  onClose: () => void;
  addedProductId: string;
  categorySlug: string;
}) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Find some related products to recommend
  const recommendations = allProducts
    .filter((p) => p.id !== addedProductId && p.categorySlug !== categorySlug)
    .slice(0, 4);

  const nextSlide = () => setActiveSlide((v) => (v + 1) % recommendations.length);
  const prevSlide = () => setActiveSlide((v) => (v === 0 ? recommendations.length - 1 : v - 1));

  const recommendedProduct = recommendations[activeSlide];

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-emerald-50 px-6 py-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>
          <h2 className="mt-4 text-2xl font-black text-[#07142f]">Added to Cart</h2>
          <p className="mt-1 text-sm font-semibold text-emerald-700">Your custom product is safely in your cart.</p>
        </div>

        {recommendedProduct && (
          <div className="bg-slate-50 px-6 py-6">
            <p className="mb-4 text-center text-[12px] font-black uppercase tracking-[0.1em] text-slate-500">
              Frequently Bought Together
            </p>
            <div className="relative">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <img
                  src={recommendedProduct.image}
                  alt={recommendedProduct.title}
                  className="size-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{recommendedProduct.title}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">{recommendedProduct.categoryName}</p>
                  <div className="mt-2 text-sm font-black text-[#d90000]">
                    ₹{recommendedProduct.price}
                  </div>
                </div>
              </div>

              {recommendations.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevSlide}
                    className="absolute -left-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    className="absolute -right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 text-center">
              <Link
                href={`/customise/${recommendedProduct.slug}`}
                onClick={onClose}
                className="text-sm font-bold text-[#d90000] hover:underline"
              >
                View this product
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 p-6 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Continue Shopping
          </button>
          <Link
            href="/cart"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#07142f] py-3.5 text-center text-sm font-black text-white transition hover:bg-[#0f1d3f]"
          >
            View Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
