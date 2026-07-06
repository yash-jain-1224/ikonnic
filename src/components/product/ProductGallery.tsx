"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";

export function ProductGallery({ images, altText }: { images: string[]; altText: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  if (!images || images.length === 0) return null;

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div 
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-rosegold-200/40 bg-white shadow-sm"
        onClick={() => setIsLightboxOpen(true)}
      >
        <SmartImage
          src={images[currentIndex]}
          alt={`${altText} - Image ${currentIndex + 1}`}
          priority
          wrapperClassName="h-full w-full"
          imageClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 grid place-items-center bg-black/0 transition duration-300 group-hover:bg-black/5">
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 opacity-0 shadow-sm backdrop-blur-sm transition duration-300 group-hover:opacity-100">
            <ZoomIn size={14} className="text-slate-700" />
            <span className="text-[11px] font-bold text-slate-700">Click to expand</span>
          </div>
        </div>

        {images.length > 1 && (
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
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                currentIndex === index
                  ? "border-[#d90000] opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <SmartImage src={image} alt="" wrapperClassName="h-full w-full" imageClassName="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

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
            src={images[currentIndex]}
            alt={`${altText} - Fullscreen`}
            priority
            wrapperClassName="max-h-[85vh] max-w-[90vw] bg-transparent"
            imageClassName="max-h-[85vh] max-w-[90vw] object-contain"
          />

          {images.length > 1 && (
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
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
