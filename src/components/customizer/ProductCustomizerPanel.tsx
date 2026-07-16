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
import type { CSSProperties, PointerEvent, ReactNode, ComponentType } from "react";
import { useEffect, useMemo, useRef, useState, Component } from "react";
import type {
  CustomizerTemplate,
  Product,
  ProductCustomisation,
} from "@/types";

// Error Boundary for ThreeDPreview to prevent WebGL/GPU crashes from breaking the whole page
class ThreeDErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}
import { useCartStore } from "@/store/cart";
import { uploadAPI } from "@/lib/api";
import {
  customizerTemplateById,
  customizerTemplateByProductSlug,
} from "@/data/customizerTemplates";
import {
  getAlbumCoverLayout,
  getAlbumCoverSlotCount,
} from "@/data/albumCoverLayouts";
import type { AlbumCoverLayout } from "@/data/albumCoverLayouts";
import {
  getFramePhotoLayout,
  type FramePhotoLayout,
} from "@/data/framePhotoLayouts";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PincodeChecker } from "@/components/product/PincodeChecker";
import { ConfirmAddToCartOverlay } from "@/components/product/ConfirmAddToCartOverlay";
import { CrossSellPopup } from "@/components/product/CrossSellPopup";
import { ProductDescriptionContent } from "@/components/product/ProductDescriptionContent";
import { ThreeDPreview } from "@/components/customizer/ThreeDPreview";
import { AlbumCustomizerPanel } from "@/components/customizer/AlbumCustomizerPanel";
import { isAlbumProduct } from "@/data/albumTemplates";

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

type UploadedPhotoSlot = {
  url: string;
  remoteUrl: string;
  storageKey: string;
  fileName: string;
  file: File | null;
  uploadId: string;
  naturalSize: ImageSize | null;
  position: { x: number; y: number };
  scale: number;
};

type CustomiserUploadResult = {
  key: string;
  url: string;
  cdnUrl?: string;
  originalName: string;
  mimeType: string;
  size: number;
};

type CustomiserUploadSession = {
  sessionToken: string;
  uploads: Array<{
    key: string;
    uploadUrl: string;
    contentType: string;
    role: "original" | "preview";
  }>;
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

const MAX_CUSTOMISER_FILE_SIZE = 15 * 1024 * 1024;
const SUPPORTED_CUSTOMISER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const CUSTOMISER_IMAGE_ACCEPT = Array.from(
  SUPPORTED_CUSTOMISER_IMAGE_TYPES,
).join(",");

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
const framePreviewOrientationCategorySlugs = new Set([
  "aluminium-framed-acrylic-photo",
  "acrylic-wall-photo",
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
  heart:
    "polygon(50% 94%, 43% 87%, 28% 75%, 15% 62%, 8% 48%, 7% 34%, 11% 21%, 21% 11%, 34% 8%, 44% 12%, 50% 25%, 56% 12%, 66% 8%, 79% 11%, 89% 21%, 93% 34%, 92% 48%, 85% 62%, 72% 75%, 57% 87%)",
  leaf: "ellipse(44% 50% at 52% 50%)",
  circle: "circle(49% at 50% 50%)",
  oval: "ellipse(45% 50% at 50% 50%)",
  diamond: "polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)",
  triangle: "polygon(50% 4%, 96% 92%, 4% 92%)",
  hexagon: "polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%)",
  octagon:
    "polygon(30% 4%, 70% 4%, 96% 30%, 96% 70%, 70% 96%, 30% 96%, 4% 70%, 4% 30%)",
  penta: "polygon(50% 3%, 96% 38%, 78% 96%, 22% 96%, 4% 38%)",
  bean: "polygon(27% 7%, 62% 5%, 88% 25%, 89% 58%, 66% 91%, 29% 88%, 10% 62%, 10% 28%)",
  balloon:
    "polygon(50% 3%, 78% 10%, 94% 35%, 89% 64%, 62% 86%, 55% 97%, 45% 97%, 38% 86%, 11% 64%, 6% 35%, 22% 10%)",
  door: "polygon(18% 100%, 18% 24%, 26% 10%, 50% 3%, 74% 10%, 82% 24%, 82% 100%)",
  house: "polygon(50% 3%, 95% 37%, 84% 37%, 84% 96%, 16% 96%, 16% 37%, 5% 37%)",
  cloud:
    "polygon(22% 72%, 12% 65%, 8% 52%, 14% 39%, 27% 35%, 35% 21%, 51% 19%, 62% 29%, 74% 28%, 87% 40%, 91% 55%, 84% 68%, 68% 73%)",
  "rounded-rectangle": "inset(0 round 16%)",
};

const shapeSvgPaths: Partial<Record<PreviewShape, string>> = {
  heart:
    "M50 94 C43 87 28 76 16 63 C6 52 4 37 8 25 C12 14 22 8 34 8 C43 8 48 14 50 25 C52 14 57 8 66 8 C78 8 88 14 92 25 C96 37 94 52 84 63 C72 76 57 87 50 94 Z",
  leaf: "M50 96 C18 73 13 33 50 4 C87 33 82 73 50 96 Z",
  circle: "M50 1 A49 49 0 1 1 49.9 1 Z",
  oval: "M50 1 C76 1 92 20 92 50 C92 80 76 99 50 99 C24 99 8 80 8 50 C8 20 24 1 50 1 Z",
  diamond: "M50 2 L98 50 L50 98 L2 50 Z",
  triangle: "M50 4 L96 94 L4 94 Z",
  hexagon: "M25 6 L75 6 L98 50 L75 94 L25 94 L2 50 Z",
  octagon: "M30 4 L70 4 L96 30 L96 70 L70 96 L30 96 L4 70 L4 30 Z",
  penta: "M50 3 L96 38 L78 96 L22 96 L4 38 Z",
  bean: "M29 7 C51 0 78 10 88 29 C101 54 79 91 52 94 C26 97 6 75 9 46 C11 25 15 12 29 7 Z",
  balloon:
    "M50 3 C75 3 94 20 94 43 C94 63 80 78 61 88 L54 98 L46 98 L39 88 C20 78 6 63 6 43 C6 20 25 3 50 3 Z",
  door: "M18 98 L18 28 C18 12 33 4 50 4 C67 4 82 12 82 28 L82 98 Z",
  house: "M50 4 L96 38 L84 38 L84 96 L16 96 L16 38 L4 38 Z",
  cloud:
    "M21 73 C10 72 4 63 7 52 C9 43 16 38 26 38 C30 23 43 14 58 20 C66 15 80 22 83 35 C94 39 98 52 92 63 C86 74 76 76 64 73 Z",
  "rounded-rectangle":
    "M18 1 L82 1 C92 1 99 8 99 18 L99 82 C99 92 92 99 82 99 L18 99 C8 99 1 92 1 82 L1 18 C1 8 8 1 18 1 Z",
};

const colorSwatches = [
  {
    id: "black",
    label: "Black",
    chip: "bg-black",
    frame: "border-slate-950",
    preview: "bg-[#ededed]",
    text: "#111827",
  },
  {
    id: "white",
    label: "White",
    chip: "bg-white",
    frame: "border-slate-200",
    preview: "bg-[#fafafa]",
    text: "#ffffff",
  },
  {
    id: "light-blue",
    label: "Light Blue",
    chip: "bg-blue-200",
    frame: "border-blue-200",
    preview: "bg-[#f7fbff]",
    text: "#bfdbfe",
  },
  {
    id: "royal-blue",
    label: "Royal Blue",
    chip: "bg-blue-600",
    frame: "border-blue-600",
    preview: "bg-[#eff6ff]",
    text: "#2563eb",
  },
  {
    id: "navy",
    label: "Navy",
    chip: "bg-slate-800",
    frame: "border-slate-800",
    preview: "bg-[#f8fafc]",
    text: "#1e293b",
  },
  {
    id: "red",
    label: "Red",
    chip: "bg-red-600",
    frame: "border-red-600",
    preview: "bg-[#fef2f2]",
    text: "#dc2626",
  },
  {
    id: "maroon",
    label: "Maroon",
    chip: "bg-rose-900",
    frame: "border-rose-900",
    preview: "bg-[#fff1f2]",
    text: "#881337",
  },
  {
    id: "pink",
    label: "Pink",
    chip: "bg-pink-300",
    frame: "border-pink-300",
    preview: "bg-[#fdf2f8]",
    text: "#f9a8d4",
  },
  {
    id: "purple",
    label: "Purple",
    chip: "bg-purple-600",
    frame: "border-purple-600",
    preview: "bg-[#faf5ff]",
    text: "#9333ea",
  },
  {
    id: "emerald",
    label: "Emerald",
    chip: "bg-emerald-500",
    frame: "border-emerald-500",
    preview: "bg-[#ecfdf5]",
    text: "#10b981",
  },
  {
    id: "forest",
    label: "Forest Green",
    chip: "bg-green-800",
    frame: "border-green-800",
    preview: "bg-[#f0fdf4]",
    text: "#166534",
  },
  {
    id: "yellow",
    label: "Yellow",
    chip: "bg-yellow-400",
    frame: "border-yellow-400",
    preview: "bg-[#fefce8]",
    text: "#facc15",
  },
  {
    id: "orange",
    label: "Orange",
    chip: "bg-orange-500",
    frame: "border-orange-500",
    preview: "bg-[#fff7ed]",
    text: "#f97316",
  },
  {
    id: "brown",
    label: "Brown",
    chip: "bg-amber-900",
    frame: "border-amber-900",
    preview: "bg-[#fffbeb]",
    text: "#78350f",
  },
  {
    id: "gold",
    label: "Gold",
    chip: "bg-yellow-600",
    frame: "border-yellow-600",
    preview: "bg-[#fefce8]",
    text: "#ca8a04",
  },
  {
    id: "silver",
    label: "Silver",
    chip: "bg-slate-300",
    frame: "border-slate-300",
    preview: "bg-[#f8fafc]",
    text: "#cbd5e1",
  },
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

function emptyPhotoSlot(): UploadedPhotoSlot {
  return {
    url: "",
    remoteUrl: "",
    storageKey: "",
    fileName: "",
    file: null,
    uploadId: "",
    naturalSize: null,
    position: { x: 0, y: 0 },
    scale: 1,
  };
}

function inferUploadSlotCount(
  product: Product,
  templateSlots?: number,
  albumProduct = false,
  configuredSlots?: number,
) {
  const text =
    `${product.title} ${product.description} ${product.categoryName}`.toLowerCase();
  const isAlbum =
    albumProduct ||
    product.categorySlug === "photo-albums" ||
    text.includes("album");
  const maxVisibleSlots = isAlbum ? 4 : 12;
  const explicitSlots = Array.from(
    text.matchAll(/\b(\d{1,2})\s*(?:pic|pics|photo|photos)\b/g),
  )
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value <= maxVisibleSlots);
  const artworkSlots = isAlbum
    ? getAlbumCoverSlotCount(product.slug)
    : undefined;
  return clamp(
    artworkSlots ??
      configuredSlots ??
      Math.max(templateSlots ?? 1, ...explicitSlots, 1),
    1,
    maxVisibleSlots,
  );
}

function inferTotalUploadCount(
  product: Product,
  coverSlotCount: number,
  templateSlots?: number,
  albumProduct = false,
) {
  const text =
    `${product.title} ${product.description} ${product.categoryName}`.toLowerCase();
  const explicitLargeCount = Array.from(
    text.matchAll(/\b([1-9]\d{1,2})\s*(?:pic|pics|photo|photos)\b/g),
  )
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

  if (
    albumProduct ||
    product.categorySlug === "photo-albums" ||
    text.includes("album")
  ) {
    return coverSlotCount;
  }

  return Math.max(coverSlotCount, templateSlots ?? 1, ...explicitLargeCount);
}

function dimensionsFromSizeLabel(
  label: string,
  viewOrientation: ViewOrientationId,
): PrintDimensions {
  const match = label.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  const parsedWidth = match ? Number(match[1]) : 9;
  const parsedHeight = match ? Number(match[2]) : 12;
  const shortSide = Math.min(parsedWidth, parsedHeight);
  const longSide = Math.max(parsedWidth, parsedHeight);
  const width = viewOrientation === "horizontal" ? longSide : shortSide;
  const height = viewOrientation === "horizontal" ? shortSide : longSide;
  const orientation =
    width === height ? "square" : width > height ? "landscape" : "portrait";
  return { width, height, orientation };
}

function defaultFramePreviewOrientation(
  product: Product,
  templateOrientation?: CustomizerTemplate["orientation"],
): ViewOrientationId {
  if (!framePreviewOrientationCategorySlugs.has(product.categorySlug)) {
    return "vertical";
  }

  if (templateOrientation === "landscape") return "horizontal";
  if (templateOrientation === "portrait" || templateOrientation === "square") {
    return "vertical";
  }

  const orientationTags = new Set(
    product.filterTags.map((tag) => tag.trim().toLowerCase()),
  );
  if (orientationTags.has("landscape")) return "horizontal";
  if (orientationTags.has("portrait") || orientationTags.has("square")) {
    return "vertical";
  }

  return /\blandscape\b/i.test(`${product.slug} ${product.title}`)
    ? "horizontal"
    : "vertical";
}

function inferPreviewShape(
  product: Product,
  templateShape?: string,
): PreviewShape {
  const text =
    `${templateShape ?? ""} ${product.slug} ${product.title}`.toLowerCase();
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
  if (
    text.includes("rounded") ||
    text.includes("round-corners") ||
    text.includes("square-round")
  )
    return "rounded-rectangle";
  if (text.includes("circle") || /\bround\b/.test(text)) return "circle";
  return templateShape === "custom" ? "custom" : "rectangle";
}

function previewShapeStyle(shape: PreviewShape): CSSProperties {
  const clipPath = shapeClipPaths[shape];
  const svgPath = shapeSvgPaths[shape];
  if (!clipPath && !svgPath)
    return { borderRadius: shape === "rectangle" ? "18px" : "22px" };
  if (svgPath) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path fill='black' d='${svgPath}'/></svg>`;
    const maskImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    return {
      borderRadius: ["heart", "leaf", "bean", "balloon", "cloud"].includes(
        shape,
      )
        ? "0"
        : "16px",
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
    borderRadius: ["heart", "leaf", "bean", "balloon", "cloud"].includes(shape)
      ? "0"
      : "16px",
    clipPath,
  };
}

function previewMaxWidth(
  categorySlug: string,
  dimensions: PrintDimensions,
  shape: PreviewShape,
) {
  if (smallPreviewCategorySlugs.has(categorySlug)) {
    const longSide = Math.max(dimensions.width, dimensions.height);
    if (shape === "heart") return longSide <= 3 ? "400px" : "450px";
    if (shape === "circle") return longSide <= 3 ? "360px" : "420px";
    if (shape === "oval" || dimensions.orientation === "portrait")
      return longSide <= 3 ? "280px" : "340px";
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
  if (!frame || !naturalSize?.width || !naturalSize.height)
    return { x: 0, y: 0 };

  const rect = frame.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };

  const coverScale = Math.max(
    rect.width / naturalSize.width,
    rect.height / naturalSize.height,
  );
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
  if (product.slug === "acrylic-wall-photo-2")
    return "Portrait Acrylic Wall Photo";
  return product.title.replace(/\s+\d+$/, "");
}

const fourPhotoClockSlots = [
  { left: 0.09, top: 0.12, width: 0.32, height: 0.32 },
  { left: 0.59, top: 0.12, width: 0.32, height: 0.32 },
  { left: 0.09, top: 0.6, width: 0.32, height: 0.32 },
  { left: 0.59, top: 0.6, width: 0.32, height: 0.32 },
];

const fourPhotoClockSlotStyles: CSSProperties[] = fourPhotoClockSlots.map(
  (slot) => ({
    left: `${slot.left * 100}%`,
    top: `${slot.top * 100}%`,
    width: `${slot.width * 100}%`,
    height: `${slot.height * 100}%`,
  }),
);

const clockNumeralPositions = [
  { hour: 12, left: 50, top: 5 },
  { hour: 1, left: 75, top: 5 },
  { hour: 2, left: 95, top: 25 },
  { hour: 3, left: 95, top: 50 },
  { hour: 4, left: 95, top: 75 },
  { hour: 5, left: 75, top: 95 },
  { hour: 6, left: 50, top: 95 },
  { hour: 7, left: 25, top: 95 },
  { hour: 8, left: 5, top: 75 },
  { hour: 9, left: 5, top: 50 },
  { hour: 10, left: 5, top: 25 },
  { hour: 11, left: 25, top: 5 },
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadCanvasImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Could not prepare customiser preview"));
    image.src = url;
  });
}

function drawCanvasImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  position: { x: number; y: number },
  scale: number,
) {
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  const targetAspect = width / height;
  const baseWidth = sourceAspect > targetAspect ? height * sourceAspect : width;
  const baseHeight =
    sourceAspect > targetAspect ? height : width / sourceAspect;
  const drawWidth = baseWidth * scale;
  const drawHeight = baseHeight * scale;
  const overflowX = Math.max(0, drawWidth - width);
  const overflowY = Math.max(0, drawHeight - height);
  const drawX =
    x + (width - drawWidth) / 2 - (position.x / 50) * (overflowX / 2);
  const drawY =
    y + (height - drawHeight) / 2 - (position.y / 50) * (overflowY / 2);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

async function createFourPhotoClockPreview(
  slots: UploadedPhotoSlot[],
  rounded: boolean,
) {
  const size = 900;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare clock preview");

  context.clearRect(0, 0, size, size);
  context.save();
  if (rounded) {
    context.beginPath();
    context.roundRect(2, 2, size - 4, size - 4, size * 0.16);
    context.clip();
  }
  context.fillStyle = "#eeeeef";
  context.fillRect(0, 0, size / 2, size / 2);
  context.fillStyle = "#ffffff";
  context.fillRect(size / 2, 0, size / 2, size / 2);
  context.fillStyle = "#fffaf8";
  context.fillRect(0, size / 2, size / 2, size / 2);
  context.fillStyle = "#f4f1f1";
  context.fillRect(size / 2, size / 2, size / 2, size / 2);

  const images = await Promise.all(
    slots.slice(0, 4).map((slot) => loadCanvasImage(slot.url)),
  );
  images.forEach((image, index) => {
    const layout = fourPhotoClockSlots[index];
    const slot = slots[index];
    const x = layout.left * size;
    const y = layout.top * size;
    const width = layout.width * size;
    const height = layout.height * size;
    const radius = Math.min(width, height) * 0.18;
    context.save();
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.clip();
    drawCanvasImageCover(
      context,
      image,
      x,
      y,
      width,
      height,
      slot.position,
      slot.scale,
    );
    context.restore();
    context.strokeStyle = "rgba(255,255,255,0.95)";
    context.lineWidth = 5;
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.stroke();
  });

  context.font = `900 ${Math.round(size * 0.045)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = 3;
  context.strokeStyle = "#07142f";
  context.fillStyle = "#ffffff";
  clockNumeralPositions.forEach(({ hour, left, top }) => {
    const x = size * (left / 100);
    const y = size * (top / 100);
    context.strokeText(String(hour), x, y);
    context.fillText(String(hour), x, y);
  });

  context.strokeStyle = "#ffffff";
  context.lineCap = "round";
  context.lineWidth = 12;
  context.beginPath();
  context.moveTo(size * 0.5, size * 0.5);
  context.lineTo(size * 0.78, size * 0.34);
  context.stroke();
  context.lineWidth = 15;
  context.beginPath();
  context.moveTo(size * 0.5, size * 0.5);
  context.lineTo(size * 0.54, size * 0.39);
  context.stroke();
  context.strokeStyle = "#b76e79";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(size * 0.5, size * 0.5);
  context.lineTo(size * 0.43, size * 0.73);
  context.stroke();
  context.fillStyle = "#b76e79";
  context.beginPath();
  context.arc(size * 0.5, size * 0.5, 12, 0, Math.PI * 2);
  context.fill();
  context.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Could not export clock preview")),
      "image/webp",
      0.86,
    );
  });
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `clock-preview.${extension}`, {
    type: blob.type || "image/png",
  });
}

