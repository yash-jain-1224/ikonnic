"use client";

import {
  Box,
  Check,
  CircleHelp,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Upload,
  X,
  Zap,
} from "lucide-react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, ProductCustomisation } from "@/types";
import { useCartStore } from "@/store/cart";
import { customizerTemplateById, customizerTemplateByProductSlug } from "@/data/customizerTemplates";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PincodeChecker } from "@/components/product/PincodeChecker";
import { ConfirmAddToCartOverlay } from "@/components/product/ConfirmAddToCartOverlay";
import { CrossSellPopup } from "@/components/product/CrossSellPopup";
import { ThreeDPreview } from "@/components/customizer/ThreeDPreview";

type SizeOption = {
  label: string;
  price: number;
  disabled?: boolean;
};

type PrintDimensions = {
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
};

type ImageSize = {
  width: number;
  height: number;
};

type ViewOrientationId = "vertical" | "horizontal";
type PreviewShape =
  | "rectangle"
  | "rounded-rectangle"
  | "circle"
  | "heart"
  | "leaf"
  | "diamond"
  | "triangle"
  | "hexagon"
  | "octagon"
  | "penta"
  | "oval"
  | "bean"
  | "balloon"
  | "door"
  | "house"
  | "cloud"
  | "custom";

const defaultSizeOptions: SizeOption[] = [
  { label: "9x12", price: 699 },
  { label: "12x16", price: 899 },
  { label: "12x18", price: 1099 },
  { label: "15x21", price: 1499 },
  { label: "20x30", price: 2199 },
  { label: "23x35", price: 2999 },
  { label: "36x48", price: 0, disabled: true },
];

const thicknessExtras: Record<string, number> = {
  "3mm": 0,
  "5mm": 150,
  "8mm": 300,
};

const defaultThicknessOptions = Object.keys(thicknessExtras);
const previewImageOverscan = 1.2;
const clockThicknessOptions = ["3mm"];
const smallPreviewCategorySlugs = new Set([
  "personalised-keychains",
  "acrylic-photo-fridge-magnets",
  "luggage-tags",
]);

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

const shapeClipPaths: Partial<Record<PreviewShape, string>> = {
  heart: "polygon(50% 94%, 43% 87%, 28% 75%, 15% 62%, 8% 48%, 7% 34%, 11% 21%, 21% 11%, 34% 8%, 44% 12%, 50% 25%, 56% 12%, 66% 8%, 79% 11%, 89% 21%, 93% 34%, 92% 48%, 85% 62%, 72% 75%, 57% 87%)",
  leaf: "ellipse(44% 50% at 52% 50%)",
  circle: "circle(49% at 50% 50%)",
  oval: "ellipse(45% 50% at 50% 50%)",
  diamond: "polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)",
  triangle: "polygon(50% 4%, 96% 92%, 4% 92%)",
  hexagon: "polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%)",
  octagon: "polygon(30% 4%, 70% 4%, 96% 30%, 96% 70%, 70% 96%, 30% 96%, 4% 70%, 4% 30%)",
  penta: "polygon(50% 3%, 96% 38%, 78% 96%, 22% 96%, 4% 38%)",
  bean: "polygon(27% 7%, 62% 5%, 88% 25%, 89% 58%, 66% 91%, 29% 88%, 10% 62%, 10% 28%)",
  balloon: "polygon(50% 3%, 78% 10%, 94% 35%, 89% 64%, 62% 86%, 55% 97%, 45% 97%, 38% 86%, 11% 64%, 6% 35%, 22% 10%)",
  door: "polygon(18% 100%, 18% 24%, 26% 10%, 50% 3%, 74% 10%, 82% 24%, 82% 100%)",
  house: "polygon(50% 3%, 95% 37%, 84% 37%, 84% 96%, 16% 96%, 16% 37%, 5% 37%)",
  cloud: "polygon(22% 72%, 12% 65%, 8% 52%, 14% 39%, 27% 35%, 35% 21%, 51% 19%, 62% 29%, 74% 28%, 87% 40%, 91% 55%, 84% 68%, 68% 73%)",
  "rounded-rectangle": "inset(0 round 16%)",
};

