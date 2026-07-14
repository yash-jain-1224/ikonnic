"use client";

import { Pencil, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductDescriptionContent } from "@/components/product/ProductDescriptionContent";
import { PincodeChecker } from "@/components/product/PincodeChecker";
import { ProductGallery } from "@/components/product/ProductGallery";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getAlbumGalleryViews, getAlbumTemplate } from "@/data/albumTemplates";
import { customizerTemplateById, customizerTemplateByProductSlug } from "@/data/customizerTemplates";
import type { Product } from "@/types";

type SizeOption = {
  label: string;
  price: number;
  disabled?: boolean;
};

const defaultSizeOptions: SizeOption[] = [
  { label: "9x12", price: 699 },
  { label: "12x16", price: 899 },
  { label: "12x18", price: 1099 },
  { label: "15x21", price: 1499 },
  { label: "20x30", price: 2199 },
  { label: "23x35", price: 2999 },
];

const categorySizeFallbacks: Record<string, SizeOption[]> = {
  "personalised-keychains": [
    { label: "2x2", price: 249 },
    { label: "2x3", price: 299 },
  ],
  "acrylic-photo-fridge-magnets": [
    { label: "3x3", price: 299 },
    { label: "4x4", price: 349 },
  ],
  "luggage-tags": [
    { label: "2.5x4", price: 299 },
    { label: "3x5", price: 399 },
  ],
};

const thicknessExtras: Record<string, number> = {
  "3mm": 0,
  "5mm": 0,
  "8mm": 0,
};

const defaultThicknessOptions = ["3mm", "5mm", "8mm"];
const clockThicknessOptions = ["3mm"];