async function createAlbumCoverPreview(
  backgroundUrl: string,
  slots: UploadedPhotoSlot[],
  layout: AlbumCoverLayout,
  textOverlay?: { value: string; fontFamily: string; color: string },
) {
  const width = 900;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare album preview");

  const [background, photos] = await Promise.all([
    loadCanvasImage(backgroundUrl).catch(() => null),
    Promise.all(
      layout.slots.map((_, index) => loadCanvasImage(slots[index].url)),
    ),
  ]);
  if (background) {
    drawCanvasImageCover(
      context,
      background,
      0,
      0,
      width,
      height,
      { x: 0, y: 0 },
      1,
    );
  } else {
    context.fillStyle = "#fffaf8";
    context.fillRect(0, 0, width, height);
  }

  if (layout.artworkAware === false) {
    context.save();
    context.fillStyle = "rgba(255, 255, 255, 0.94)";
    context.shadowColor = "rgba(15, 23, 42, 0.2)";
    context.shadowBlur = 18;
    context.beginPath();
    context.roundRect(
      width * 0.3,
      height * 0.2,
      width * 0.4,
      height * 0.66,
      18,
    );
    context.fill();
    context.restore();
  }

  layout.slots.forEach((geometry, index) => {
    const photo = photos[index];
    const slot = slots[index];
    const frameWidth = (geometry.width / 100) * width;
    const frameHeight = (geometry.height / 100) * height;
    const centerX = ((geometry.left + geometry.width / 2) / 100) * width;
    const centerY = ((geometry.top + geometry.height / 2) / 100) * height;
    const framed =
      geometry.frameVariant === "polaroid" ||
      geometry.frameVariant === "photo-mat";
    const inset = framed
      ? Math.max(4, Math.min(frameWidth, frameHeight) * 0.035)
      : 0;
    const photoX = -frameWidth / 2 + inset;
    const photoY = -frameHeight / 2 + inset;
    const photoWidth = frameWidth - inset * 2;
    const photoHeight = frameHeight - inset * 2;
    const configuredObjectPosition = geometry.objectPosition?.match(
      /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/,
    );
    const canvasPosition = configuredObjectPosition
      ? {
          x: Number(configuredObjectPosition[1]) - 50,
          y: Number(configuredObjectPosition[2]) - 50,
        }
      : slot.position;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(((geometry.rotation ?? 0) * Math.PI) / 180);
    if (framed) {
      context.fillStyle = "#ffffff";
      context.fillRect(
        -frameWidth / 2,
        -frameHeight / 2,
        frameWidth,
        frameHeight,
      );
    }
    context.save();
    context.beginPath();
    if (geometry.frameVariant === "circle") {
      context.ellipse(0, 0, photoWidth / 2, photoHeight / 2, 0, 0, Math.PI * 2);
    } else {
      const radiusPercent = clamp(
        Number.parseFloat(geometry.borderRadius ?? "6") || 0,
        0,
        50,
      );
      context.roundRect(
        photoX,
        photoY,
        photoWidth,
        photoHeight,
        Math.min(photoWidth, photoHeight) * (radiusPercent / 100),
      );
    }
    context.clip();
    drawCanvasImageCover(
      context,
      photo,
      photoX,
      photoY,
      photoWidth,
      photoHeight,
      canvasPosition,
      slot.scale,
    );
    context.restore();
    context.restore();
  });

  const overlayText = textOverlay?.value.trim().slice(0, 80);
  if (textOverlay && overlayText) {
    let fontSize = 30;
    context.font = `600 ${fontSize}px ${textOverlay.fontFamily}`;
    while (context.measureText(overlayText).width > width * 0.78 && fontSize > 18) {
      fontSize -= 2;
      context.font = `600 ${fontSize}px ${textOverlay.fontFamily}`;
    }
    const textWidth = Math.min(context.measureText(overlayText).width, width * 0.78);
    const pillWidth = textWidth + 36;
    const pillHeight = fontSize + 24;
    const pillX = (width - pillWidth) / 2;
    const pillY = height - pillHeight - 48;
    context.fillStyle = "rgba(255, 255, 255, 0.92)";
    context.beginPath();
    context.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
    context.fill();
    context.fillStyle = textOverlay.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(overlayText, width / 2, pillY + pillHeight / 2, width * 0.78);
  }

  context.fillStyle = "rgba(183, 110, 121, 0.72)";
  context.font = "800 11px Arial, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "alphabetic";
  context.fillText("IKONNIC", width - 14, height - 12);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Could not export album preview")),
      "image/webp",
      0.86,
    );
  });
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `album-preview.${extension}`, {
    type: blob.type || "image/png",
  });
}

