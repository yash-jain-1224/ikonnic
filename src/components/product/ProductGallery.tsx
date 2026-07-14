"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, X, ZoomIn } from "lucide-react";
import Link from "next/link";
import { SmartImage } from "@/components/ui/SmartImage";

export type ProductGalleryView = {
  id: string;
  label: string;
  image: string;
  type?: "front-cover" | "back-cover" | "inside-spread" | "preview";
};

type ProductGalleryProps = {
  images?: string[];
  altText: string;
  galleryViews?: ProductGalleryView[];
  editHref?: string;
};

export function ProductGallery({ images, altText, galleryViews, editHref }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const hasSemanticViews = Boolean(galleryViews?.length);
  const galleryItems = hasSemanticViews
    ? galleryViews!
    : (images ?? []).map((image, index) => ({
        id: `image-${index}`,
        label: `Image ${index + 1}`,
        image,
      }));

  if (galleryItems.length === 0) return null;

  const imageCount = galleryItems.length;
  const activeIndex = Math.min(currentIndex, imageCount - 1);
  const currentView = galleryItems[activeIndex];

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (Math.min(prev, imageCount - 1) + 1) % imageCount);
  };
  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (Math.min(prev, imageCount - 1) - 1 + imageCount) % imageCount);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div 
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-rosegold-200/40 bg-white shadow-sm"
        onClick={() => setIsLightboxOpen(true)}
      >
        <SmartImage
          src={currentView.image}
          alt={`${altText} - ${currentView.label}`}
          priority
          wrapperClassName="h-full w-full"
          imageClassName={`h-full w-full transition duration-300 ${
            hasSemanticViews
              ? "object-contain"
              : "object-cover group-hover:scale-105"
          }`}
        />
        {hasSemanticViews ? (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-[#07142f] shadow-sm backdrop-blur-sm">
            {currentView.label}
          </div>
        ) : null}
        <div className="absolute inset-0 grid place-items-center bg-black/0 transition duration-300 group-hover:bg-black/5">
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 opacity-0 shadow-sm backdrop-blur-sm transition duration-300 group-hover:opacity-100">
            <ZoomIn size={14} className="text-slate-700" />
            <span className="text-[11px] font-bold text-slate-700">Click to expand</span>
          </div>
        </div>

        {imageCount > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {imageCount > 1 || editHref ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {galleryItems.map((view, index) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`View ${view.label}`}
              className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                activeIndex === index
                  ? "border-ikonnic-red opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <SmartImage src={view.image} alt="" wrapperClassName="h-full w-full" imageClassName="h-full w-full object-cover" />
            </button>
          ))}
          {editHref ? (
            <Link
              href={editHref}
              className="flex aspect-square w-20 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-rosegold-200 bg-white px-1 text-center text-[#07142f] transition hover:border-ikonnic-red hover:bg-rosegold-50"
              aria-label={`Edit and customize ${altText}`}
            >
              <Pencil size={18} className="text-ikonnic-red" />
              <span className="mt-1 text-[10px] font-black leading-tight">Edit</span>
              <span className="text-[10px] font-bold leading-tight text-slate-500">Customize</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Lightbox */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-6 top-6 grid size-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close fullscreen"
          >
            <X size={24} />
          </button>
          
          <SmartImage
            src={currentView.image}
            alt={`${altText} - ${currentView.label} fullscreen`}
            priority
            wrapperClassName="max-h-[85vh] max-w-[90vw] bg-transparent"
            imageClassName="max-h-[85vh] max-w-[90vw] object-contain"
          />

          {imageCount > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-6 top-1/2 grid size-14 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-6 top-1/2 grid size-14 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronRight size={32} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
                {activeIndex + 1} / {imageCount}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
