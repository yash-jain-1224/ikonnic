"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ImageDown, ShoppingCart, Sparkles } from "lucide-react";
import type { PointerEvent } from "react";
import { useMemo, useRef, useState } from "react";
import type { Product, ProductCustomisation } from "@/types";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { useCartStore } from "@/store/cart";

const sizes = ["8 x 10 in", "12 x 16 in", "16 x 20 in", "24 x 36 in"];
const thicknesses = ["3 mm", "5 mm", "8 mm"];
const frameColors = ["None", "Black", "Gold", "Natural", "White"];
const borders = ["Clean edge", "Soft white", "Double red", "Gallery black"];
const backgrounds = ["Original", "White", "Warm grey", "Blush", "Sky"];

type ImageSize = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseSize(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  const width = match ? Number(match[1]) : 8;
  const height = match ? Number(match[2]) : 10;
  return { width, height };
}

function getBounds(frame: HTMLDivElement | null, naturalSize: ImageSize | null, scale: number) {
  if (!frame || !naturalSize?.width || !naturalSize.height) return { x: 0, y: 0 };
  const rect = frame.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };
  const coverScale = Math.max(rect.width / naturalSize.width, rect.height / naturalSize.height);
  return {
    x: Math.max(0, ((naturalSize.width * coverScale * scale) - rect.width) / 2),
    y: Math.max(0, ((naturalSize.height * coverScale * scale) - rect.height) / 2),
  };
}