const shapeSvgPaths: Partial<Record<PreviewShape, string>> = {
  heart: "M50 94 C43 87 28 76 16 63 C6 52 4 37 8 25 C12 14 22 8 34 8 C43 8 48 14 50 25 C52 14 57 8 66 8 C78 8 88 14 92 25 C96 37 94 52 84 63 C72 76 57 87 50 94 Z",
  leaf: "M50 96 C18 73 13 33 50 4 C87 33 82 73 50 96 Z",
  circle: "M50 1 A49 49 0 1 1 49.9 1 Z",
  oval: "M50 1 C76 1 92 20 92 50 C92 80 76 99 50 99 C24 99 8 80 8 50 C8 20 24 1 50 1 Z",
  diamond: "M50 2 L98 50 L50 98 L2 50 Z",
  triangle: "M50 4 L96 94 L4 94 Z",
  hexagon: "M25 6 L75 6 L98 50 L75 94 L25 94 L2 50 Z",
  octagon: "M30 4 L70 4 L96 30 L96 70 L70 96 L30 96 L4 70 L4 30 Z",
  penta: "M50 3 L96 38 L78 96 L22 96 L4 38 Z",
  bean: "M29 7 C51 0 78 10 88 29 C101 54 79 91 52 94 C26 97 6 75 9 46 C11 25 15 12 29 7 Z",
  balloon: "M50 3 C75 3 94 20 94 43 C94 63 80 78 61 88 L54 98 L46 98 L39 88 C20 78 6 63 6 43 C6 20 25 3 50 3 Z",
  door: "M18 98 L18 28 C18 12 33 4 50 4 C67 4 82 12 82 28 L82 98 Z",
  house: "M50 4 L96 38 L84 38 L84 96 L16 96 L16 38 L4 38 Z",
  cloud: "M21 73 C10 72 4 63 7 52 C9 43 16 38 26 38 C30 23 43 14 58 20 C66 15 80 22 83 35 C94 39 98 52 92 63 C86 74 76 76 64 73 Z",
  "rounded-rectangle": "M18 1 L82 1 C92 1 99 8 99 18 L99 82 C99 92 92 99 82 99 L18 99 C8 99 1 92 1 82 L1 18 C1 8 8 1 18 1 Z",
};

const colorSwatches = [
  { id: "black", label: "Black", chip: "bg-black", frame: "border-slate-950", preview: "bg-[#ededed]", text: "#111827" },
  { id: "white", label: "White", chip: "bg-white", frame: "border-slate-200", preview: "bg-[#fafafa]", text: "#ffffff" },
  { id: "light-blue", label: "Light Blue", chip: "bg-blue-200", frame: "border-blue-200", preview: "bg-[#f7fbff]", text: "#bfdbfe" },
  { id: "royal-blue", label: "Royal Blue", chip: "bg-blue-600", frame: "border-blue-600", preview: "bg-[#eff6ff]", text: "#2563eb" },
  { id: "navy", label: "Navy", chip: "bg-slate-800", frame: "border-slate-800", preview: "bg-[#f8fafc]", text: "#1e293b" },
  { id: "red", label: "Red", chip: "bg-red-600", frame: "border-red-600", preview: "bg-[#fef2f2]", text: "#dc2626" },
  { id: "maroon", label: "Maroon", chip: "bg-rose-900", frame: "border-rose-900", preview: "bg-[#fff1f2]", text: "#881337" },
  { id: "pink", label: "Pink", chip: "bg-pink-300", frame: "border-pink-300", preview: "bg-[#fdf2f8]", text: "#f9a8d4" },
  { id: "purple", label: "Purple", chip: "bg-purple-600", frame: "border-purple-600", preview: "bg-[#faf5ff]", text: "#9333ea" },
  { id: "emerald", label: "Emerald", chip: "bg-emerald-500", frame: "border-emerald-500", preview: "bg-[#ecfdf5]", text: "#10b981" },
  { id: "forest", label: "Forest Green", chip: "bg-green-800", frame: "border-green-800", preview: "bg-[#f0fdf4]", text: "#166534" },
  { id: "yellow", label: "Yellow", chip: "bg-yellow-400", frame: "border-yellow-400", preview: "bg-[#fefce8]", text: "#facc15" },
  { id: "orange", label: "Orange", chip: "bg-orange-500", frame: "border-orange-500", preview: "bg-[#fff7ed]", text: "#f97316" },
  { id: "brown", label: "Brown", chip: "bg-amber-900", frame: "border-amber-900", preview: "bg-[#fffbeb]", text: "#78350f" },
  { id: "gold", label: "Gold", chip: "bg-yellow-600", frame: "border-yellow-600", preview: "bg-[#fefce8]", text: "#ca8a04" },
  { id: "silver", label: "Silver", chip: "bg-slate-300", frame: "border-slate-300", preview: "bg-[#f8fafc]", text: "#cbd5e1" },
];

const fontOptions = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Pacifico", value: "'Pacifico', cursive" },
  { name: "Great Vibes", value: "'Great Vibes', cursive" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
];