async function createFramePhotoPreview(
  backgroundUrl: string,
  slots: UploadedPhotoSlot[],
  layout: FramePhotoLayout,
) {
  const width = 900;
  const height = Math.round(
    width / Math.max(layout.artworkAspectRatio, 0.1),
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare frame preview");

  const [background, photos] = await Promise.all([
    loadCanvasImage(backgroundUrl).catch(() => null),
    Promise.all(
      layout.slots.map((_, index) => loadCanvasImage(slots[index].url)),
    ),
  ]);

  if (background) {
    drawCanvasImageCover(
      context,
      background,
      0,
      0,
      width,
      height,
      { x: 0, y: 0 },
      1,
    );
  } else {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  layout.slots.forEach((geometry, index) => {
    const slot = slots[index];
    const photo = photos[index];
    const x = (geometry.left / 100) * width;
    const y = (geometry.top / 100) * height;
    const slotWidth = (geometry.width / 100) * width;
    const slotHeight = (geometry.height / 100) * height;
    const radiusPercent = clamp(
      Number.parseFloat(geometry.borderRadius ?? "0") || 0,
      0,
      50,
    );
    const radius = Math.min(slotWidth, slotHeight) * (radiusPercent / 100);

    context.save();
    context.beginPath();
    context.roundRect(x, y, slotWidth, slotHeight, radius);
    context.clip();
    drawCanvasImageCover(
      context,
      photo,
      x,
      y,
      slotWidth,
      slotHeight,
      slot.position,
      slot.scale,
    );
    context.restore();
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Could not export frame preview")),
      "image/webp",
      0.86,
    );
  });
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `frame-collage-preview.${extension}`, {
    type: blob.type || "image/png",
  });
}

async function uploadCustomiserFiles(
  productId: string,
  originalFiles: File[],
  previewFile: File,
) {
  const uploadFiles = [...originalFiles, previewFile];
  const { data: sessionData } = await uploadAPI.createCustomiserSession({
    productId,
    files: uploadFiles.map((file, index) => ({
      name: file.name,
      contentType: file.type,
      size: file.size,
      role:
        index === uploadFiles.length - 1
          ? ("preview" as const)
          : ("original" as const),
    })),
  });
  const session = sessionData as CustomiserUploadSession;
  if (
    !session?.sessionToken ||
    session.uploads?.length !== uploadFiles.length
  ) {
    throw new Error("The upload service returned an incomplete session");
  }

  await Promise.all(
    uploadFiles.map(async (file, index) => {
      const upload = session.uploads[index];
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type,
        },
        body: file,
      });
      if (!response.ok) {
        throw new Error(`Photo upload failed with status ${response.status}`);
      }
    }),
  );

  const { data: finalizedData } = await uploadAPI.finalizeCustomiserSession(
    session.sessionToken,
  );
  if (
    !Array.isArray(finalizedData) ||
    finalizedData.length !== uploadFiles.length
  ) {
    throw new Error("The upload service returned incomplete image references");
  }
  const finalized = finalizedData as CustomiserUploadResult[];
  if (
    finalized.some((result) => !result?.key || !(result.cdnUrl || result.url))
  ) {
    throw new Error("The upload service returned invalid image references");
  }

  return {
    originalResults: finalized.slice(0, originalFiles.length),
    previewResult: finalized[originalFiles.length],
  };
}

function ClockHandsOverlay() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible drop-shadow-[0_1px_1px_rgba(15,23,42,0.75)]"
    >
      <line
        x1="50"
        y1="50"
        x2="78"
        y2="34"
        stroke="white"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2="54"
        y2="39"
        stroke="white"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2="43"
        y2="73"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        className="text-ikonnic-red"
      />
      <circle
        cx="50"
        cy="50"
        r="1.35"
        className="fill-ikonnic-red"
        stroke="white"
        strokeWidth="0.55"
      />
    </svg>
  );
}

function ClockNumeralsOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
    >
      {clockNumeralPositions.map(({ hour, left, top }) => (
        <span
          key={hour}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-[clamp(12px,4.6cqw,22px)] font-black leading-none text-white [-webkit-text-stroke:1px_#07142f]"
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          {hour}
        </span>
      ))}
    </div>
  );
}

function FourPhotoClockFace({
  disabled,
  onSelectSlot,
  uploadedPhotoSlots,
}: {
  disabled: boolean;
  onSelectSlot: (index: number) => void;
  uploadedPhotoSlots: UploadedPhotoSlot[];
}) {
  return (
    <div
      className="absolute inset-0 bg-white"
      data-testid="clock-photo-grid"
      style={{ containerType: "inline-size" }}
    >
      <div
        className="absolute inset-0 z-[5] grid grid-cols-2 overflow-hidden"
        aria-hidden="true"
      >
        <span className="bg-[#eeeeef]" />
        <span className="bg-white" />
        <span className="bg-rosegold-50" />
        <span className="bg-[#f4f1f1]" />
      </div>
      <div
        className="absolute inset-0 z-10"
        role="group"
        aria-label="Clock photo slots"
      >
        {fourPhotoClockSlotStyles.map((slotStyle, index) => {
          const slot = uploadedPhotoSlots[index];
          const accessibleLabel = slot?.url
            ? `Replace photo ${index + 1}${slot.fileName ? `, ${slot.fileName}` : ""}`
            : `Add photo ${index + 1}`;

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSlot(index)}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={accessibleLabel}
              data-testid={`clock-photo-slot-${index + 1}`}
              className={`group absolute grid min-h-11 min-w-11 place-items-center overflow-hidden rounded-[18%] border-2 border-white/90 shadow-[0_5px_14px_rgba(15,23,42,0.18)] transition hover:border-rosegold-200 hover:ring-2 hover:ring-rosegold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${slot?.url ? "bg-white" : "bg-ikonnic-red hover:bg-rosegold-600"}`}
              style={slotStyle}
            >
              {slot?.url ? (
                <>
                  <img
                    src={slot.url}
                    alt=""
                    draggable={false}
                    className="h-full w-full select-none object-cover"
                    style={{
                      objectPosition: `${50 + slot.position.x}% ${50 + slot.position.y}%`,
                      transform: `scale(${slot.scale})`,
                      transformOrigin: `${50 + slot.position.x}% ${50 + slot.position.y}%`,
                    }}
                  />
                  <span className="absolute inset-x-0 bottom-0 translate-y-full bg-slate-950/70 px-1 py-1 text-center text-[9px] font-black uppercase tracking-wide text-white transition group-hover:translate-y-0 group-focus-visible:translate-y-0 sm:text-[10px]">
                    Replace
                  </span>
                </>
              ) : (
                <span className="px-1 text-center text-[clamp(13px,6cqw,28px)] font-black uppercase leading-[1.02] text-white">
                  Select
                  <br />
                  Photo
                </span>
              )}
            </button>
          );
        })}
      </div>
      <ClockNumeralsOverlay />
      <ClockHandsOverlay />
    </div>
  );
}

export function ProductCustomizerPanel({
  product,
  initialAlbumOptions,
}: {
  product: Product;
  initialAlbumOptions?: { size?: string; thickness?: string };
}) {
  if (isAlbumProduct(product)) {
    return <AlbumCustomizerPanel product={product} initialOptions={initialAlbumOptions} />;
  }

  return <StandardProductCustomizerPanel product={product} />;
}