export function CustomiseClient({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [previewSize, setPreviewSize] = useState<ImageSize | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#111827");
  const [size, setSize] = useState(sizes[0]);
  const [thickness, setThickness] = useState(thicknesses[0]);
  const [frameColor, setFrameColor] = useState(frameColors[0]);
  const [border, setBorder] = useState(borders[0]);
  const [background, setBackground] = useState(backgrounds[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const optionsPrice = (sizes.indexOf(size) * 150) + (thicknesses.indexOf(thickness) * 80) + (frameColor === "None" ? 0 : 120);
  const discount = product.sale ? 100 : 0;
  const finalPrice = Math.max(0, (product.price + optionsPrice - discount) * quantity);
  const dimensions = useMemo(() => parseSize(size), [size]);

  const clampPosition = (nextPosition: { x: number; y: number }, nextScale = scale) => {
    const bounds = getBounds(previewFrameRef.current, previewSize, nextScale);
    return {
      x: clamp(nextPosition.x, -bounds.x, bounds.x),
      y: clamp(nextPosition.y, -bounds.y, bounds.y),
    };
  };

  const updateScale = (nextScale: number) => {
    const clampedScale = clamp(nextScale, 1, 3);
    setScale(clampedScale);
    setPosition((value) => clampPosition(value, clampedScale));
  };

  const customisationJson = useMemo<ProductCustomisation>(() => ({
    productId: product.id,
    templateId: `${product.categorySlug}-default-template`,
    uploadedImages: [
      {
        originalUrl: preview,
        croppedUrl: preview,
        backgroundRemovedUrl: "",
        position,
        scale,
        rotation,
        crop: { x: 0, y: 0, width: 100, height: 100 },
        qualityScore: preview ? "local-preview-unverified" : "awaiting-upload",
      },
    ],
    texts: text
      ? [
          {
            value: text,
            fontFamily: "Arial",
            fontSize: "24",
            color: textColor,
            position: { x: 50, y: 82 },
            alignment: "center",
            rotation: 0,
          },
        ]
      : [],
    selectedOptions: { size, thickness, frameColor, border, background, quantity, dimensions: `${dimensions.width}x${dimensions.height}` },
    previewImage: preview,
    printFile: "",
    priceSnapshot: {
      basePrice: product.price,
      optionsPrice,
      discount,
      finalPrice,
    },
  }), [background, border, dimensions.height, dimensions.width, discount, finalPrice, frameColor, optionsPrice, position, preview, product.categorySlug, product.id, product.price, quantity, rotation, scale, size, text, textColor, thickness]);

  const readFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = String(reader.result);
      setPreview(previewUrl);
      setPreviewSize(null);
      setPosition({ x: 0, y: 0 });
      setScale(1);

      const image = new Image();
      image.onload = () => setPreviewSize({ width: image.naturalWidth, height: image.naturalHeight });
      image.src = previewUrl;
    };
    reader.readAsDataURL(file);
  };

  const stopDrag = (event?: PointerEvent<HTMLDivElement>) => {
    if (event && dragStateRef.current?.pointerId === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Capture can already be released when the browser cancels a drag.
      }
    }
    dragStateRef.current = null;
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!preview) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!preview || dragStateRef.current?.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStateRef.current.x;
    const deltaY = event.clientY - dragStateRef.current.y;
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setPosition((value) => clampPosition({ x: value.x + deltaX, y: value.y + deltaY }));
  };

  const addToCart = () => {
    addItem({
      productId: product.id,
      productName: product.title,
      slug: product.slug,
      title: product.title,
      category: product.categoryName,
      image: product.image,
      thumbnail: product.image,
      price: product.price + optionsPrice - discount,
      unitPrice: product.price,
      optionsPrice,
      discount,
      tax: 0,
      shippingEstimate: finalPrice >= 999 ? 0 : 99,
      finalTotal: finalPrice,
      quantity,
      selectedOptions: {
        shape: "custom",
        size,
        thickness,
        frameColor,
        border,
        background,
        quantity,
        photos: preview ? "1 photo" : "photo pending",
      },
      uploadedImagePreview: preview,
      uploadedImageReference: preview ? "local-browser-data-url" : "",
      previewImage: preview,
      customisationJson,
    });
    setAdded(true);
  };

  return (
    <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Preview canvas</h2>
              <p className="mt-1 text-xs text-slate-500">Reference-only local preview. Print-file generation is wired as a future API hook.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ikonnic-red px-4 py-2 text-xs font-black text-white">
              <ImageDown size={15} />
              Upload
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
            </label>
          </div>
          <div
            className="mt-5 grid min-h-96 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-rosegold-100"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              readFile(event.dataTransfer.files?.[0]);
            }}
          >
            <div
              ref={previewFrameRef}
              className={`relative flex w-full max-w-2xl touch-none select-none items-center justify-center overflow-hidden bg-white ${preview ? "cursor-grab active:cursor-grabbing" : ""}`}
              style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              onPointerLeave={stopDrag}
              onWheel={(event) => {
                if (!preview) return;
                event.preventDefault();
                updateScale(scale + (event.deltaY < 0 ? 0.08 : -0.08));
              }}
            >
              <img
                src={preview || product.image}
                alt="Custom product preview"
                draggable={false}
                className="pointer-events-none h-full w-full select-none object-cover transition"
                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }}
              />
              {text ? (
                <p className="absolute bottom-8 left-1/2 max-w-[80%] -translate-x-1/2 rounded-full bg-white/85 px-4 py-2 text-center text-lg font-black shadow-sm" style={{ color: textColor }}>
                  {text}
                </p>
              ) : null}
            </div>
          </div>
          {preview ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rosegold-200/40 bg-rosegold-50 p-3">
              <p className="text-xs font-bold text-slate-600">{dimensions.width} x {dimensions.height} inch print area</p>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full border border-rosegold-200/60 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:border-ikonnic-red hover:text-ikonnic-red">
                Replace Photo
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-card">
          <h2 className="text-lg font-black text-slate-950">Text and finishing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px]">
            <label className="text-xs font-bold text-slate-600">Text overlay<input value={text} onChange={(event) => setText(event.target.value)} placeholder="Name, date, or short message" className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" /></label>
            <label className="text-xs font-bold text-slate-600">Text colour<input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-rosegold-200/60 bg-white p-1" /></label>
          </div>
          <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-rosegold-50 px-4 py-2 text-xs font-bold text-slate-600">
            <Sparkles size={15} />
            Background removal API placeholder
          </button>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-rosegold-200/60 bg-white p-5 shadow-card lg:sticky lg:top-20 sm:p-7">
        <h2 className="text-lg font-black text-slate-950">{product.title}</h2>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-ikonnic-red">{product.categoryName}</p>
        <div className="mt-5 space-y-4">
          <OptionGroup label="Size" values={sizes} value={size} onChange={setSize} />
          <OptionGroup label="Thickness" values={thicknesses} value={thickness} onChange={setThickness} />
          <OptionGroup label="Frame colour" values={frameColors} value={frameColor} onChange={setFrameColor} />
          <OptionGroup label="Border" values={borders} value={border} onChange={setBorder} />
          <OptionGroup label="Background" values={backgrounds} value={background} onChange={setBackground} />
          <div className="flex items-center justify-between rounded-xl border border-rosegold-200/40 p-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Quantity</span>
            <QuantitySelector value={quantity} onChange={setQuantity} compact />
          </div>
        </div>
        <dl className="mt-6 space-y-3 border-y border-rosegold-200/40 py-5 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Base</dt><dd className="font-bold">Rs {product.price.toLocaleString("en-IN")}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Options</dt><dd className="font-bold">Rs {optionsPrice.toLocaleString("en-IN")}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-bold">Rs {discount.toLocaleString("en-IN")}</dd></div>
          <div className="flex justify-between text-base"><dt className="font-black">Total</dt><dd className="font-black">Rs {finalPrice.toLocaleString("en-IN")}</dd></div>
        </dl>
        <button type="button" onClick={addToCart} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-6 py-4 text-sm font-black text-white transition hover:bg-rosegold-600">
          <ShoppingCart size={17} /> Add to Cart
        </button>
        <Link href="/checkout" onClick={addToCart} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-ikonnic-red px-6 py-4 text-sm font-black text-ikonnic-red transition hover:bg-rosegold-50">
          Buy Now <ArrowRight size={17} />
        </Link>
        {added ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} />Customisation JSON saved to cart.</p>
            <Link href="/cart" className="mt-2 inline-block font-black underline">View cart</Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function OptionGroup({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset>
      <legend className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((item) => (
          <button key={item} type="button" onClick={() => onChange(item)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${value === item ? "border-ikonnic-red bg-rosegold-50 text-ikonnic-red" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
            {item}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