const viewOrientationOptions: { id: ViewOrientationId; label: string }[] = [
  { id: "vertical", label: "Vertical view" },
  { id: "horizontal", label: "Horizontal view" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dimensionsFromSizeLabel(label: string, viewOrientation: ViewOrientationId): PrintDimensions {
  const match = label.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  const parsedWidth = match ? Number(match[1]) : 9;
  const parsedHeight = match ? Number(match[2]) : 12;
  const shortSide = Math.min(parsedWidth, parsedHeight);
  const longSide = Math.max(parsedWidth, parsedHeight);
  const width = viewOrientation === "horizontal" ? longSide : shortSide;
  const height = viewOrientation === "horizontal" ? shortSide : longSide;
  const orientation = width === height ? "square" : width > height ? "landscape" : "portrait";
  return { width, height, orientation };
}

function inferPreviewShape(product: Product, templateShape?: string): PreviewShape {
  const text = `${templateShape ?? ""} ${product.slug} ${product.title}`.toLowerCase();
  if (text.includes("heart")) return "heart";
  if (text.includes("leaf")) return "leaf";
  if (text.includes("diamond")) return "diamond";
  if (text.includes("triangle")) return "triangle";
  if (text.includes("octa")) return "octagon";
  if (text.includes("hexa") || text.includes("hexagon")) return "hexagon";
  if (text.includes("penta")) return "penta";
  if (text.includes("bean")) return "bean";
  if (text.includes("balloon")) return "balloon";
  if (text.includes("cloud")) return "cloud";
  if (text.includes("door")) return "door";
  if (text.includes("house")) return "house";
  if (text.includes("oval")) return "oval";
  if (text.includes("rounded") || text.includes("round-corners") || text.includes("square-round")) return "rounded-rectangle";
  if (text.includes("circle") || /\bround\b/.test(text)) return "circle";
  return templateShape === "custom" ? "custom" : "rectangle";
}

function previewShapeStyle(shape: PreviewShape): CSSProperties {
  const clipPath = shapeClipPaths[shape];
  const svgPath = shapeSvgPaths[shape];
  if (!clipPath && !svgPath) return { borderRadius: shape === "rectangle" ? "18px" : "22px" };
  if (svgPath) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='black' d='${svgPath}'/></svg>`;
    const maskImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    return {
      borderRadius: ["heart", "leaf", "bean", "balloon", "cloud"].includes(shape) ? "0" : "16px",
      clipPath,
      WebkitMaskImage: maskImage,
      maskImage,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskSize: "100% 100%",
      maskSize: "100% 100%",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    };
  }
  return {
    borderRadius: ["heart", "leaf", "bean", "balloon", "cloud"].includes(shape) ? "0" : "16px",
    clipPath,
  };
}

function previewMaxWidth(categorySlug: string, dimensions: PrintDimensions, shape: PreviewShape) {
  if (smallPreviewCategorySlugs.has(categorySlug)) {
    const longSide = Math.max(dimensions.width, dimensions.height);
    if (shape === "heart") return longSide <= 3 ? "400px" : "450px";
    if (shape === "circle") return longSide <= 3 ? "360px" : "420px";
    if (shape === "oval" || dimensions.orientation === "portrait") return longSide <= 3 ? "280px" : "340px";
    return longSide <= 3 ? "330px" : "390px";
  }

  if (dimensions.orientation === "landscape") return "520px";
  if (dimensions.orientation === "square") return "430px";
  return "390px";
}

function getImagePositionBounds(
  frame: HTMLDivElement | null,
  naturalSize: ImageSize | null,
  scale: number,
) {
  if (!frame || !naturalSize?.width || !naturalSize.height) return { x: 0, y: 0 };

  const rect = frame.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };

  const coverScale = Math.max(rect.width / naturalSize.width, rect.height / naturalSize.height);
  const renderedWidth = naturalSize.width * coverScale * scale;
  const renderedHeight = naturalSize.height * coverScale * scale;

  return {
    x: Math.max(0, (renderedWidth - rect.width) / 2),
    y: Math.max(0, (renderedHeight - rect.height) / 2),
  };
}

function clampImagePosition(
  position: { x: number; y: number },
  scale: number,
  frame: HTMLDivElement | null,
  naturalSize: ImageSize | null,
) {
  const bounds = getImagePositionBounds(frame, naturalSize, scale);
  return {
    x: clamp(position.x, -bounds.x, bounds.x),
    y: clamp(position.y, -bounds.y, bounds.y),
  };
}

function displayTitle(product: Product) {
  if (product.slug === "acrylic-wall-photo-2") return "Portrait Acrylic Wall Photo";
  return product.title.replace(/\s+\d+$/, "");
}

export function ProductCustomizerPanel({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const template =
    customizerTemplateByProductSlug[product.slug] ||
    (product.customizerTemplateId ? customizerTemplateById[product.customizerTemplateId] : undefined);
  const isClockProduct = product.categorySlug === "wall-clocks" || template?.previewType === "clock";
  const isSmallPreviewProduct = smallPreviewCategorySlugs.has(product.categorySlug);

  const availableSizeOptions = useMemo<SizeOption[]>(() => {
    const source = product.sizeOptions?.length ? product.sizeOptions : template?.sizeOptions;
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
  }, [product.categorySlug, product.price, product.sizeOptions, template?.sizeOptions]);

  const availableThicknessOptions = useMemo(() => {
    const source = product.thicknessOptions?.length ? product.thicknessOptions : template?.thicknessOptions;
    if ((!source || source.length === 0) && isClockProduct) return clockThicknessOptions;
    const labels = source?.length ? source.map((option) => option.label) : defaultThicknessOptions;
    return labels.filter(Boolean);
  }, [isClockProduct, product.thicknessOptions, template?.thicknessOptions]);

  const [selectedSize, setSelectedSize] = useState(availableSizeOptions[0]?.label ?? "9x12");
  const [selectedThickness, setSelectedThickness] = useState(availableThicknessOptions[0] ?? "3mm");
  const [selectedColor, setSelectedColor] = useState("black");
  const [selectedViewOrientation, setSelectedViewOrientation] = useState<ViewOrientationId>("vertical");
  const [selectedFont, setSelectedFont] = useState(fontOptions[0].value);
  const [uploadedImage, setUploadedImage] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedImageSize, setUploadedImageSize] = useState<ImageSize | null>(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [rotation] = useState(0);
  const [textToolOpen, setTextToolOpen] = useState(false);
  const [textLayer, setTextLayer] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "threeD">("edit");
  const [showWhyIkonnic, setShowWhyIkonnic] = useState(false);
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [showCrossSellPopup, setShowCrossSellPopup] = useState(false);
  const [addToCartError, setAddToCartError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!availableSizeOptions.some((option) => option.label === selectedSize)) {
      setSelectedSize(availableSizeOptions[0]?.label ?? "9x12");
    }
  }, [availableSizeOptions, selectedSize]);

  useEffect(() => {
    if (!availableThicknessOptions.includes(selectedThickness)) {
      setSelectedThickness(availableThicknessOptions[0] ?? "3mm");
    }
  }, [availableThicknessOptions, selectedThickness]);

  const sizePrice = availableSizeOptions.find((option) => option.label === selectedSize)?.price ?? product.price;
  const thicknessExtra = thicknessExtras[selectedThickness] ?? 0;
  const unitPrice = sizePrice + thicknessExtra;
  const compareAtPrice = product.oldPrice && product.oldPrice > unitPrice ? product.oldPrice : unitPrice + 600;
  const activeColor = colorSwatches.find((swatch) => swatch.id === selectedColor) ?? colorSwatches[0];
  const productName = displayTitle(product);
  const previewImageSrc = uploadedImage || (isSmallPreviewProduct ? "" : product.image);
  const showPreviewSelectCta = !uploadedImage && !isSmallPreviewProduct;
  const renderedImageScale = uploadedImage ? imageScale * previewImageOverscan : imageScale;
  const previewShape = useMemo(() => inferPreviewShape(product, template?.shape), [product, template?.shape]);
  const selectedDimensions = useMemo(() => dimensionsFromSizeLabel(selectedSize, selectedViewOrientation), [selectedSize, selectedViewOrientation]);
  const previewOrientation = selectedDimensions.orientation === "landscape" ? "landscape" : selectedDimensions.orientation === "square" ? "square" : "portrait";
  const previewFrameStyle = useMemo<CSSProperties>(() => ({
    aspectRatio: `${selectedDimensions.width} / ${selectedDimensions.height}`,
    maxWidth: previewMaxWidth(product.categorySlug, selectedDimensions, previewShape),
    ...previewShapeStyle(previewShape),
  }), [previewShape, product.categorySlug, selectedDimensions]);

  const mountingText = selectedThickness === "3mm" ? "Ikonnic Adhesive Hooks" : "Premium Steel Studs";

  useEffect(() => {
    if (!uploadedImage) return;
    setImagePosition((position) => clampImagePosition(position, renderedImageScale, previewFrameRef.current, uploadedImageSize));
  }, [renderedImageScale, selectedDimensions, uploadedImage, uploadedImageSize]);

  const customisationJson = useMemo<ProductCustomisation>(() => ({
    productId: product.id,
    templateId: template?.id || product.customizerTemplateId || "generic-custom-product",
    uploadedImages: [
      {
        originalUrl: uploadedImage,
        croppedUrl: uploadedImage,
        backgroundRemovedUrl: "",
        position: imagePosition,
        scale: imageScale,
        rotation,
        crop: { x: 0, y: 0, width: 100, height: 100 },
        qualityScore: uploadedImage ? "local-preview-unverified" : "awaiting-upload",
      },
    ],
    texts: textLayer
      ? [
          {
            value: textLayer,
            fontFamily: selectedFont,
            fontSize: "22",
            color: activeColor.text,
            position: { x: 50, y: 82 },
            alignment: "center",
            rotation: 0,
          },
        ]
      : [],
    selectedOptions: {
      size: selectedSize,
      thickness: selectedThickness,
      frameColor: selectedColor,
      border: selectedColor,
      background: selectedColor,
      quantity: 1,
      orientation: selectedViewOrientation,
      dimensions: `${selectedDimensions.width}x${selectedDimensions.height}`,
      shape: previewShape,
    },
    previewImage: uploadedImage,
    printFile: "",
    priceSnapshot: {
      basePrice: sizePrice,
      optionsPrice: thicknessExtra,
      discount: 0,
      finalPrice: unitPrice,
    },
  }), [imagePosition, imageScale, product.customizerTemplateId, product.id, rotation, selectedColor, selectedDimensions.height, selectedDimensions.width, selectedSize, selectedThickness, selectedFont, selectedViewOrientation, sizePrice, template?.id, textLayer, thicknessExtra, unitPrice, uploadedImage, activeColor, previewShape]);

  const selectFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = String(reader.result);
      setUploadedImage(previewUrl);
      setUploadedFileName(file.name);
      setUploadedImageSize(null);
      setImagePosition({ x: 0, y: 0 });
      setImageScale(1);
      setAddToCartError("");

      const image = new Image();
      image.onload = () => {
        setUploadedImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.src = previewUrl;
    };
    reader.readAsDataURL(file);
  };

  const updateImageScale = (nextScale: number) => {
    const scale = clamp(nextScale, 1, 3);
    setImageScale(scale);
    setImagePosition((position) => clampImagePosition(position, scale * previewImageOverscan, previewFrameRef.current, uploadedImageSize));
  };

  const stopPhotoDrag = (event?: PointerEvent<HTMLDivElement>) => {
    if (event && dragStateRef.current?.pointerId === event.pointerId) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released if the browser cancels the gesture.
      }
    }
    dragStateRef.current = null;
    setDragging(false);
  };

  const handlePhotoPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!uploadedImage) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const handlePhotoPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!uploadedImage || dragStateRef.current?.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStateRef.current.x;
    const deltaY = event.clientY - dragStateRef.current.y;
    dragStateRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };

    setImagePosition((position) => clampImagePosition(
      { x: position.x + deltaX, y: position.y + deltaY },
      renderedImageScale,
      previewFrameRef.current,
      uploadedImageSize,
    ));
  };

  const clearUploadedPhoto = () => {
    setUploadedImage("");
    setUploadedFileName("");
    setUploadedImageSize(null);
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    setTextLayer("");
    setDragging(false);
    dragStateRef.current = null;
  };

  const handlePreAddToCart = () => {
    if (!uploadedImage) {
      setAddToCartError("Please select a photo before adding this custom product to cart.");
      return;
    }
    setAddToCartError("");
    setShowConfirmOverlay(true);
  };

  const confirmAddToCart = () => {
    const id = `ikonnic-custom-${Date.now()}`;
    addItem({
      id,
      productId: product.id,
      productSlug: product.slug,
      productName,
      slug: product.slug,
      title: productName,
      categorySlug: product.categorySlug,
      category: product.categoryName,
      image: uploadedImage,
      thumbnail: uploadedImage,
      price: unitPrice,
      unitPrice,
      finalTotal: unitPrice,
      optionsPrice: thicknessExtra,
      discount: 0,
      quantity: 1,
      selectedSize,
      selectedThickness,
      selectedColor,
      selectedOptions: {
        shape: previewShape,
        size: selectedSize,
        thickness: selectedThickness,
        frameColor: selectedColor,
        border: selectedColor,
        background: selectedColor,
        photos: "1 photo",
        quantity: 1,
        orientation: selectedViewOrientation,
      },
      uploadedImagePreview: uploadedImage,
      uploadedImageReference: uploadedFileName || "local-browser-preview",
      previewImage: uploadedImage,
      customisation: {
        uploadedImages: [
          {
            originalPreviewUrl: uploadedImage,
            position: imagePosition,
            scale: imageScale,
            rotation,
            crop: { x: 0, y: 0, width: 100, height: 100 },
          },
        ],
        selectedOptions: {
          size: selectedSize,
          dimensions: `${selectedDimensions.width}x${selectedDimensions.height}`,
          thickness: selectedThickness,
          color: selectedColor,
          quantity: 1,
          orientation: selectedViewOrientation,
          shape: previewShape,
        },
        priceSnapshot: {
          basePrice: sizePrice,
          optionsPrice: thicknessExtra,
          finalPrice: unitPrice,
        },
      },
      customisationJson,
    });
    setShowCrossSellPopup(true);
  };

  return (
    <div className="relative min-h-[calc(100vh-68px)] bg-[#f4f5f7] text-[#07142f]">
      <button
        type="button"
        onClick={() => setShowWhyIkonnic(true)}
        className="fixed left-2 top-[38vh] z-40 hidden rounded-full border border-[#ffb4b4] bg-white px-2.5 py-3 text-[12px] font-extrabold text-[#d90000] shadow-[0_8px_22px_rgba(15,23,42,0.14)] transition hover:bg-red-50 xl:flex"
        style={{ writingMode: "vertical-rl" }}
      >
        <CircleHelp className="mb-1" size={14} />
        Why Ikonnic?
      </button>

      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[600px_1fr]">
        <section className="min-w-0 space-y-3">
          <Breadcrumbs
            items={[
              { label: "Shop", href: "/shop" },
              { label: product.categoryName, href: `/category/${product.categorySlug}` },
              { label: productName },
            ]}
          />

          <div className="flex min-h-[64px] w-full flex-wrap items-center gap-3 rounded-[14px] border border-[#dfe4ec] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            {!isClockProduct ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#d90000] px-5 text-[17px] font-black text-white shadow-sm transition hover:bg-[#c90000] active:scale-[0.99]"
              >
                <Upload size={23} />
                Select Photo
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTextToolOpen((value) => !value)}
              aria-pressed={textToolOpen}
              className={`grid size-12 place-items-center rounded-xl text-[#07142f] transition hover:bg-rosegold-100 ${textToolOpen ? "bg-rosegold-50 ring-2 ring-blue-600" : ""}`}
            >
              <span className="relative text-[30px] font-black leading-none">A<span className="absolute -right-2 bottom-0 grid size-4 place-items-center rounded-full border border-[#07142f] bg-white text-[11px] leading-none">+</span></span>
            </button>
            {isClockProduct ? (
              <button
                type="button"
                aria-label="Clock face style"
                title="Clock face style"
                className="grid size-12 place-items-center rounded-xl border border-[#dfe4ec] bg-white text-[24px] font-black text-[#07142f] transition hover:bg-rosegold-100"
              >
                12
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {viewOrientationOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-label={option.label}
                      aria-pressed={selectedViewOrientation === option.id}
                      title={option.label}
                      onClick={() => setSelectedViewOrientation(option.id)}
                      className={`grid size-12 place-items-center rounded-[4px] bg-white transition hover:bg-rosegold-100 ${
                        selectedViewOrientation === option.id ? "ring-2 ring-blue-600 ring-offset-2" : ""
                      }`}
                    >
                      {option.id === "vertical" ? (
                        <span className="relative block h-9 w-7 border-[3px] border-slate-950 bg-white shadow-[inset_0_0_0_3px_#ffffff]">
                          <span className="absolute inset-[5px] border-[2px] border-slate-950 bg-white" />
                        </span>
                      ) : (
                        <span className="block h-7 w-9 border border-slate-950 bg-black" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex flex-1 flex-wrap gap-2">
                  {colorSwatches.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      aria-label={swatch.label}
                      onClick={() => setSelectedColor(swatch.id)}
                      title={swatch.label}
                      className={`grid size-8 place-items-center rounded-full border-2 transition hover:scale-110 ${selectedColor === swatch.id ? "border-blue-600 shadow-md" : "border-transparent"}`}
                    >
                      <span className={`block size-6 rounded-full border border-slate-200 ${swatch.chip}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {textToolOpen ? (
            <div className="rounded-[14px] border border-[#dfe4ec] bg-white p-3 shadow-sm space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={textLayer}
                  onChange={(event) => setTextLayer(event.target.value)}
                  placeholder="Add name, date, or short message"
                  className="min-w-0 flex-1 rounded-xl border border-rosegold-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600"
                />
                <button type="button" onClick={() => setTextLayer("")} className="rounded-xl border border-rosegold-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-rosegold-100">
                  Clear
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="flex-1 rounded-xl border border-rosegold-200 px-4 py-2 text-sm font-semibold outline-none focus:border-blue-600"
                  style={{ fontFamily: selectedFont }}
                >
                  {fontOptions.map(font => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {!isClockProduct ? (
            <div className="hidden grid-cols-2 gap-1 rounded-[14px] border border-[#dfe4ec] bg-white p-1 shadow-sm lg:grid">
              <button
                type="button"
                onClick={() => setEditorMode("edit")}
                className={`h-11 rounded-[10px] text-sm font-black transition ${editorMode === "edit" ? "bg-[#07142f] text-white" : "text-slate-500 hover:bg-rosegold-100"}`}
              >
                2D Edit
              </button>
              <button
                type="button"
                onClick={() => setEditorMode("threeD")}
                className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-black transition ${editorMode === "threeD" ? "bg-[#d90000] text-white" : "text-slate-500 hover:bg-red-50 hover:text-[#d90000]"}`}
              >
                <Box size={16} />
                3D Preview
              </button>
            </div>
          ) : null}

          {editorMode === "edit" || !isClockProduct ? (
          <div className={`${editorMode === "threeD" && !isClockProduct ? "grid lg:hidden" : "grid"} min-h-[420px] w-full place-items-center border border-[#edf0f4] bg-[#f7f7f8] px-4 py-7 sm:min-h-[520px] sm:px-8 lg:min-h-[600px]`}>
            <div
              ref={previewFrameRef}
              className={`relative w-[calc(100vw-66px)] touch-none select-none overflow-hidden bg-[#eeeeef] shadow-[0_3px_12px_rgba(15,23,42,0.28)] ${uploadedImage ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""} ${uploadedImage || !previewImageSrc ? `border ${activeColor.frame}` : ""}`}
              style={previewFrameStyle}
              onPointerDown={handlePhotoPointerDown}
              onPointerUp={stopPhotoDrag}
              onPointerCancel={stopPhotoDrag}
              onPointerLeave={stopPhotoDrag}
              onPointerMove={handlePhotoPointerMove}
              onWheel={(event) => {
                if (!uploadedImage) return;
                event.preventDefault();
                updateImageScale(imageScale + (event.deltaY < 0 ? 0.08 : -0.08));
              }}
            >
              {previewImageSrc ? (
                <img
                  src={previewImageSrc}
                  alt={`${productName} preview`}
                  draggable={false}
                  className={`pointer-events-none h-full w-full select-none transition-transform duration-75 ${uploadedImage ? "object-cover" : "object-contain"}`}
                  style={uploadedImage ? { transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${renderedImageScale}) rotate(${rotation}deg)` } : undefined}
                />
              ) : isSmallPreviewProduct ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 z-10 grid cursor-pointer place-items-center"
                  aria-label="Select photo"
                >
                  <span className="rounded-[10px] bg-[#d90000] px-4 py-2.5 text-[13px] font-black uppercase tracking-normal text-white shadow-[0_8px_18px_rgba(217,0,0,0.16)] transition hover:bg-[#c90000] sm:text-[14px]">
                    Upload Photo
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute left-1/2 top-1/2 grid h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[18px] bg-[#d90000] text-left text-[23px] font-black leading-[1.12] text-white transition hover:bg-[#c90000]"
                >
                  <span>SELECT<br />PHOTO</span>
                </button>
              )}
              {showPreviewSelectCta && previewImageSrc ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute left-1/2 top-1/2 z-20 grid h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[14px] bg-[#d90000] text-left text-[16px] font-black leading-[1.1] text-white shadow-[0_8px_18px_rgba(217,0,0,0.16)] transition hover:bg-[#c90000] sm:h-[86px] sm:w-[86px] sm:text-[18px]"
                >
                  <span>SELECT<br />PHOTO</span>
                </button>
              ) : null}
              {!uploadedImage && previewImageSrc ? (
                <span className="absolute bottom-[14%] left-1/2 z-30 -translate-x-1/2 rounded-[2px] bg-white px-1.5 py-0.5 text-[6px] font-black uppercase tracking-tight text-[#d90000] shadow-sm">
                  IKONNIC
                </span>
              ) : null}
              {textLayer ? (
                <div
                  className="absolute bottom-10 left-1/2 z-30 max-w-[82%] -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-center text-lg shadow-sm"
                  style={{ fontFamily: selectedFont, color: activeColor.text }}
                >
                  {textLayer}
                </div>
              ) : null}
              <span className="absolute bottom-1.5 right-2 z-30 text-[7px] font-black uppercase tracking-tight text-[#d90000] opacity-55">IKONNIC</span>
            </div>
          </div>
          ) : null}

          {(!isClockProduct && editorMode === "edit") || editorMode === "threeD" ? (
            <div className={`${!isClockProduct && editorMode === "edit" ? "block lg:hidden" : "block"} w-full border border-[#edf0f4] bg-[#10131b] p-2 sm:p-3`}>
              <ThreeDPreview
                photoUrl={previewImageSrc}
                thicknessMm={parseInt(selectedThickness, 10) || 3}
                borderColor={selectedColor}
                textOverlay={textLayer || undefined}
                previewType={template?.previewType}
                orientation={previewOrientation}
                shape={previewShape}
                mode="inline"
              />
            </div>
          ) : null}

          {isClockProduct ? (
            <button
              type="button"
              onClick={() => setEditorMode((mode) => mode === "threeD" ? "edit" : "threeD")}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-[10px] border border-[#dfe4ec] bg-white text-[17px] font-black text-[#07142f] shadow-sm transition hover:border-red-200 hover:text-[#d90000]"
            >
              <Box size={18} />
              {editorMode === "threeD" ? "Back to 2D Edit" : "Show 3D Preview"}
            </button>
          ) : null}

          {uploadedImage ? (
            <div className="flex flex-col gap-3 rounded-[14px] border border-[#dfe4ec] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#07142f]">{uploadedFileName || "Uploaded photo"}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{selectedDimensions.width} x {selectedDimensions.height} inch print area</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-[#dfe4ec] bg-white px-4 py-2 text-xs font-black text-[#07142f] hover:border-red-200 hover:bg-red-50">
                  Replace Photo
                </button>
                <button type="button" onClick={clearUploadedPhoto} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-[#d90000] hover:bg-red-100">
                  Remove Photo
                </button>
              </div>
            </div>
          ) : null}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
        </section>

        <aside className="min-w-0 pt-0 lg:pt-1">
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.03em] text-[#07142f] sm:text-[30px]">{productName}</h1>
          {template && !isClockProduct ? (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              <span className="rounded-full border border-rosegold-200/60 bg-white px-3 py-1.5">{template.productType}</span>
              <span className="rounded-full border border-rosegold-200/60 bg-white px-3 py-1.5">{template.previewType}</span>
              {template.orientation ? <span className="rounded-full border border-rosegold-200/60 bg-white px-3 py-1.5">{template.orientation}</span> : null}
            </div>
          ) : null}

          <div className="mt-7 flex items-baseline gap-3">
            <strong className="text-[30px] font-black leading-none text-[#d90000]">{"\u20B9"}{unitPrice.toLocaleString("en-IN")}</strong>
            <del className="text-[17px] font-bold text-slate-500">{"\u20B9"}{compareAtPrice.toLocaleString("en-IN")}</del>
          </div>

          <div className="mt-5 inline-flex rounded-[9px] border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600">Only {isClockProduct ? 7 : 6} left!</div>

          <fieldset className="mt-6">
            <legend className="text-[17px] font-black text-[#07142f]">Size (Inch)</legend>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {availableSizeOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => setSelectedSize(option.label)}
                  className={`h-[42px] min-w-[70px] rounded-[9px] px-3 text-[17px] font-extrabold transition ${
                    option.disabled
                      ? "cursor-not-allowed bg-white/70 text-slate-300 line-through"
                      : selectedSize === option.label
                        ? "bg-[#d90000] text-white shadow-sm"
                        : "border border-[#dfe4ec] bg-white text-[#07142f] hover:border-red-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">{selectedDimensions.width} x {selectedDimensions.height} inch</p>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-[17px] font-black text-[#07142f]">Thickness (mm)</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {availableThicknessOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedThickness(option)}
                  className={`h-[42px] rounded-[9px] px-4 text-[17px] font-extrabold transition ${
                    selectedThickness === option
                      ? "bg-[#d90000] text-white shadow-sm"
                      : "border border-[#dfe4ec] bg-white text-[#07142f] hover:border-red-200"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          {!isClockProduct ? (
            <div className="mt-5 flex min-h-[72px] items-center justify-between rounded-[14px] border border-emerald-200 bg-emerald-50 px-4">
              <div className="flex items-center gap-4">
                <span className="grid size-11 place-items-center rounded-[13px] bg-emerald-100 text-emerald-600">
                  <Zap size={22} />
                </span>
                <div>
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-emerald-600">Easy Mount Included</p>
                  <p className="mt-1 text-sm font-black text-[#07142f]">{mountingText}</p>
                </div>
              </div>
              <Check size={18} className="text-emerald-600" />
            </div>
          ) : null}

          <button
            type="button"
            onClick={handlePreAddToCart}
            className="mt-5 flex h-[74px] w-full items-center justify-center gap-3 rounded-[16px] bg-[#d90000] text-[22px] font-black text-white shadow-[0_12px_22px_rgba(217,0,0,0.18)] transition hover:bg-[#c90000] active:scale-[0.99]"
          >
            <ShoppingCart size={28} />
            Add to Cart
          </button>

          {addToCartError ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-[#d90000]">{addToCartError}</p>
          ) : null}

          <TrustCards />

          <PincodeChecker />
        </aside>
      </div>

      <ConfirmAddToCartOverlay
        isOpen={showConfirmOverlay}
        onClose={() => setShowConfirmOverlay(false)}
        onConfirm={confirmAddToCart}
        productName={productName}
        price={unitPrice}
        selectedOptions={{
          Size: selectedSize,
          Thickness: selectedThickness,
          Color: activeColor.label,
          View: selectedViewOrientation === "horizontal" ? "Horizontal" : "Vertical",
          Font: fontOptions.find(f => f.value === selectedFont)?.name || "Default",
        }}
      />

      <CrossSellPopup
        isOpen={showCrossSellPopup}
        onClose={() => setShowCrossSellPopup(false)}
        addedProductId={product.id}
        categorySlug={product.categorySlug}
      />

      {showWhyIkonnic ? (
        <Modal title="Why Ikonnic?" onClose={() => setShowWhyIkonnic(false)}>
          <div className="grid gap-3">
            {["Premium acrylic finish", "Easy mounting included", "Secure checkout", "Custom made with care"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl bg-rosegold-50 p-3 text-sm font-bold text-[#07142f]">
                <Check className="text-emerald-600" size={18} />
                {item}
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function TrustCards() {
  const cards = [
    { title: "Free Shipping", subtext: "On all orders across India", icon: Truck, wrap: "bg-sky-50 text-sky-500" },
    { title: "30-Day Returns", subtext: "Hassle-free guarantee", icon: RefreshCw, wrap: "bg-emerald-50 text-emerald-500" },
    { title: "100% Secure", subtext: "Encrypted checkout", icon: ShieldCheck, wrap: "bg-violet-50 text-violet-500" },
  ];

  return (
    <div className="mt-5 grid overflow-hidden rounded-[18px] border border-[#e8ebf0] bg-white shadow-[0_3px_14px_rgba(15,23,42,0.07)] sm:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className={`flex flex-col items-center px-4 py-5 text-center ${index > 0 ? "border-t border-[#edf0f4] sm:border-l sm:border-t-0" : ""}`}>
            <span className={`grid size-[60px] place-items-center rounded-[20px] ${card.wrap}`}>
              <Icon size={26} />
            </span>
            <p className="mt-4 text-sm font-black text-[#07142f]">{card.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#07142f]">{title}</h2>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="grid size-9 place-items-center rounded-full bg-rosegold-100 text-slate-600 hover:bg-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