function displayTitle(product: Product) {
  if (product.slug === "acrylic-wall-photo-2") return "Portrait Acrylic Wall Photo";
  return product.title.replace(/\s+\d+$/, "");
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function uniqueImages(product: Product) {
  return Array.from(new Set([product.image, ...(product.gallery ?? [])].filter((image): image is string => Boolean(image))));
}

export function ProductDetailClient({ product }: { product: Product }) {
  const template =
    customizerTemplateByProductSlug[product.slug] ||
    (product.customizerTemplateId ? customizerTemplateById[product.customizerTemplateId] : undefined);
  const albumTemplate = getAlbumTemplate(product);
  const isClockProduct = product.categorySlug === "wall-clocks" || template?.previewType === "clock";

  const sizeOptions = useMemo<SizeOption[]>(() => {
    const source = product.sizeOptions?.length ? product.sizeOptions : template?.sizeOptions;
    if (albumTemplate && !source?.length) {
      return [{ label: "Standard album", price: product.price }];
    }
    if (!source?.length) return categorySizeFallbacks[product.categorySlug] ?? defaultSizeOptions;
    return source.map((option) => {
      const fallback = defaultSizeOptions.find((item) => item.label.toLowerCase() === option.label.toLowerCase());
      const categoryFallback = categorySizeFallbacks[product.categorySlug]?.find((item) => item.label.toLowerCase() === option.label.toLowerCase());
      return {
        label: option.label,
        price: option.priceDelta ?? categoryFallback?.price ?? fallback?.price ?? product.price,
        disabled: option.disabled,
      };
    });
  }, [albumTemplate, product.categorySlug, product.price, product.sizeOptions, template?.sizeOptions]);

  const thicknessOptions = useMemo(() => {
    const source = product.thicknessOptions?.length ? product.thicknessOptions : template?.thicknessOptions;
    if (albumTemplate && !source?.length) return [];
    if ((!source || source.length === 0) && isClockProduct) return clockThicknessOptions;
    const labels = source?.length ? source.map((option) => option.label) : defaultThicknessOptions;
    return labels.filter(Boolean);
  }, [albumTemplate, isClockProduct, product.thicknessOptions, template?.thicknessOptions]);

  const [selectedSize, setSelectedSize] = useState(sizeOptions[0]?.label ?? "9x12");
  const [selectedThickness, setSelectedThickness] = useState(
    thicknessOptions[0] ?? (albumTemplate ? "" : "3mm"),
  );

  const selectedSizePrice = sizeOptions.find((option) => option.label === selectedSize)?.price ?? product.price;
  const albumThicknessPrice = useMemo(() => {
    if (!albumTemplate) return 0;
    const source = product.thicknessOptions?.length
      ? product.thicknessOptions
      : template?.thicknessOptions;
    return source?.find((option) => option.label === selectedThickness)?.priceDelta ?? 0;
  }, [albumTemplate, product.thicknessOptions, selectedThickness, template?.thicknessOptions]);
  const displayedPrice = selectedSizePrice + (albumTemplate ? albumThicknessPrice : thicknessExtras[selectedThickness] ?? 0);
  const compareAtPrice = product.oldPrice && product.oldPrice > displayedPrice ? product.oldPrice : undefined;
  const galleryImages = useMemo(() => uniqueImages(product), [product]);
  const productName = displayTitle(product);
  const albumGalleryViews = albumTemplate ? getAlbumGalleryViews(product) : [];
  const editorHref = albumTemplate
    ? `/customise/${product.slug}?${new URLSearchParams({
        size: selectedSize,
        ...(selectedThickness ? { thickness: selectedThickness } : {}),
      }).toString()}`
    : `/customise/${product.slug}`;

  return (
    <main className="bg-[#f6f6f7] pb-14 pt-6">
      <section className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
        <Breadcrumbs
          items={[
            { label: product.categoryName, href: `/category/${product.categorySlug}` },
            { label: productName },
          ]}
        />

        <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,600px)_minmax(360px,1fr)] lg:items-start">
          <div className="min-w-0">
            <ProductGallery
              images={galleryImages}
              galleryViews={albumGalleryViews.length ? albumGalleryViews : undefined}
              editHref={albumTemplate ? editorHref : undefined}
              altText={productName}
            />
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="space-y-5">
              <div>
                <h1 className="text-[27px] font-black leading-tight tracking-normal text-[#07142f] sm:text-[30px]">
                  {productName}
                </h1>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <span className="text-[31px] font-black leading-none text-ikonnic-red">
                    {formatPrice(displayedPrice)}
                  </span>
                  {compareAtPrice ? (
                    <span className="text-[18px] font-bold leading-none text-slate-500 line-through">
                      {formatPrice(compareAtPrice)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 inline-flex rounded-[9px] border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600">
                  Only {isClockProduct ? 7 : 6} left!
                </div>
              </div>

              {sizeOptions.length ? (
                <div>
                  <h2 className="text-[17px] font-black text-[#07142f]">Size</h2>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {sizeOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => setSelectedSize(option.label)}
                        className={`h-11 rounded-[10px] border px-4 text-[16px] font-black transition ${
                          selectedSize === option.label
                            ? "border-ikonnic-red bg-ikonnic-red text-white"
                            : "border-[#dfe4ec] bg-white text-[#07142f] hover:border-rosegold-300 hover:bg-rosegold-50"
                        } ${option.disabled ? "cursor-not-allowed opacity-45" : ""}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {thicknessOptions.length ? (
                <div>
                  <h2 className="text-[17px] font-black text-[#07142f]">Thickness</h2>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {thicknessOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedThickness(option)}
                        className={`h-11 rounded-[10px] border px-4 text-[16px] font-black uppercase transition ${
                          selectedThickness === option
                            ? "border-ikonnic-red bg-ikonnic-red text-white"
                            : "border-[#dfe4ec] bg-white text-[#07142f] hover:border-rosegold-300 hover:bg-rosegold-50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <Link
                href={editorHref}
                className="flex h-[76px] w-full items-center justify-center gap-3 rounded-[17px] bg-ikonnic-red px-6 text-[22px] font-black text-white shadow-[0_10px_18px_rgba(183,110,121,0.18)] transition hover:bg-rosegold-600 active:scale-[0.99]"
                aria-label={albumTemplate ? `Edit and customize ${productName}` : `Customize and buy ${productName}`}
              >
                <Pencil size={25} />
                {albumTemplate ? "Edit / Customize Album" : "Customize & Buy"}
              </Link>

              <PincodeChecker />

              <div className="grid grid-cols-3 overflow-hidden rounded-[16px] border border-[#edf0f4] bg-white shadow-sm">
                <div className="grid min-h-[116px] place-items-center border-r border-[#edf0f4] px-3 text-center">
                  <div>
                    <span className="mx-auto grid size-[52px] place-items-center rounded-[18px] bg-sky-50 text-sky-500">
                      <Truck size={24} />
                    </span>
                    <p className="mt-3 text-[13px] font-black text-[#07142f]">Free Shipping</p>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Across India</p>
                  </div>
                </div>
                <div className="grid min-h-[116px] place-items-center border-r border-[#edf0f4] px-3 text-center">
                  <div>
                    <span className="mx-auto grid size-[52px] place-items-center rounded-[18px] bg-emerald-50 text-emerald-500">
                      <RefreshCw size={24} />
                    </span>
                    <p className="mt-3 text-[13px] font-black text-[#07142f]">30-Day Returns</p>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Hassle-free</p>
                  </div>
                </div>
                <div className="grid min-h-[116px] place-items-center px-3 text-center">
                  <div>
                    <span className="mx-auto grid size-[52px] place-items-center rounded-[18px] bg-violet-50 text-violet-500">
                      <ShieldCheck size={24} />
                    </span>
                    <p className="mt-3 text-[13px] font-black text-[#07142f]">100% Secure</p>
                    <p className="mt-1 text-[12px] font-semibold text-slate-500">Encrypted checkout</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-8">
          <ProductDescriptionContent product={product} />
        </section>
      </section>
    </main>
  );
}