function StandardProductCustomizerPanel({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const singleUploadStartSlotRef = useRef(0);
  const template =
    customizerTemplateByProductSlug[product.slug] ||
    (product.customizerTemplateId
      ? customizerTemplateById[product.customizerTemplateId]
      : undefined);
  const framePhotoLayout = getFramePhotoLayout(product.slug);
  const isClockProduct =
    product.categorySlug === "wall-clocks" || template?.previewType === "clock";
  const knownAlbumSlotCount = getAlbumCoverSlotCount(product.slug);
  const albumProductText =
    `${product.categorySlug} ${product.categoryName} ${product.title}`.toLowerCase();
  const isAlbumProduct =
    product.categorySlug === "photo-albums" ||
    template?.previewType === "album" ||
    knownAlbumSlotCount !== undefined ||
    /\b(photo\s*album|photo\s*book|photobook)\b/.test(albumProductText);
  const isSmallPreviewProduct = smallPreviewCategorySlugs.has(
    product.categorySlug,
  );
  const coverSlotCount = useMemo(
    () =>
      inferUploadSlotCount(
        product,
        template?.uploadSlots,
        isAlbumProduct,
        framePhotoLayout?.slots.length,
      ),
    [framePhotoLayout?.slots.length, isAlbumProduct, product, template?.uploadSlots],
  );
  const totalUploadCount = useMemo(
    () =>
      inferTotalUploadCount(
        product,
        coverSlotCount,
        template?.uploadSlots,
        isAlbumProduct,
      ),
    [coverSlotCount, isAlbumProduct, product, template?.uploadSlots],
  );
  const hasBulkUpload = totalUploadCount > 1;

  const availableSizeOptions = useMemo<SizeOption[]>(() => {
    const source = product.sizeOptions?.length
      ? product.sizeOptions
      : template?.sizeOptions;
    if (!source?.length)
      return categorySizeFallbacks[product.categorySlug] ?? defaultSizeOptions;
    return source.map((option) => {
      const fallback = defaultSizeOptions.find(
        (item) => item.label.toLowerCase() === option.label.toLowerCase(),
      );
      const categoryFallback = categorySizeFallbacks[
        product.categorySlug
      ]?.find(
        (item) => item.label.toLowerCase() === option.label.toLowerCase(),
      );
      return {
        label: option.label,
        price:
          option.priceDelta ??
          categoryFallback?.price ??
          fallback?.price ??
          product.price,
        disabled: option.disabled,
      };
    });
  }, [
    product.categorySlug,
    product.price,
    product.sizeOptions,
    template?.sizeOptions,
  ]);

  const availableThicknessOptions = useMemo(() => {
    const source = product.thicknessOptions?.length
      ? product.thicknessOptions
      : template?.thicknessOptions;
    if ((!source || source.length === 0) && isClockProduct)
      return clockThicknessOptions;
    const labels = source?.length
      ? source.map((option) => option.label)
      : defaultThicknessOptions;
    return labels.filter(Boolean);
  }, [isClockProduct, product.thicknessOptions, template?.thicknessOptions]);

  const initialViewOrientation = useMemo(
    () => defaultFramePreviewOrientation(product, template?.orientation),
    [
      product.categorySlug,
      product.filterTags,
      product.slug,
      product.title,
      template?.orientation,
    ],
  );

  const [selectedSize, setSelectedSize] = useState(
    availableSizeOptions[0]?.label ?? "9x12",
  );
  const [selectedThickness, setSelectedThickness] = useState(
    availableThicknessOptions[0] ?? "3mm",
  );
  const [selectedColor, setSelectedColor] = useState("black");
  const [selectedViewOrientation, setSelectedViewOrientation] =
    useState<ViewOrientationId>(initialViewOrientation);
  const [selectedFont, setSelectedFont] = useState(fontOptions[0].value);
  const [activePhotoSlot, setActivePhotoSlot] = useState(0);
  const [uploadedPhotoSlots, setUploadedPhotoSlots] = useState<
    UploadedPhotoSlot[]
  >([]);
  const [rotation] = useState(0);
  const [textToolOpen, setTextToolOpen] = useState(false);
  const [textLayer, setTextLayer] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "threeD">("edit");
  const [showWhyIkonnic, setShowWhyIkonnic] = useState(false);
  const [showConfirmOverlay, setShowConfirmOverlay] = useState(false);
  const [showCrossSellPopup, setShowCrossSellPopup] = useState(false);
  const [addToCartError, setAddToCartError] = useState("");
  const [photoUploadNotice, setPhotoUploadNotice] = useState("");
  const [isPreparingPhotos, setIsPreparingPhotos] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

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

  useEffect(() => {
    setSelectedViewOrientation(initialViewOrientation);
  }, [initialViewOrientation, product.slug]);

  useEffect(() => {
    if (activePhotoSlot >= coverSlotCount) {
      setActivePhotoSlot(coverSlotCount - 1);
    }
  }, [activePhotoSlot, coverSlotCount]);

  const sizePrice =
    availableSizeOptions.find((option) => option.label === selectedSize)
      ?.price ?? product.price;
  const thicknessExtra = thicknessExtras[selectedThickness] ?? 0;
  const unitPrice = sizePrice + thicknessExtra;
  const compareAtPrice =
    product.oldPrice && product.oldPrice > unitPrice
      ? product.oldPrice
      : unitPrice + 600;
  const activeColor =
    colorSwatches.find((swatch) => swatch.id === selectedColor) ??
    colorSwatches[0];
  const productName = displayTitle(product);
  const activeUpload = uploadedPhotoSlots[activePhotoSlot] ?? emptyPhotoSlot();
  const uploadedImage = activeUpload.url;
  const uploadedFileName = activeUpload.fileName;
  const uploadedImageSize = activeUpload.naturalSize;
  const imagePosition = activeUpload.position;
  const imageScale = activeUpload.scale;
  const uploadedPhotoCount = useMemo(
    () =>
      uploadedPhotoSlots
        .slice(0, totalUploadCount)
        .filter((slot) => Boolean(slot?.url)).length,
    [totalUploadCount, uploadedPhotoSlots],
  );
  const uploadedImageEntries = useMemo(
    () =>
      uploadedPhotoSlots.flatMap((slot, index) => {
        if (!slot?.remoteUrl) return [];
        return [
          {
            originalUrl: slot.remoteUrl,
            croppedUrl: slot.remoteUrl,
            backgroundRemovedUrl: "",
            position: slot.position,
            scale: slot.scale,
            rotation,
            crop: { x: 0, y: 0, width: 100, height: 100 },
            qualityScore: "original-upload",
            slot: index + 1,
            storageKey: slot.storageKey,
            originalFileName: slot.fileName,
          },
        ];
      }),
    [rotation, uploadedPhotoSlots],
  );
  const firstUploadedImage = uploadedImageEntries[0]?.originalUrl ?? "";
  const productPreviewImageSrc =
    product.image || product.thumbnail || product.gallery?.[0] || "";
  const previewImageSrc = uploadedImage || productPreviewImageSrc;
  const showPreviewSelectCta =
    !isAlbumProduct && !uploadedImage && Boolean(productPreviewImageSrc);
  const renderedImageScale = uploadedImage
    ? imageScale * previewImageOverscan
    : imageScale;
  const multiPhotoPreview = coverSlotCount > 1;
  const usesSlotPreview = isAlbumProduct || multiPhotoPreview;
  const albumCoverLayout = useMemo(
    () => getAlbumCoverLayout(product.slug, coverSlotCount),
    [coverSlotCount, product.slug],
  );
  const previewShape = useMemo(
    () => inferPreviewShape(product, template?.shape),
    [product, template?.shape],
  );
  const isFourPhotoClock =
    isClockProduct &&
    coverSlotCount === 4 &&
    (previewShape === "rectangle" || previewShape === "rounded-rectangle");
  const hasFramePhotoLayout = Boolean(framePhotoLayout);
  const usesDirectImageUpload =
    isFourPhotoClock || isAlbumProduct || hasFramePhotoLayout;
  const clockPreviewPhotoUrls = useMemo(
    () =>
      Array.from(
        { length: coverSlotCount },
        (_, index) => uploadedPhotoSlots[index]?.url ?? "",
      ),
    [coverSlotCount, uploadedPhotoSlots],
  );
  const clockPreviewPhotoTransforms = useMemo(
    () =>
      Array.from({ length: coverSlotCount }, (_, index) => ({
        position: uploadedPhotoSlots[index]?.position ?? { x: 0, y: 0 },
        scale: uploadedPhotoSlots[index]?.scale ?? 1,
      })),
    [coverSlotCount, uploadedPhotoSlots],
  );
  const customisationPreviewImage = usesDirectImageUpload
    ? product.image
    : firstUploadedImage;
  const slotGridClass =
    coverSlotCount === 1
      ? "grid-cols-1"
      : coverSlotCount <= 2
        ? "grid-cols-2"
        : coverSlotCount <= 4
          ? "grid-cols-2"
          : "grid-cols-3";
  const slotPanelClass = isAlbumProduct
    ? "absolute left-1/2 top-1/2 w-[74%] max-w-[390px] -translate-x-1/2 -translate-y-1/2"
    : "absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5";
  const selectedDimensions = useMemo(
    () => dimensionsFromSizeLabel(selectedSize, selectedViewOrientation),
    [selectedSize, selectedViewOrientation],
  );
  const frameArtworkStageStyle = useMemo<CSSProperties | undefined>(() => {
    if (!framePhotoLayout) return undefined;

    const artworkAspectRatio = framePhotoLayout.artworkAspectRatio;
    const previewAspectRatio =
      selectedDimensions.width / Math.max(selectedDimensions.height, 1);

    if (previewAspectRatio >= artworkAspectRatio) {
      return {
        height: "100%",
        width: `${(artworkAspectRatio / previewAspectRatio) * 100}%`,
      };
    }

    return {
      width: "100%",
      height: `${(previewAspectRatio / artworkAspectRatio) * 100}%`,
    };
  }, [framePhotoLayout, selectedDimensions.height, selectedDimensions.width]);
  const previewOrientation =
    selectedDimensions.orientation === "landscape"
      ? "landscape"
      : selectedDimensions.orientation === "square"
        ? "square"
        : "portrait";
  const previewFrameStyle = useMemo<CSSProperties>(
    () => ({
      aspectRatio: isAlbumProduct
        ? "1 / 1"
        : `${selectedDimensions.width} / ${selectedDimensions.height}`,
      maxWidth: isAlbumProduct
        ? "560px"
        : previewMaxWidth(
            product.categorySlug,
            selectedDimensions,
            previewShape,
          ),
      ...(isAlbumProduct
        ? { borderRadius: "2px" }
        : previewShapeStyle(previewShape)),
      ...(isFourPhotoClock && previewShape === "rectangle"
        ? { borderRadius: "2px" }
        : {}),
    }),
    [
      isAlbumProduct,
      isFourPhotoClock,
      previewShape,
      product.categorySlug,
      selectedDimensions,
    ],
  );

  const mountingText =
    selectedThickness === "3mm"
      ? "Ikonnic Adhesive Hooks"
      : "Premium Steel Studs";

  useEffect(() => {
    if (!uploadedImage || usesSlotPreview) return;
    setActiveSlotPosition((position) =>
      clampImagePosition(
        position,
        renderedImageScale,
        previewFrameRef.current,
        uploadedImageSize,
      ),
    );
  }, [
    renderedImageScale,
    selectedDimensions,
    uploadedImage,
    uploadedImageSize,
    usesSlotPreview,
  ]);

  const updateActivePhotoSlot = (updates: Partial<UploadedPhotoSlot>) => {
    setUploadedPhotoSlots((slots) => {
      const next = [...slots];
      next[activePhotoSlot] = {
        ...(next[activePhotoSlot] ?? emptyPhotoSlot()),
        ...updates,
      };
      return next;
    });
  };

  const setActiveSlotPosition = (
    nextPosition:
      | { x: number; y: number }
      | ((position: { x: number; y: number }) => { x: number; y: number }),
  ) => {
    setUploadedPhotoSlots((slots) => {
      const next = [...slots];
      const current = next[activePhotoSlot] ?? emptyPhotoSlot();
      const position =
        typeof nextPosition === "function"
          ? nextPosition(current.position)
          : nextPosition;
      next[activePhotoSlot] = { ...current, position };
      return next;
    });
  };

  const setActiveSlotScale = (scale: number) => {
    updateActivePhotoSlot({ scale });
  };

  const customisationJson = useMemo<ProductCustomisation>(
    () => ({
      productId: product.id,
      templateId:
        template?.id ||
        product.customizerTemplateId ||
        "generic-custom-product",
      uploadedImages: uploadedImageEntries.length
        ? uploadedImageEntries
        : [
            {
              originalUrl: "",
              croppedUrl: "",
              backgroundRemovedUrl: "",
              position: { x: 0, y: 0 },
              scale: 1,
              rotation,
              crop: { x: 0, y: 0, width: 100, height: 100 },
              qualityScore: "awaiting-upload",
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
      previewImage: customisationPreviewImage,
      printFile: "",
      priceSnapshot: {
        basePrice: sizePrice,
        optionsPrice: thicknessExtra,
        discount: 0,
        finalPrice: unitPrice,
      },
    }),
    [
      activeColor,
      customisationPreviewImage,
      product.customizerTemplateId,
      product.id,
      rotation,
      selectedColor,
      selectedDimensions.height,
      selectedDimensions.width,
      selectedSize,
      selectedThickness,
      selectedFont,
      selectedViewOrientation,
      sizePrice,
      template?.id,
      textLayer,
      thicknessExtra,
      unitPrice,
      uploadedImageEntries,
      previewShape,
    ],
  );

  const selectFiles = async (files: FileList | null, mode: "slot" | "bulk") => {
    if (isPreparingPhotos) return;

    const candidates = Array.from(files ?? []);
    const imageFiles = candidates.filter((file) =>
      SUPPORTED_CUSTOMISER_IMAGE_TYPES.has(file.type),
    );
    const validFiles = imageFiles.filter(
      (file) => file.size <= MAX_CUSTOMISER_FILE_SIZE,
    );
    const notices: string[] = [];

    if (imageFiles.length < candidates.length)
      notices.push(
        "Unsupported files were ignored. Use JPG, PNG, or WebP.",
      );
    if (validFiles.length < imageFiles.length)
      notices.push("Images larger than 15 MB were ignored.");
    if (!validFiles.length) {
      setPhotoUploadNotice(
        notices.join(" ") || "Choose an image file up to 15 MB.",
      );
      return;
    }

    const allSlotIndexes = Array.from(
      { length: totalUploadCount },
      (_, index) => index,
    );
    let slotTargets: number[];
    let selectedFiles: File[];

    if (mode === "bulk") {
      if (validFiles.length >= totalUploadCount) {
        slotTargets = allSlotIndexes;
        selectedFiles = validFiles.slice(0, totalUploadCount);
        if (validFiles.length > totalUploadCount) {
          notices.push(`Only the first ${totalUploadCount} photos were used.`);
        }
      } else {
        const emptySlotIndexes = allSlotIndexes.filter(
          (index) => !uploadedPhotoSlots[index]?.url,
        );
        if (!emptySlotIndexes.length) {
          setPhotoUploadNotice(
            `All photo slots are filled. Tap a photo on the ${isClockProduct ? "clock" : "preview"} to replace it.`,
          );
          return;
        }
        slotTargets = emptySlotIndexes.slice(0, validFiles.length);
        selectedFiles = validFiles.slice(0, slotTargets.length);
        if (validFiles.length > slotTargets.length) {
          notices.push(
            "Extra photos were ignored because every remaining slot is filled.",
          );
        }
      }
    } else {
      const slotIndex = clamp(
        singleUploadStartSlotRef.current,
        0,
        Math.max(coverSlotCount - 1, 0),
      );
      slotTargets = [slotIndex];
      selectedFiles = [validFiles[0]];
    }

    let previewSelections: Array<{
      file: File | null;
      previewUrl: string;
      remoteUrl: string;
      storageKey: string;
      fileName: string;
      slotIndex: number;
      uploadId: string;
    }>;
    try {
      previewSelections = await Promise.all(
        selectedFiles.map(async (file, offset) => {
          const previewUrl = usesDirectImageUpload
            ? URL.createObjectURL(file)
            : await readFileAsDataUrl(file);
          if (previewUrl.startsWith("blob:"))
            objectUrlsRef.current.add(previewUrl);
          return {
            file: usesDirectImageUpload ? file : null,
            previewUrl,
            remoteUrl: usesDirectImageUpload ? "" : previewUrl,
            storageKey: usesDirectImageUpload ? "" : file.name,
            fileName: file.name,
            slotIndex: slotTargets[offset],
            uploadId: `${Date.now()}-${slotTargets[offset]}-${Math.random().toString(36).slice(2, 8)}`,
          };
        }),
      );
    } catch {
      setPhotoUploadNotice(
        "One of the selected photos could not be read. Please try again.",
      );
      return;
    }

    slotTargets.forEach((slotIndex) => {
      const previousUrl = uploadedPhotoSlots[slotIndex]?.url;
      if (previousUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
        objectUrlsRef.current.delete(previousUrl);
      }
    });

    setUploadedPhotoSlots((slots) => {
      const next = [...slots];
      previewSelections.forEach(
        ({
          file,
          previewUrl,
          remoteUrl,
          storageKey,
          fileName,
          slotIndex,
          uploadId,
        }) => {
          next[slotIndex] = {
            ...emptyPhotoSlot(),
            url: previewUrl,
            remoteUrl,
            storageKey,
            fileName,
            file,
            uploadId,
          };
        },
      );
      return next;
    });
    setActivePhotoSlot(Math.min(slotTargets[0], coverSlotCount - 1));
    setAddToCartError("");
    setPhotoUploadNotice(notices.join(" "));

    previewSelections.forEach(({ previewUrl, slotIndex, uploadId }) => {
      const image = new Image();
      image.onload = () => {
        setUploadedPhotoSlots((slots) => {
          const next = [...slots];
          const current = next[slotIndex];
          if (!current || current.uploadId !== uploadId) return slots;
          next[slotIndex] = {
            ...current,
            naturalSize: {
              width: image.naturalWidth,
              height: image.naturalHeight,
            },
          };
          return next;
        });
      };
      image.src = previewUrl;
    });
  };

  const openActivePhotoUpload = () => {
    if (isPreparingPhotos) return;
    singleUploadStartSlotRef.current = activePhotoSlot;
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const openPhotoSlot = (index: number) => {
    if (isPreparingPhotos) return;
    singleUploadStartSlotRef.current = index;
    setActivePhotoSlot(index);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const openBulkUpload = () => {
    if (isPreparingPhotos) return;
    window.setTimeout(() => bulkFileInputRef.current?.click(), 0);
  };

  const updateImageScale = (nextScale: number) => {
    const scale = clamp(nextScale, 1, 3);
    setActiveSlotScale(scale);
    setActiveSlotPosition((position) =>
      clampImagePosition(
        position,
        scale * previewImageOverscan,
        previewFrameRef.current,
        uploadedImageSize,
      ),
    );
  };

  const adjustClockPhotoPosition = (xDelta: number, yDelta: number) => {
    if (!isFourPhotoClock || !uploadedImage) return;
    setActiveSlotPosition((position) => ({
      x: clamp(position.x + xDelta, -50, 50),
      y: clamp(position.y + yDelta, -50, 50),
    }));
  };

  const adjustClockPhotoScale = (delta: number) => {
    if (!isFourPhotoClock || !uploadedImage) return;
    setActiveSlotScale(clamp(imageScale + delta, 1, 2));
  };

  const resetClockPhotoCrop = () => {
    if (!isFourPhotoClock || !uploadedImage) return;
    updateActivePhotoSlot({ position: { x: 0, y: 0 }, scale: 1 });
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
    if (usesSlotPreview) return;
    if (!uploadedImage) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setDragging(true);
  };

  const handlePhotoPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!uploadedImage || dragStateRef.current?.pointerId !== event.pointerId)
      return;
    const deltaX = event.clientX - dragStateRef.current.x;
    const deltaY = event.clientY - dragStateRef.current.y;
    dragStateRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    setActiveSlotPosition((position) =>
      clampImagePosition(
        { x: position.x + deltaX, y: position.y + deltaY },
        renderedImageScale,
        previewFrameRef.current,
        uploadedImageSize,
      ),
    );
  };

  const clearUploadedPhoto = () => {
    const previewUrl = uploadedPhotoSlots[activePhotoSlot]?.url;
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
      objectUrlsRef.current.delete(previewUrl);
    }
    setUploadedPhotoSlots((slots) => {
      const next = [...slots];
      next[activePhotoSlot] = emptyPhotoSlot();
      return next;
    });
    setDragging(false);
    dragStateRef.current = null;
  };

  const handlePreAddToCart = () => {
    if (uploadedPhotoCount < totalUploadCount) {
      setAddToCartError(
        `Please upload ${totalUploadCount} photo${totalUploadCount > 1 ? "s" : ""} before adding this custom product to cart.`,
      );
      return;
    }
    if (
      usesDirectImageUpload &&
      uploadedPhotoSlots.slice(0, coverSlotCount).some((slot) => !slot?.file)
    ) {
      setAddToCartError(
        "One or more photos are not ready. Replace the affected photo and try again.",
      );
      return;
    }
    if (
      !usesDirectImageUpload &&
      uploadedImageEntries.length < totalUploadCount
    ) {
      setAddToCartError(
        "One or more photos are not ready. Replace the affected photo and try again.",
      );
      return;
    }
    setAddToCartError("");
    setShowConfirmOverlay(true);
  };

  const confirmAddToCart = async () => {
    setIsPreparingPhotos(true);
    setAddToCartError("");
    try {
      let preparedImageEntries = uploadedImageEntries;
      let preparedStorageKeys = uploadedPhotoSlots
        .map((slot) => slot?.storageKey)
        .filter(Boolean);
      let cartPreviewImage = firstUploadedImage || product.image;

      if (isFourPhotoClock) {
        const clockSlots = uploadedPhotoSlots.slice(0, 4);
        const originalFiles = clockSlots
          .map((slot) => slot.file)
          .filter((file): file is File => Boolean(file));
        if (originalFiles.length !== 4)
          throw new Error("Four original clock photos are required");
        const previewFile = await createFourPhotoClockPreview(
          clockSlots,
          previewShape === "rounded-rectangle",
        );
        const { originalResults, previewResult } = await uploadCustomiserFiles(
          product.id,
          originalFiles,
          previewFile,
        );
        const preparedSlots = clockSlots.map((slot, index) => ({
          ...slot,
          remoteUrl:
            originalResults[index].cdnUrl || originalResults[index].url,
          storageKey: originalResults[index].key,
        }));
        setUploadedPhotoSlots((slots) => {
          const next = [...slots];
          preparedSlots.forEach((slot, index) => {
            next[index] = slot;
          });
          return next;
        });
        preparedImageEntries = preparedSlots.map((slot, index) => ({
          originalUrl: slot.remoteUrl,
          croppedUrl: slot.remoteUrl,
          backgroundRemovedUrl: "",
          position: slot.position,
          scale: slot.scale,
          rotation,
          crop: { x: 0, y: 0, width: 100, height: 100 },
          qualityScore: "original-upload",
          slot: index + 1,
          storageKey: slot.storageKey,
          originalFileName: slot.fileName,
        }));
        preparedStorageKeys = originalResults.map((result) => result.key);
        cartPreviewImage = previewResult.cdnUrl || previewResult.url;
      } else if (framePhotoLayout) {
        const frameSlots = uploadedPhotoSlots.slice(
          0,
          framePhotoLayout.slots.length,
        );
        const originalFiles = frameSlots
          .map((slot) => slot.file)
          .filter((file): file is File => Boolean(file));
        if (originalFiles.length !== framePhotoLayout.slots.length) {
          throw new Error("Every frame photo is required");
        }
        if (!productPreviewImageSrc) {
          throw new Error("The frame artwork is unavailable");
        }
        const previewFile = await createFramePhotoPreview(
          productPreviewImageSrc,
          frameSlots,
          framePhotoLayout,
        );
        const { originalResults, previewResult } = await uploadCustomiserFiles(
          product.id,
          originalFiles,
          previewFile,
        );
        const preparedSlots = frameSlots.map((slot, index) => ({
          ...slot,
          remoteUrl:
            originalResults[index].cdnUrl || originalResults[index].url,
          storageKey: originalResults[index].key,
        }));
        setUploadedPhotoSlots((slots) => {
          const next = [...slots];
          preparedSlots.forEach((slot, index) => {
            next[index] = slot;
          });
          return next;
        });
        preparedImageEntries = preparedSlots.map((slot, index) => ({
          originalUrl: slot.remoteUrl,
          croppedUrl: slot.remoteUrl,
          backgroundRemovedUrl: "",
          position: slot.position,
          scale: slot.scale,
          rotation: 0,
          crop: { x: 0, y: 0, width: 100, height: 100 },
          qualityScore: "original-upload",
          slot: index + 1,
          storageKey: slot.storageKey,
          originalFileName: slot.fileName,
        }));
        preparedStorageKeys = originalResults.map((result) => result.key);
        cartPreviewImage = previewResult.cdnUrl || previewResult.url;
      } else if (isAlbumProduct) {
        const albumSlots = uploadedPhotoSlots.slice(0, coverSlotCount);
        const originalFiles = albumSlots
          .map((slot) => slot.file)
          .filter((file): file is File => Boolean(file));
        if (originalFiles.length !== coverSlotCount) {
          throw new Error("Every album-cover photo is required");
        }
        if (!productPreviewImageSrc) {
          throw new Error("The album cover artwork is unavailable");
        }
        const previewFile = await createAlbumCoverPreview(
          productPreviewImageSrc,
          albumSlots,
          albumCoverLayout,
          textLayer
            ? {
                value: textLayer,
                fontFamily: selectedFont,
                color: activeColor.text,
              }
            : undefined,
        );
        const { originalResults, previewResult } = await uploadCustomiserFiles(
          product.id,
          originalFiles,
          previewFile,
        );
        const preparedSlots = albumSlots.map((slot, index) => ({
          ...slot,
          remoteUrl:
            originalResults[index].cdnUrl || originalResults[index].url,
          storageKey: originalResults[index].key,
        }));
        setUploadedPhotoSlots((slots) => {
          const next = [...slots];
          preparedSlots.forEach((slot, index) => {
            next[index] = slot;
          });
          return next;
        });
        preparedImageEntries = preparedSlots.map((slot, index) => ({
          originalUrl: slot.remoteUrl,
          croppedUrl: slot.remoteUrl,
          backgroundRemovedUrl: "",
          position: slot.position,
          scale: slot.scale,
          rotation: albumCoverLayout.slots[index]?.rotation ?? 0,
          crop: { x: 0, y: 0, width: 100, height: 100 },
          qualityScore: "original-upload",
          slot: index + 1,
          storageKey: slot.storageKey,
          originalFileName: slot.fileName,
        }));
        preparedStorageKeys = originalResults.map((result) => result.key);
        cartPreviewImage = previewResult.cdnUrl || previewResult.url;
      }

      const finalCustomisationJson: ProductCustomisation = {
        ...customisationJson,
        uploadedImages: preparedImageEntries,
        previewImage: cartPreviewImage,
      };
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
        image: cartPreviewImage,
        thumbnail: cartPreviewImage,
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
          photos: `${uploadedPhotoCount} photo${uploadedPhotoCount === 1 ? "" : "s"}`,
          quantity: 1,
          orientation: selectedViewOrientation,
        },
        uploadedImagePreview: cartPreviewImage,
        uploadedImageReference:
          preparedStorageKeys.join(",") || "customiser-upload",
        previewImage: cartPreviewImage,
        customisation: {
          uploadedImages: preparedImageEntries.map((slot) => ({
            originalPreviewUrl: slot.originalUrl,
            position: slot.position,
            scale: slot.scale,
            rotation: slot.rotation,
            crop: slot.crop,
          })),
          selectedOptions: {
            size: selectedSize,
            dimensions: `${selectedDimensions.width}x${selectedDimensions.height}`,
            thickness: selectedThickness,
            color: selectedColor,
            quantity: 1,
            orientation: selectedViewOrientation,
            shape: previewShape,
            coverSlots: coverSlotCount,
            totalPhotos: totalUploadCount,
          },
          priceSnapshot: {
            basePrice: sizePrice,
            optionsPrice: thicknessExtra,
            finalPrice: unitPrice,
          },
        },
        customisationJson: finalCustomisationJson,
      });
      setShowCrossSellPopup(true);
    } catch {
      setAddToCartError(
        `We could not securely save your ${isClockProduct ? "clock " : isAlbumProduct ? "album " : ""}photos. Your preview is still here—please try again.`,
      );
      throw new Error("Customiser photo upload failed");
    } finally {
      setIsPreparingPhotos(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-68px)] bg-[#f4f5f7] text-[#07142f]">
      <button
        type="button"
        onClick={() => setShowWhyIkonnic(true)}
        className="fixed left-2 top-[38vh] z-40 hidden rounded-full border border-rosegold-300 bg-white px-2.5 py-3 text-[12px] font-extrabold text-ikonnic-red shadow-[0_8px_22px_rgba(15,23,42,0.14)] transition hover:bg-rosegold-50 xl:flex"
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
              {
                label: product.categoryName,
                href: `/category/${product.categorySlug}`,
              },
              { label: productName },
            ]}
          />

          <div className="flex min-h-[64px] w-full flex-wrap items-center gap-3 rounded-[14px] border border-[#dfe4ec] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={
                isClockProduct && hasBulkUpload
                  ? openBulkUpload
                  : () => openPhotoSlot(activePhotoSlot)
              }
              disabled={isPreparingPhotos}
              aria-describedby={
                isClockProduct && hasBulkUpload
                  ? "clock-upload-progress"
                  : undefined
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-[12px] bg-ikonnic-red px-5 py-2 text-[15px] font-black text-white shadow-sm transition hover:bg-rosegold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 sm:text-[17px]"
            >
              <Upload size={23} />
              {isClockProduct && hasBulkUpload
                ? `Select ${totalUploadCount} photos`
                : "Select Photo"}
            </button>
            {isClockProduct && hasBulkUpload ? (
              <span
                id="clock-upload-progress"
                role="status"
                aria-live="polite"
                className="rounded-full border border-rosegold-200 bg-rosegold-50 px-3 py-1.5 text-xs font-black text-ikonnic-red"
              >
                {uploadedPhotoCount}/{totalUploadCount} selected
              </span>
            ) : null}
            {photoUploadNotice ? (
              <p
                role="status"
                className="basis-full text-xs font-bold text-slate-600"
              >
                {photoUploadNotice}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setTextToolOpen((value) => !value)}
              aria-pressed={textToolOpen}
              className={`grid size-12 place-items-center rounded-xl text-[#07142f] transition hover:bg-rosegold-100 ${textToolOpen ? "bg-rosegold-50 ring-2 ring-ikonnic-red" : ""}`}
            >
              <span className="relative text-[30px] font-black leading-none">
                A
                <span className="absolute -right-2 bottom-0 grid size-4 place-items-center rounded-full border border-[#07142f] bg-white text-[11px] leading-none">
                  +
                </span>
              </span>
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
                        selectedViewOrientation === option.id
                          ? "ring-2 ring-ikonnic-red ring-offset-2"
                          : ""
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
                      className={`grid size-8 place-items-center rounded-full border-2 transition hover:scale-110 ${selectedColor === swatch.id ? "border-ikonnic-red shadow-md" : "border-transparent"}`}
                    >
                      <span
                        className={`block size-6 rounded-full border border-slate-200 ${swatch.chip}`}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {hasBulkUpload && !isClockProduct ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openBulkUpload}
                disabled={isPreparingPhotos}
                className="inline-flex h-11 w-fit items-center justify-center rounded-[5px] bg-ikonnic-red px-6 text-[17px] font-black text-[#07142f] shadow-sm transition hover:bg-rosegold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
              >
                Upload {totalUploadCount} photos
              </button>
              <span className="rounded-full border border-rosegold-200 bg-rosegold-50 px-3 py-1.5 text-xs font-black text-ikonnic-red">
                {uploadedPhotoCount}/{totalUploadCount} uploaded
              </span>
            </div>
          ) : null}

          {multiPhotoPreview && !isFourPhotoClock ? (
            <div
              className="flex gap-2 overflow-x-auto rounded-[14px] border border-rosegold-200/70 bg-white p-2 shadow-sm"
              role="group"
              aria-label="Selected photo slots"
            >
              {Array.from({ length: coverSlotCount }).map((_, index) => {
                const slot = uploadedPhotoSlots[index];
                const selected = activePhotoSlot === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => openPhotoSlot(index)}
                    aria-label={
                      slot?.url
                        ? `Replace photo ${index + 1}, ${slot.fileName || "uploaded image"}`
                        : `Add photo ${index + 1}`
                    }
                    aria-pressed={selected}
                    className={`flex min-h-12 min-w-[112px] items-center gap-2 rounded-[10px] border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-1 ${
                      selected
                        ? "border-ikonnic-red bg-rosegold-50"
                        : "border-[#dfe4ec] bg-white hover:border-rosegold-300"
                    }`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[7px] bg-rosegold-100 text-[11px] font-black text-ikonnic-red">
                      {slot?.url ? (
                        <img
                          src={slot.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black uppercase text-[#07142f]">
                        Photo {index + 1}
                      </span>
                      <span className="block truncate text-[11px] font-semibold text-slate-500">
                        {slot?.fileName || "Add image"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {textToolOpen ? (
            <div className="rounded-[14px] border border-[#dfe4ec] bg-white p-3 shadow-sm space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={textLayer}
                  onChange={(event) => setTextLayer(event.target.value)}
                  placeholder="Add name, date, or short message"
                  className="min-w-0 flex-1 rounded-xl border border-rosegold-200 px-4 py-3 text-sm font-semibold outline-none focus:border-ikonnic-red"
                />
                <button
                  type="button"
                  onClick={() => setTextLayer("")}
                  className="rounded-xl border border-rosegold-200 px-4 py-3 text-xs font-black text-slate-600 hover:bg-rosegold-100"
                >
                  Clear
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="flex-1 rounded-xl border border-rosegold-200 px-4 py-2 text-sm font-semibold outline-none focus:border-ikonnic-red"
                  style={{ fontFamily: selectedFont }}
                >
                  {fontOptions.map((font) => (
                    <option
                      key={font.value}
                      value={font.value}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {!isClockProduct && !isAlbumProduct ? (
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
                className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-sm font-black transition ${editorMode === "threeD" ? "bg-ikonnic-red text-white" : "text-slate-500 hover:bg-rosegold-50 hover:text-ikonnic-red"}`}
              >
                <Box size={16} />
                3D Preview
              </button>
            </div>
          ) : null}

          {editorMode === "edit" || !isClockProduct ? (
            <div
              className={`${editorMode === "threeD" && !isClockProduct && !isAlbumProduct ? "grid lg:hidden" : "grid"} min-h-[420px] w-full place-items-center border border-[#edf0f4] bg-[#f7f7f8] px-4 py-7 sm:min-h-[520px] sm:px-8 lg:min-h-[600px]`}
            >
              <div className="grid w-full place-items-center gap-3">
                {isAlbumProduct && albumCoverLayout.showHeading ? (
                  <h2 className="text-center text-2xl font-black text-[#07142f]">
                    Front Cover
                  </h2>
                ) : null}
                <div
                  ref={previewFrameRef}
                  className={`relative w-[calc(100vw-66px)] select-none overflow-hidden bg-[#eeeeef] shadow-[0_3px_12px_rgba(15,23,42,0.28)] ${isAlbumProduct ? "touch-pan-y" : "touch-none"} ${!usesSlotPreview && uploadedImage ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""} ${isAlbumProduct ? "" : isFourPhotoClock ? "border border-rosegold-200" : uploadedImage || !previewImageSrc ? `border ${activeColor.frame}` : ""}`}
                  style={previewFrameStyle}
                  onPointerDown={handlePhotoPointerDown}
                  onPointerUp={stopPhotoDrag}
                  onPointerCancel={stopPhotoDrag}
                  onPointerLeave={stopPhotoDrag}
                  onPointerMove={handlePhotoPointerMove}
                  onWheel={(event) => {
                    if (usesSlotPreview || !uploadedImage) return;
                    event.preventDefault();
                    updateImageScale(
                      imageScale + (event.deltaY < 0 ? 0.08 : -0.08),
                    );
                  }}
                >
                  {isFourPhotoClock ? (
                    <FourPhotoClockFace
                      disabled={isPreparingPhotos}
                      onSelectSlot={openPhotoSlot}
                      uploadedPhotoSlots={uploadedPhotoSlots}
                    />
                  ) : usesSlotPreview ? (
                    <div className="absolute inset-0 bg-white">
                      {isAlbumProduct ? (
                        <div className="absolute inset-0 overflow-hidden bg-white">
                          {productPreviewImageSrc ? (
                            <img
                              src={productPreviewImageSrc}
                              alt={`${productName} front-cover artwork`}
                              draggable={false}
                              className="h-full w-full select-none object-cover object-center"
                            />
                          ) : null}
                          {albumCoverLayout.artworkAware === false ? (
                            <span className="pointer-events-none absolute left-[30%] top-[20%] z-10 h-[66%] w-[40%] rounded-[10px] bg-white/95 shadow-[0_8px_22px_rgba(15,23,42,0.2)]" />
                          ) : null}
                          <div className="absolute inset-0">
                            {albumCoverLayout.slots.map((geometry, index) => {
                              const slot = uploadedPhotoSlots[index];
                              const frameVariant =
                                geometry.frameVariant ?? "plain";
                              const frameClass =
                                frameVariant === "polaroid"
                                  ? "border-[clamp(3px,0.8vw,6px)] border-white bg-[#cfcfcf] shadow-[0_6px_14px_rgba(15,23,42,0.26)]"
                                  : frameVariant === "photo-mat"
                                    ? "border-[clamp(3px,0.65vw,5px)] border-white bg-white/95 shadow-[0_4px_10px_rgba(15,23,42,0.2)]"
                                    : frameVariant === "plain"
                                      ? "border-0 bg-[#eeeeef] shadow-none"
                                      : "border-0 bg-[#cfcfcf] shadow-[0_3px_9px_rgba(15,23,42,0.14)]";
                              const label = slot?.url
                                ? `Replace cover photo ${index + 1}, ${slot.fileName || "uploaded image"}`
                                : `Select cover photo ${index + 1}`;

                              return (
                                <button
                                  key={`${albumCoverLayout.id}-${index}`}
                                  type="button"
                                  data-album-photo-slot={index + 1}
                                  onClick={() => openPhotoSlot(index)}
                                  onPointerDown={(event) =>
                                    event.stopPropagation()
                                  }
                                  disabled={isPreparingPhotos}
                                  className="group absolute bg-transparent transition hover:ring-2 hover:ring-rosegold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                                  style={{
                                    left: `${geometry.left}%`,
                                    top: `${geometry.top}%`,
                                    width: `${geometry.width}%`,
                                    height: `${geometry.height}%`,
                                    zIndex: geometry.zIndex ?? 20,
                                    containerType: "inline-size",
                                    transform: `rotate(${geometry.rotation ?? 0}deg)`,
                                    transformOrigin: "center",
                                  }}
                                  aria-label={label}
                                >
                                  <span
                                    className={`pointer-events-none absolute inset-0 overflow-hidden ${frameClass}`}
                                    style={{
                                      borderRadius:
                                        geometry.borderRadius ??
                                        (frameVariant === "polaroid"
                                          ? "2%"
                                          : "6%"),
                                      clipPath: geometry.clipPath,
                                    }}
                                  >
                                    {slot?.url ? (
                                      <>
                                        <img
                                          src={slot.url}
                                          alt=""
                                          className="h-full w-full object-cover"
                                          style={{
                                            objectPosition:
                                              geometry.objectPosition ??
                                              `${50 + slot.position.x}% ${50 + slot.position.y}%`,
                                            transform: `scale(${slot.scale})`,
                                            transformOrigin:
                                              geometry.objectPosition ??
                                              "50% 50%",
                                          }}
                                        />
                                        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-slate-950/75 px-1 py-1 text-center text-[10px] font-black uppercase tracking-wide text-white transition group-hover:translate-y-0 group-focus-visible:translate-y-0">
                                          Replace
                                        </span>
                                      </>
                                    ) : (
                                      <span
                                        className={`absolute inset-0 grid place-items-center ${
                                          frameVariant === "plain"
                                            ? "bg-[#eeeeef]/95"
                                            : frameVariant === "photo-mat"
                                              ? "bg-white/95"
                                              : "bg-[#cfcfcf]/95"
                                        }`}
                                      >
                                        <span
                                          className="flex flex-col items-center justify-center overflow-hidden bg-ikonnic-red text-center font-black uppercase leading-[1.04] text-[#07142f] shadow-sm"
                                          style={{
                                            width: `${geometry.badgeWidth ?? 66}%`,
                                            height: `${geometry.badgeHeight ?? 58}%`,
                                            borderRadius:
                                              geometry.badgeRadius ?? "14%",
                                            fontSize:
                                              "clamp(10px, 14cqw, 24px)",
                                            transform: `translateX(${geometry.badgeOffsetX ?? 0}%)`,
                                          }}
                                        >
                                          <span className="block max-w-full overflow-hidden">
                                            Select
                                          </span>
                                          <span className="block max-w-full overflow-hidden">
                                            Photo
                                          </span>
                                        </span>
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : framePhotoLayout ? (
                        <>
                          {productPreviewImageSrc ? (
                            <img
                              src={productPreviewImageSrc}
                              alt={`${productName} product preview`}
                              draggable={false}
                              className="h-full w-full select-none object-contain"
                            />
                          ) : null}
                          <div
                            className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
                            data-frame-photo-layout={framePhotoLayout.id}
                          >
                            <div
                              className="pointer-events-auto relative"
                              style={frameArtworkStageStyle}
                            >
                              {framePhotoLayout.slots.map((geometry, index) => {
                                const slot = uploadedPhotoSlots[index];
                                const selected = activePhotoSlot === index;
                                const label = slot?.url
                                  ? `Replace photo ${index + 1}, ${slot.fileName || "uploaded image"}`
                                  : `Select photo ${index + 1}`;

                                return (
                                  <button
                                    key={`${framePhotoLayout.id}-${index}`}
                                    type="button"
                                    data-frame-photo-slot={index + 1}
                                    onClick={() => openPhotoSlot(index)}
                                    onPointerDown={(event) =>
                                      event.stopPropagation()
                                    }
                                    disabled={isPreparingPhotos}
                                    className={`group absolute overflow-hidden border-2 border-white/90 bg-transparent shadow-[0_1px_4px_rgba(15,23,42,0.18)] transition hover:ring-2 hover:ring-rosegold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${
                                      selected ? "ring-2 ring-rosegold-400" : ""
                                    }`}
                                    style={{
                                      left: `${geometry.left}%`,
                                      top: `${geometry.top}%`,
                                      width: `${geometry.width}%`,
                                      height: `${geometry.height}%`,
                                      borderRadius: geometry.borderRadius ?? "1px",
                                      containerType: "inline-size",
                                    }}
                                    aria-label={label}
                                  >
                                    {slot?.url ? (
                                      <>
                                        <img
                                          src={slot.url}
                                          alt=""
                                          draggable={false}
                                          className="h-full w-full select-none object-cover"
                                          style={{
                                            objectPosition: `${50 + slot.position.x}% ${50 + slot.position.y}%`,
                                            transform: `scale(${slot.scale})`,
                                            transformOrigin: `${50 + slot.position.x}% ${50 + slot.position.y}%`,
                                          }}
                                        />
                                        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-slate-950/75 px-1 py-1 text-center text-[clamp(8px,10cqw,13px)] font-black uppercase tracking-wide text-white transition group-hover:translate-y-0 group-focus-visible:translate-y-0">
                                          Replace
                                        </span>
                                      </>
                                    ) : (
                                      <span className="absolute inset-0 grid place-items-center bg-white/55 p-[4%]">
                                        <span
                                          className="grid h-[58%] w-[72%] place-items-center rounded-[12%] bg-ikonnic-red px-[5%] text-center font-black uppercase leading-[1.04] text-white shadow-sm"
                                          style={{
                                            fontSize: "clamp(9px, 13cqw, 19px)",
                                          }}
                                        >
                                          <span>
                                            Select
                                            <br />
                                            Photo
                                          </span>
                                        </span>
                                      </span>
                                    )}
                                    <span
                                      className="absolute left-[5%] top-[5%] grid aspect-square w-[18%] min-w-4 place-items-center rounded-full bg-white/95 font-black text-[#07142f] shadow-sm"
                                      style={{
                                        fontSize: "clamp(9px, 11cqw, 14px)",
                                      }}
                                    >
                                      {index + 1}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {productPreviewImageSrc ? (
                            <img
                              src={productPreviewImageSrc}
                              alt={`${productName} product preview`}
                              draggable={false}
                              className="h-full w-full select-none object-contain"
                            />
                          ) : null}
                          <div
                            className={`${slotPanelClass} grid ${slotGridClass} gap-2 rounded-[14px] bg-white/90 p-2 shadow-[0_10px_28px_rgba(15,23,42,0.18)] backdrop-blur-sm`}
                          >
                            {Array.from({ length: coverSlotCount }).map(
                              (_, index) => {
                                const slot = uploadedPhotoSlots[index];
                                const selected = activePhotoSlot === index;
                                return (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => openPhotoSlot(index)}
                                    onPointerDown={(event) =>
                                      event.stopPropagation()
                                    }
                                    className={`relative min-h-[58px] overflow-hidden rounded-[10px] border-2 bg-white shadow-sm transition ${
                                      selected
                                        ? "border-ikonnic-red ring-2 ring-rosegold-300"
                                        : "border-rosegold-200 hover:border-rosegold-400"
                                    }`}
                                    aria-label={`Select photo ${index + 1}`}
                                  >
                                    {slot?.url ? (
                                      <img
                                        src={slot.url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="absolute inset-0 grid place-items-center bg-[#3b3b3f]">
                                        <span className="rounded-[8px] bg-ikonnic-red px-2 py-1.5 text-center text-[10px] font-black uppercase leading-tight text-white shadow-sm sm:text-[12px]">
                                          Select
                                          <br />
                                          Photo
                                        </span>
                                      </span>
                                    )}
                                    <span className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-white text-[10px] font-black text-[#07142f] shadow-sm">
                                      {index + 1}
                                    </span>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : previewImageSrc ? (
                    <img
                      src={previewImageSrc}
                      alt={`${productName} preview`}
                      draggable={false}
                      className={`pointer-events-none h-full w-full select-none transition-transform duration-75 ${uploadedImage ? "object-cover" : "object-contain"}`}
                      style={
                        uploadedImage
                          ? {
                              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${renderedImageScale}) rotate(${rotation}deg)`,
                            }
                          : undefined
                      }
                    />
                  ) : isSmallPreviewProduct ? (
                    <button
                      type="button"
                      onClick={openActivePhotoUpload}
                      className="absolute inset-0 z-10 grid cursor-pointer place-items-center"
                      aria-label="Select photo"
                    >
                      <span className="rounded-[10px] bg-ikonnic-red px-4 py-2.5 text-[13px] font-black uppercase tracking-normal text-white shadow-[0_8px_18px_rgba(183,110,121,0.16)] transition hover:bg-rosegold-600 sm:text-[14px]">
                        Upload Photo
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={openActivePhotoUpload}
                      className="absolute left-1/2 top-1/2 grid h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[18px] bg-ikonnic-red text-left text-[23px] font-black leading-[1.12] text-white transition hover:bg-rosegold-600"
                    >
                      <span>
                        SELECT
                        <br />
                        PHOTO
                      </span>
                    </button>
                  )}
                  {showPreviewSelectCta &&
                  previewImageSrc &&
                  !usesSlotPreview ? (
                    <button
                      type="button"
                      onClick={openActivePhotoUpload}
                      className="absolute left-1/2 top-1/2 z-20 grid h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[14px] bg-ikonnic-red text-left text-[16px] font-black leading-[1.1] text-white shadow-[0_8px_18px_rgba(183,110,121,0.16)] transition hover:bg-rosegold-600 sm:h-[86px] sm:w-[86px] sm:text-[18px]"
                    >
                      <span>
                        SELECT
                        <br />
                        PHOTO
                      </span>
                    </button>
                  ) : null}
                  {!uploadedImage && previewImageSrc && !usesSlotPreview ? (
                    <span className="absolute bottom-[14%] left-1/2 z-30 -translate-x-1/2 rounded-[2px] bg-white px-1.5 py-0.5 text-[6px] font-black uppercase tracking-tight text-ikonnic-red shadow-sm">
                      IKONNIC
                    </span>
                  ) : null}
                  {textLayer ? (
                    <div
                      className="absolute bottom-10 left-1/2 z-30 max-w-[82%] -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-center text-lg shadow-sm"
                      style={{
                        fontFamily: selectedFont,
                        color: activeColor.text,
                      }}
                    >
                      {textLayer}
                    </div>
                  ) : null}
                  <span className="absolute bottom-1.5 right-2 z-30 text-[7px] font-black uppercase tracking-tight text-ikonnic-red opacity-55">
                    IKONNIC
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {!isAlbumProduct &&
          ((!isClockProduct && editorMode === "edit") ||
            editorMode === "threeD") ? (
            <div
              className={`${!isClockProduct && editorMode === "edit" ? "block lg:hidden" : "block"} w-full border border-[#edf0f4] bg-[#10131b] p-2 sm:p-3`}
            >
              <ThreeDErrorBoundary>
                <ThreeDPreview
                photoUrl={
                  usesSlotPreview ? productPreviewImageSrc : previewImageSrc
                }
                photoUrls={
                  isClockProduct && multiPhotoPreview
                    ? clockPreviewPhotoUrls
                    : undefined
                }
                photoTransforms={
                  isClockProduct && multiPhotoPreview
                    ? clockPreviewPhotoTransforms
                    : undefined
                }
                collageLayout={
                  isFourPhotoClock ? "four-photo-clock" : undefined
                }
                thicknessMm={parseInt(selectedThickness, 10) || 3}
                borderColor={selectedColor}
                textOverlay={textLayer || undefined}
                previewType={template?.previewType}
                orientation={previewOrientation}
                shape={previewShape}
                mode="inline"
              />
            </ThreeDErrorBoundary>
            </div>
          ) : null}

          {isFourPhotoClock && uploadedPhotoCount > 0 ? (
            <div className="rounded-[14px] border border-rosegold-200/70 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-[#07142f]">
                    Adjust photo fit
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Choose a photo, then pan or zoom its crop.
                  </p>
                </div>
                <span className="rounded-full bg-rosegold-50 px-3 py-1 text-xs font-black text-ikonnic-red">
                  Photo {activePhotoSlot + 1}
                </span>
              </div>
              <div
                className="mt-3 flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Choose photo to adjust"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={
                      !uploadedPhotoSlots[index]?.url || isPreparingPhotos
                    }
                    onClick={() => setActivePhotoSlot(index)}
                    aria-pressed={activePhotoSlot === index}
                    className={`min-h-11 rounded-xl border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red disabled:cursor-not-allowed disabled:opacity-40 ${
                      activePhotoSlot === index
                        ? "border-ikonnic-red bg-rosegold-50 text-ikonnic-red"
                        : "border-[#dfe4ec] bg-white text-[#07142f] hover:border-rosegold-300"
                    }`}
                  >
                    Photo {index + 1}
                  </button>
                ))}
              </div>
              <div
                className="mt-2 flex flex-wrap items-center gap-2"
                role="group"
                aria-label={`Adjust photo ${activePhotoSlot + 1} crop`}
              >
                {[
                  { label: "Move photo left", text: "←", x: -10, y: 0 },
                  { label: "Move photo up", text: "↑", x: 0, y: -10 },
                  { label: "Move photo down", text: "↓", x: 0, y: 10 },
                  { label: "Move photo right", text: "→", x: 10, y: 0 },
                ].map((control) => (
                  <button
                    key={control.label}
                    type="button"
                    disabled={!uploadedImage || isPreparingPhotos}
                    onClick={() =>
                      adjustClockPhotoPosition(control.x, control.y)
                    }
                    aria-label={control.label}
                    className="grid size-11 place-items-center rounded-xl border border-[#dfe4ec] bg-white text-lg font-black text-[#07142f] transition hover:border-rosegold-300 hover:text-ikonnic-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {control.text}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={
                    !uploadedImage || imageScale <= 1 || isPreparingPhotos
                  }
                  onClick={() => adjustClockPhotoScale(-0.1)}
                  aria-label="Zoom photo out"
                  className="grid size-11 place-items-center rounded-xl border border-[#dfe4ec] bg-white text-lg font-black text-[#07142f] transition hover:border-rosegold-300 hover:text-ikonnic-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <button
                  type="button"
                  disabled={
                    !uploadedImage || imageScale >= 2 || isPreparingPhotos
                  }
                  onClick={() => adjustClockPhotoScale(0.1)}
                  aria-label="Zoom photo in"
                  className="grid size-11 place-items-center rounded-xl border border-[#dfe4ec] bg-white text-lg font-black text-[#07142f] transition hover:border-rosegold-300 hover:text-ikonnic-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
                <button
                  type="button"
                  disabled={!uploadedImage || isPreparingPhotos}
                  onClick={resetClockPhotoCrop}
                  className="min-h-11 rounded-xl border border-rosegold-200 bg-rosegold-50 px-3 text-xs font-black text-ikonnic-red transition hover:bg-rosegold-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reset fit
                </button>
              </div>
            </div>
          ) : null}

          {isClockProduct ? (
            <button
              type="button"
              onClick={() =>
                setEditorMode((mode) => (mode === "threeD" ? "edit" : "threeD"))
              }
              className="flex h-14 w-full items-center justify-center gap-3 rounded-[10px] border border-[#dfe4ec] bg-white text-[17px] font-black text-[#07142f] shadow-sm transition hover:border-rosegold-300 hover:text-ikonnic-red"
            >
              <Box size={18} />
              {editorMode === "threeD" ? "Back to 2D Edit" : "Show 3D Preview"}
            </button>
          ) : null}

          {uploadedImage ? (
            <div className="flex flex-col gap-3 rounded-[14px] border border-[#dfe4ec] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#07142f]">
                  {uploadedFileName || "Uploaded photo"}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {selectedDimensions.width} x {selectedDimensions.height} inch
                  print area
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openActivePhotoUpload}
                  className="rounded-xl border border-[#dfe4ec] bg-white px-4 py-2 text-xs font-black text-[#07142f] hover:border-rosegold-300 hover:bg-rosegold-50"
                >
                  Replace Photo
                </button>
                <button
                  type="button"
                  onClick={clearUploadedPhoto}
                  className="rounded-xl border border-rosegold-200 bg-rosegold-50 px-4 py-2 text-xs font-black text-ikonnic-red hover:bg-rosegold-100"
                >
                  Remove Photo
                </button>
              </div>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept={CUSTOMISER_IMAGE_ACCEPT}
            aria-label="Choose one photo"
            className="hidden"
            onChange={(event) => {
              selectFiles(event.target.files, "slot");
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={bulkFileInputRef}
            type="file"
            accept={CUSTOMISER_IMAGE_ACCEPT}
            multiple
            aria-label={`Choose up to ${totalUploadCount} photos`}
            className="hidden"
            onChange={(event) => {
              selectFiles(event.target.files, "bulk");
              event.currentTarget.value = "";
            }}
          />
        </section>

        <aside className="min-w-0 pt-0 lg:pt-1">
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.03em] text-[#07142f] sm:text-[30px]">
            {productName}
          </h1>
          {template && !isClockProduct ? (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              <span className="rounded-full border border-rosegold-200/60 bg-white px-3 py-1.5">
                {template.productType}
              </span>
              <span className="rounded-full border border-rosegold-200/60 bg-white px-3 py-1.5">
                {template.previewType}
              </span>
              {template.orientation ? (
                <span className="rounded-full border border-rosegold-200/60 bg-white px-3 py-1.5">
                  {template.orientation}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-7 flex items-baseline gap-3">
            <strong className="text-[30px] font-black leading-none text-ikonnic-red">
              {"\u20B9"}
              {unitPrice.toLocaleString("en-IN")}
            </strong>
            <del className="text-[17px] font-bold text-slate-500">
              {"\u20B9"}
              {compareAtPrice.toLocaleString("en-IN")}
            </del>
          </div>

          <div className="mt-5 inline-flex rounded-[9px] border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-600">
            Only {isClockProduct ? 7 : 6} left!
          </div>

          <fieldset className="mt-6">
            <legend className="text-[17px] font-black text-[#07142f]">
              Size (Inch)
            </legend>
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
                        ? "bg-ikonnic-red text-white shadow-sm"
                        : "border border-[#dfe4ec] bg-white text-[#07142f] hover:border-rosegold-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {selectedDimensions.width} x {selectedDimensions.height} inch
            </p>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-[17px] font-black text-[#07142f]">
              Thickness (mm)
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {availableThicknessOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedThickness(option)}
                  className={`h-[42px] rounded-[9px] px-4 text-[17px] font-extrabold transition ${
                    selectedThickness === option
                      ? "bg-ikonnic-red text-white shadow-sm"
                      : "border border-[#dfe4ec] bg-white text-[#07142f] hover:border-rosegold-300"
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
                  <p className="text-[12px] font-black uppercase tracking-[0.14em] text-emerald-600">
                    Easy Mount Included
                  </p>
                  <p className="mt-1 text-sm font-black text-[#07142f]">
                    {mountingText}
                  </p>
                </div>
              </div>
              <Check size={18} className="text-emerald-600" />
            </div>
          ) : null}

          <button
            type="button"
            onClick={handlePreAddToCart}
            disabled={isPreparingPhotos}
            className="mt-5 flex h-[74px] w-full items-center justify-center gap-3 rounded-[16px] bg-ikonnic-red text-[22px] font-black text-white shadow-[0_12px_22px_rgba(183,110,121,0.18)] transition hover:bg-rosegold-600 active:scale-[0.99] disabled:cursor-wait disabled:opacity-65"
          >
            <ShoppingCart size={28} />
            {isPreparingPhotos ? "Preparing photos..." : "Add to Cart"}
          </button>

          {addToCartError ? (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-rosegold-200 bg-rosegold-50 px-4 py-3 text-sm font-bold text-ikonnic-red"
            >
              {addToCartError}
            </p>
          ) : null}

          <TrustCards />

          <PincodeChecker />
        </aside>
      </div>

      <section className="mx-auto max-w-[1240px] px-4 pb-10 sm:px-6">
        <ProductDescriptionContent product={product} />
      </section>

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
          View:
            selectedViewOrientation === "horizontal"
              ? "Horizontal"
              : "Vertical",
          Font:
            fontOptions.find((f) => f.value === selectedFont)?.name ||
            "Default",
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
            {[
              "Premium acrylic finish",
              "Easy mounting included",
              "Secure checkout",
              "Custom made with care",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl bg-rosegold-50 p-3 text-sm font-bold text-[#07142f]"
              >
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
    {
      title: "Free Shipping",
      subtext: "On all orders across India",
      icon: Truck,
      wrap: "bg-sky-50 text-sky-500",
    },
    {
      title: "30-Day Returns",
      subtext: "Hassle-free guarantee",
      icon: RefreshCw,
      wrap: "bg-emerald-50 text-emerald-500",
    },
    {
      title: "100% Secure",
      subtext: "Encrypted checkout",
      icon: ShieldCheck,
      wrap: "bg-violet-50 text-violet-500",
    },
  ];

  return (
    <div className="mt-5 grid overflow-hidden rounded-[18px] border border-[#e8ebf0] bg-white shadow-[0_3px_14px_rgba(15,23,42,0.07)] sm:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`flex flex-col items-center px-4 py-5 text-center ${index > 0 ? "border-t border-[#edf0f4] sm:border-l sm:border-t-0" : ""}`}
          >
            <span
              className={`grid size-[60px] place-items-center rounded-[20px] ${card.wrap}`}
            >
              <Icon size={26} />
            </span>
            <p className="mt-4 text-sm font-black text-[#07142f]">
              {card.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#07142f]">{title}</h2>
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-rosegold-100 text-slate-600 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
