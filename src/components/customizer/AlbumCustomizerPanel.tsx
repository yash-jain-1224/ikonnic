"use client";

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Images,
  Loader2,
  ShoppingCart,
  Upload,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { CrossSellPopup } from "@/components/product/CrossSellPopup";
import { getAlbumTemplate } from "@/data/albumTemplates";
import {
  customizerTemplateById,
  customizerTemplateByProductSlug,
} from "@/data/customizerTemplates";
import { uploadAPI } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import type {
  AlbumEditorState,
  AlbumPageTemplate,
  AlbumPhotoSlot,
  AlbumSlotAssignment,
  Product,
  ProductCustomisation,
  ProductOption,
  UploadedAlbumPhoto,
} from "@/types";

const MAX_ALBUM_FILE_SIZE = 15 * 1024 * 1024;
const SUPPORTED_ALBUM_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALBUM_IMAGE_ACCEPT = Array.from(SUPPORTED_ALBUM_IMAGE_TYPES).join(",");
// This mirrors the existing signed-session guard: four originals and one
// preview stay below the service's 64MB request envelope.
const ALBUM_UPLOAD_BATCH_SIZE = 4;

type LocalAlbumPhoto = UploadedAlbumPhoto & {
  file: File;
  localUrl: string;
};

type AlbumEditorDraft = Omit<AlbumEditorState, "uploadedPhotos"> & {
  uploadedPhotos: LocalAlbumPhoto[];
};

type UploadResult = {
  key: string;
  url: string;
  cdnUrl?: string;
  originalName: string;
  mimeType: string;
  size: number;
};

type UploadSession = {
  sessionToken: string;
  uploads: Array<{
    key: string;
    uploadUrl: string;
    contentType: string;
    role: "original" | "preview";
  }>;
};

type AlbumVariantOption = {
  label: string;
  price: number;
  disabled?: boolean;
};

type InitialAlbumOptions = {
  size?: string;
  thickness?: string;
};

function displayTitle(product: Product) {
  return product.title.replace(/\s+\d+$/, "");
}

function photoSource(photo: LocalAlbumPhoto | undefined) {
  return photo?.localUrl || photo?.remoteUrl || "";
}

function splitIntoBatches<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function objectPosition(assignment: AlbumSlotAssignment | undefined) {
  const position = assignment?.position ?? { x: 0, y: 0 };
  return `${50 + position.x}% ${50 + position.y}%`;
}

function slotStyle(slot: AlbumPhotoSlot): CSSProperties {
  return {
    left: `${slot.x}%`,
    top: `${slot.y}%`,
    width: `${slot.width}%`,
    height: `${slot.height}%`,
    borderRadius:
      slot.shape === "circle" ? "50%" : slot.borderRadius ?? "4%",
    clipPath: slot.clipPath,
    transform: `rotate(${slot.rotation ?? 0}deg)`,
  };
}

async function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

function drawCanvasImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  position: { x: number; y: number } = { x: 0, y: 0 },
  scale = 1,
) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  const safeScale = Math.max(1, scale);
  let drawWidth = width;
  let drawHeight = height;

  if (sourceRatio > targetRatio) {
    drawWidth = height * sourceRatio;
  } else {
    drawHeight = width / sourceRatio;
  }

  drawWidth *= safeScale;
  drawHeight *= safeScale;
  const overflowX = Math.max(0, drawWidth - width);
  const overflowY = Math.max(0, drawHeight - height);
  const drawX = x - overflowX / 2 - (position.x / 100) * overflowX;
  const drawY = y - overflowY / 2 - (position.y / 100) * overflowY;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function canvasSlotRadius(slot: AlbumPhotoSlot, width: number, height: number) {
  const smallestSide = Math.min(width, height);
  if (typeof slot.borderRadius === "number") {
    return Math.min(smallestSide / 2, Math.max(0, slot.borderRadius));
  }

  const firstValue = slot.borderRadius?.trim().split(/[\s/]+/)[0];
  if (!firstValue) return smallestSide * 0.04;
  const parsed = Number.parseFloat(firstValue);
  if (!Number.isFinite(parsed)) return smallestSide * 0.04;
  return Math.min(
    smallestSide / 2,
    Math.max(0, firstValue.endsWith("%") ? (smallestSide * parsed) / 100 : parsed),
  );
}

function clipCanvasSlot(
  context: CanvasRenderingContext2D,
  slot: AlbumPhotoSlot,
  width: number,
  height: number,
) {
  const clipPath = slot.clipPath?.trim().toLowerCase() ?? "";
  context.beginPath();
  if (
    slot.shape === "circle" ||
    clipPath.startsWith("ellipse(") ||
    clipPath.startsWith("circle(")
  ) {
    context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    return;
  }
  context.roundRect(
    -width / 2,
    -height / 2,
    width,
    height,
    canvasSlotRadius(slot, width, height),
  );
}

function drawAlbumTextFields(
  context: CanvasRenderingContext2D,
  page: AlbumPageTemplate,
  textValues: Record<string, string>,
  width: number,
  height: number,
) {
  page.textFields?.forEach((field) => {
    const value = textValues[field.id] ?? field.defaultValue ?? "";
    if (!value) return;

    const fieldWidth = ((field.width ?? 0) / 100) * width;
    const align = field.align ?? "left";
    const anchorX =
      (field.x / 100) * width +
      (align === "center" ? fieldWidth / 2 : align === "right" ? fieldWidth : 0);
    context.save();
    context.fillStyle = field.color ?? "#07142f";
    context.font = `800 ${Math.max(14, (field.fontSize ?? 3) * (width / 100))}px Arial, sans-serif`;
    context.textAlign = align;
    context.textBaseline = "top";
    context.fillText(value, anchorX, (field.y / 100) * height, fieldWidth || undefined);
    context.restore();
  });
}

/**
 * Each album family supplies a base colour.  The artwork below turns that
 * colour into a print-safe page treatment so the area around a photo never
 * falls back to an unrelated flat grey/white canvas.
 */
function albumPageBackdropStyle(color?: string, product?: Product): CSSProperties {
  const text = `${product?.categorySlug ?? ""} ${product?.categoryName ?? ""} ${product?.slug ?? ""} ${product?.title ?? ""} ${product?.filterTags?.join(" ") ?? ""} ${color ?? ""}`.toLowerCase();

  // 1. House Warming Albums (e.g., "Knocked once Entered forever", "New House Same Love")
  if (text.includes("house-warming") || text.includes("house warming") || text.includes("home") || text.includes("house")) {
    return {
      backgroundColor: "#f97316",
      backgroundImage: `
        radial-gradient(ellipse 90% 60% at 50% 100%, #ea580c 0%, transparent 80%),
        radial-gradient(ellipse 100% 60% at 50% -20%, #ffedd5 0%, transparent 70%),
        linear-gradient(135deg, #fb923c 0%, #f97316 50%, #c2410c 100%)
      `,
    };
  }

  // 2. Birthday, Kids & Baby Albums
  if (text.includes("birthday") || text.includes("baby") || text.includes("kids") || text.includes("pink") || text.includes("party")) {
    return {
      backgroundColor: "#ec4899",
      backgroundImage: `
        radial-gradient(circle at 15% 15%, rgba(255,255,255,0.4), transparent 45%),
        radial-gradient(circle at 85% 85%, rgba(168,85,247,0.35), transparent 50%),
        linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)
      `,
    };
  }

  // 3. Travel & Adventure Albums
  if (text.includes("travel") || text.includes("wildlife") || text.includes("mountain") || text.includes("snow") || text.includes("beach") || text.includes("explore")) {
    return {
      backgroundColor: "#0d9488",
      backgroundImage: `
        radial-gradient(circle at 20% 10%, rgba(255,255,255,0.4), transparent 45%),
        radial-gradient(circle at 80% 90%, rgba(14,165,233,0.35), transparent 50%),
        linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #115e59 100%)
      `,
    };
  }

  // 4. Family & Heritage Albums
  if (text.includes("family") || text.includes("father") || text.includes("mother") || text.includes("parent")) {
    return {
      backgroundColor: "#78350f",
      backgroundImage: `
        radial-gradient(circle at 50% 0%, rgba(255,255,255,0.4), transparent 60%),
        linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)
      `,
    };
  }

  // 5. Wedding, Couples, BTS & Anniversary Albums
  if (text.includes("wedding") || text.includes("couple") || text.includes("anniversary") || text.includes("love") || text.includes("bts")) {
    return {
      backgroundColor: "#be123c",
      backgroundImage: `
        radial-gradient(circle at 50% -20%, rgba(255,255,255,0.45), transparent 70%),
        linear-gradient(135deg, #f43f5e 0%, #be123c 50%, #881337 100%)
      `,
    };
  }

  // 6. Default / Signature Rose Gold Theme
  return {
    backgroundColor: "#b76e79",
    backgroundImage: `
      radial-gradient(circle at 50% -20%, rgba(255,255,255,0.45), transparent 70%),
      linear-gradient(135deg, #f97316 0%, #b76e79 50%, #881337 100%)
    `,
  };
}

function drawAlbumPageBackdrop(
  context: CanvasRenderingContext2D,
  page: AlbumPageTemplate,
  width: number,
  height: number,
) {
  const backdropStyle = albumPageBackdropStyle(page.backgroundColor);
  const base = (backdropStyle.backgroundColor as string) || "#f97316";

  const gradient = context.createLinearGradient(0, 0, width, height);
  if (base === "#ec4899") {
    gradient.addColorStop(0, "#f472b6");
    gradient.addColorStop(0.5, "#db2777");
    gradient.addColorStop(1, "#9d174d");
  } else if (base === "#0d9488") {
    gradient.addColorStop(0, "#14b8a6");
    gradient.addColorStop(0.5, "#0d9488");
    gradient.addColorStop(1, "#115e59");
  } else if (base === "#78350f") {
    gradient.addColorStop(0, "#d97706");
    gradient.addColorStop(0.5, "#b45309");
    gradient.addColorStop(1, "#78350f");
  } else {
    gradient.addColorStop(0, "#fb923c");
    gradient.addColorStop(0.5, "#f97316");
    gradient.addColorStop(1, "#c2410c");
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * 0.5,
    height * 0.1,
    0,
    width * 0.5,
    height * 0.1,
    Math.max(width, height) * 0.8,
  );
  glow.addColorStop(0, "rgba(255,255,255,0.35)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

async function canvasToFile(canvas: HTMLCanvasElement, name: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Preview export failed"))),
      "image/webp",
      0.86,
    );
  });
  return new File([blob], name, { type: blob.type || "image/webp" });
}

async function createBatchPreview() {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Preview canvas is unavailable");
  context.fillStyle = "#fffaf8";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#b76e79";
  context.fillRect(5, 5, 14, 14);
  return canvasToFile(canvas, "album-upload-batch-preview.webp");
}

async function createAlbumPreview(
  page: AlbumPageTemplate,
  assignments: Record<string, AlbumSlotAssignment>,
  photos: Map<string, LocalAlbumPhoto>,
  textValues: Record<string, string>,
) {
  const isSpread = page.type === "inside-spread";
  const width = isSpread ? 1400 : 900;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Album preview canvas is unavailable");

  drawAlbumPageBackdrop(context, page, width, height);

  if (page.backgroundImage) {
    try {
      const background = await loadCanvasImage(page.backgroundImage);
      context.save();
        context.globalAlpha = page.type === "front-cover" ? 1 : 0.24;
      drawCanvasImageCover(context, background, 0, 0, width, height);
      context.restore();
    } catch {
      // The configured colour remains a useful print-preview fallback.
    }
  }

  for (const slot of page.slots) {
    const assignment = assignments[slot.id];
    const photo = assignment ? photos.get(assignment.photoId) : undefined;
    const source = photoSource(photo);
    if (!source) continue;

    try {
      const image = await loadCanvasImage(source);
      const slotWidth = (slot.width / 100) * width;
      const slotHeight = (slot.height / 100) * height;
      const centerX = ((slot.x + slot.width / 2) / 100) * width;
      const centerY = ((slot.y + slot.height / 2) / 100) * height;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(((slot.rotation ?? 0) * Math.PI) / 180);
      clipCanvasSlot(context, slot, slotWidth, slotHeight);
      context.clip();
      drawCanvasImageCover(
        context,
        image,
        -slotWidth / 2,
        -slotHeight / 2,
        slotWidth,
        slotHeight,
        assignment?.position,
        assignment?.scale,
      );
      context.restore();
    } catch {
      // The assigned original stays in the cart payload even if a browser
      // cannot render it into the optional composite preview.
    }
  }

  drawAlbumTextFields(context, page, textValues, width, height);

  context.fillStyle = "rgba(7, 20, 47, 0.72)";
  context.font = "800 14px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText("IKONNIC", width - 18, height - 18);
  return canvasToFile(canvas, "album-cover-preview.webp");
}

async function uploadCustomiserBatch(
  productId: string,
  originals: LocalAlbumPhoto[],
  preview: File,
) {
  const files = [...originals.map((photo) => photo.file), preview];
  const { data } = await uploadAPI.createCustomiserSession({
    productId,
    files: files.map((file, index) => ({
      name: file.name,
      contentType: file.type,
      size: file.size,
      role: index === files.length - 1 ? ("preview" as const) : ("original" as const),
    })),
  });
  const session = data as UploadSession;
  if (!session?.sessionToken || session.uploads?.length !== files.length) {
    throw new Error("The photo upload session was incomplete");
  }

  await Promise.all(
    files.map(async (file, index) => {
      const target = session.uploads[index];
      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type,
        },
        body: file,
      });
      if (!response.ok) throw new Error("A photo could not be uploaded");
    }),
  );

  const finalizedResponse = await uploadAPI.finalizeCustomiserSession(session.sessionToken);
  const finalized = finalizedResponse.data as UploadResult[];
  if (!Array.isArray(finalized) || finalized.length !== files.length) {
    throw new Error("The photo upload session could not be finalized");
  }
  return {
    originals: finalized.slice(0, originals.length),
    preview: finalized[originals.length],
  };
}

async function uploadAlbumPhotos(
  productId: string,
  photos: LocalAlbumPhoto[],
  coverPreview: File,
  onProgress: (complete: number, total: number) => void,
) {
  const batches = splitIntoBatches(photos, ALBUM_UPLOAD_BATCH_SIZE);
  const batchPreview = await createBatchPreview();
  const uploaded = new Map<string, UploadResult>();
  let coverResult: UploadResult | undefined;
  let complete = 0;

  for (const [index, batch] of batches.entries()) {
    const isLastBatch = index === batches.length - 1;
    const result = await uploadCustomiserBatch(
      productId,
      batch,
      isLastBatch ? coverPreview : batchPreview,
    );
    batch.forEach((photo, photoIndex) => {
      uploaded.set(photo.id, result.originals[photoIndex]);
      complete += 1;
      onProgress(complete, photos.length);
    });
    if (isLastBatch) coverResult = result.preview;
  }

  if (!coverResult) throw new Error("The album preview could not be saved");
  return { uploaded, coverResult };
}

function AlbumPageCanvas({
  page,
  product,
  assignments,
  photos,
  textValues,
  activeSlotId,
  onSelectSlot,
  compact = false,
}: {
  page: AlbumPageTemplate;
  product?: Product;
  assignments: Record<string, AlbumSlotAssignment>;
  photos: Map<string, LocalAlbumPhoto>;
  textValues: Record<string, string>;
  activeSlotId?: string;
  onSelectSlot?: (slot: AlbumPhotoSlot) => void;
  compact?: boolean;
}) {
  const isSpread = page.type === "inside-spread";
  const aspectRatio = isSpread ? "1.62 / 1" : "1 / 1";
  const backdropStyle = albumPageBackdropStyle(page.backgroundColor, product);

  return (
    <div
      className={`relative overflow-hidden bg-white shadow-[0_8px_24px_rgba(15,23,42,0.2)] ${compact ? "" : "ring-1 ring-slate-900/5"}`}
      style={{
        aspectRatio,
        ...backdropStyle,
        containerType: "inline-size",
      }}
    >
      {page.type === "inside-spread" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none overflow-hidden"
          style={backdropStyle}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.65),transparent)]" />
          <div className="absolute bottom-0 left-1/2 top-0 w-6 -translate-x-1/2 bg-gradient-to-r from-transparent via-slate-950/10 to-transparent" />
          <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-slate-950/20" />
        </div>
      ) : page.backgroundImage ? (
        <img
          src={page.backgroundImage}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-100"
          style={{ imageRendering: "-webkit-optimize-contrast" }}
        />
      ) : null}
      <span className="pointer-events-none absolute left-3 top-3 z-[2] rounded-full bg-white/80 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#07142f] shadow-sm backdrop-blur">
        {page.label}
      </span>
      {page.slots.map((slot, index) => {
        const assignment = assignments[slot.id];
        const photo = assignment ? photos.get(assignment.photoId) : undefined;
        const source = photoSource(photo);
        const selected = activeSlotId === slot.id;
        const content = source ? (
          <img
            src={source}
            alt={photo?.fileName || `Selected photo ${index + 1}`}
            className="h-full w-full object-cover"
            style={{
              objectPosition: objectPosition(assignment),
              transform: `scale(${assignment?.scale ?? 1})`,
            }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-white p-[6%] text-center shadow-inner">
            <span className="grid h-full w-full place-items-center rounded-[18%] bg-ikonnic-red px-[6%] py-[4%] font-sans font-black uppercase leading-[1.05] tracking-tight text-white shadow-[0_4px_14px_rgba(183,110,121,0.38)] transition-transform hover:scale-[1.02]">
              <span className="text-[clamp(8px,7.5cqw,28px)]">
                SELECT<br />PHOTO
              </span>
            </span>
          </span>
        );

        const className = `absolute z-10 overflow-hidden border bg-white shadow-[0_3px_10px_rgba(15,23,42,0.18)] transition ${
          selected
            ? "border-ikonnic-red ring-2 ring-ikonnic-red ring-offset-2"
            : source
              ? "border-white/80"
              : "border-dashed border-ikonnic-red/60 hover:border-ikonnic-red"
        }`;
        const style = slotStyle(slot);

        if (!onSelectSlot) {
          return (
            <div key={slot.id} className={className} style={style}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelectSlot(slot)}
            className={`${className} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2`}
            style={style}
            aria-label={
              source
                ? `Replace ${page.label} photo ${index + 1}`
                : `Select ${page.label} photo ${index + 1}`
            }
          >
            {content}
          </button>
        );
      })}
      {page.textFields?.map((field) => {
        const value = textValues[field.id] ?? field.defaultValue ?? "";
        if (!value) return null;
        return (
          <span
            key={field.id}
            className="pointer-events-none absolute z-20 whitespace-pre-wrap font-extrabold leading-tight"
            style={{
              left: `${field.x}%`,
              top: `${field.y}%`,
              width: field.width ? `${field.width}%` : undefined,
              color: field.color ?? "#07142f",
              fontSize: `${compact ? Math.max(1.4, (field.fontSize ?? 3) * 0.6) : field.fontSize ?? 3}cqw`,
              textAlign: field.align ?? "left",
            }}
          >
            {value}
          </span>
        );
      })}
    </div>
  );
}

export function AlbumCustomizerPanel({
  product,
  initialOptions,
}: {
  product: Product;
  initialOptions?: InitialAlbumOptions;
}) {
  const template = useMemo(() => getAlbumTemplate(product), [product]);
  const customizerTemplate = useMemo(
    () =>
      customizerTemplateByProductSlug[product.slug] ??
      (product.customizerTemplateId
        ? customizerTemplateById[product.customizerTemplateId]
        : undefined),
    [product.customizerTemplateId, product.slug],
  );
  const albumSizeOptions = useMemo<AlbumVariantOption[]>(() => {
    const source = product.sizeOptions?.length
      ? product.sizeOptions
      : customizerTemplate?.sizeOptions;
    if (!source?.length) {
      return [{ label: "Standard album", price: product.price }];
    }
    return source.map((option: ProductOption) => ({
      label: option.label,
      price: option.priceDelta ?? product.price,
      disabled: option.disabled,
    }));
  }, [customizerTemplate?.sizeOptions, product.price, product.sizeOptions]);
  const albumThicknessOptions = useMemo<AlbumVariantOption[]>(() => {
    const source = product.thicknessOptions?.length
      ? product.thicknessOptions
      : customizerTemplate?.thicknessOptions;
    return (source ?? []).map((option: ProductOption) => ({
      label: option.label,
      price: option.priceDelta ?? 0,
      disabled: option.disabled,
    }));
  }, [customizerTemplate?.thicknessOptions, product.thicknessOptions]);
  const addItem = useCartStore((state) => state.addItem);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const pendingSlotIdRef = useRef<string | undefined>(undefined);
  const [editor, setEditor] = useState<AlbumEditorDraft>(() => ({
    templateId: template?.id ?? "",
    templateVersion: template?.version,
    activePageIndex: 0,
    uploadedPhotos: [],
    slotAssignments: {},
    textValues: {},
  }));
  const [activeSlotId, setActiveSlotId] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ complete: 0, total: 0 });
  const [showCrossSellPopup, setShowCrossSellPopup] = useState(false);
  const [selectedSize, setSelectedSize] = useState(
    () =>
      albumSizeOptions.find(
        (option) => option.label === initialOptions?.size && !option.disabled,
      )?.label ??
      albumSizeOptions.find((option) => !option.disabled)?.label ??
      albumSizeOptions[0]?.label ??
      "Standard album",
  );
  const [selectedThickness, setSelectedThickness] = useState(
    () =>
      albumThicknessOptions.find(
        (option) => option.label === initialOptions?.thickness && !option.disabled,
      )?.label ??
      albumThicknessOptions.find((option) => !option.disabled)?.label ??
      albumThicknessOptions[0]?.label ??
      "",
  );

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    if (!template) return;
    setEditor({
      templateId: template.id,
      templateVersion: template.version,
      activePageIndex: 0,
      uploadedPhotos: [],
      slotAssignments: {},
      textValues: {},
    });
    pendingSlotIdRef.current = undefined;
    setActiveSlotId(undefined);
    setNotice("");
    setError("");
  }, [template?.id]);

  useEffect(() => {
    if (!reviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [reviewOpen]);

  const allSlots = useMemo(
    () => template?.pages.flatMap((page) => page.slots) ?? [],
    [template],
  );
  const requiredSlots = useMemo(
    () => allSlots.filter((slot) => slot.required),
    [allSlots],
  );
  const photoById = useMemo(
    () => new Map(editor.uploadedPhotos.map((photo) => [photo.id, photo])),
    [editor.uploadedPhotos],
  );
  const missingRequiredSlots = useMemo(
    () =>
      requiredSlots.filter((slot) => {
        const assignment = editor.slotAssignments[slot.id];
        return !assignment || !photoById.has(assignment.photoId);
      }),
    [editor.slotAssignments, photoById, requiredSlots],
  );
  const requiredAssignmentPhotoIds = useMemo(() => {
    const photoIds = new Set<string>();
    requiredSlots.forEach((slot) => {
      const assignment = editor.slotAssignments[slot.id];
      if (assignment && photoById.has(assignment.photoId)) {
        photoIds.add(assignment.photoId);
      }
    });
    return photoIds;
  }, [editor.slotAssignments, photoById, requiredSlots]);
  const duplicateRequiredSlotIds = useMemo(() => {
    const seenPhotoIds = new Set<string>();
    const duplicates: string[] = [];
    requiredSlots.forEach((slot) => {
      const assignment = editor.slotAssignments[slot.id];
      if (!assignment || !photoById.has(assignment.photoId)) return;
      if (seenPhotoIds.has(assignment.photoId)) {
        duplicates.push(slot.id);
        return;
      }
      seenPhotoIds.add(assignment.photoId);
    });
    return duplicates;
  }, [editor.slotAssignments, photoById, requiredSlots]);

  if (!template) return null;

  const activePage = template.pages[editor.activePageIndex] ?? template.pages[0];
  const completedRequiredSlots = requiredAssignmentPhotoIds.size;
  const albumIsComplete =
    editor.uploadedPhotos.length === template.requiredPhotoCount &&
    missingRequiredSlots.length === 0 &&
    duplicateRequiredSlotIds.length === 0 &&
    completedRequiredSlots === template.requiredPhotoCount;
  const productName = displayTitle(product);
  const selectedSizeOption =
    albumSizeOptions.find((option) => option.label === selectedSize) ??
    albumSizeOptions[0];
  const selectedThicknessOption = albumThicknessOptions.find(
    (option) => option.label === selectedThickness,
  );
  const selectedSizePrice = selectedSizeOption?.price ?? product.price;
  const selectedThicknessPrice = selectedThicknessOption?.price ?? 0;
  const selectedPrice = selectedSizePrice + selectedThicknessPrice;
  const photoLibraryLimit = template.requiredPhotoCount;

  const findPageIndexForSlot = (slotId: string) =>
    template.pages.findIndex((page) => page.slots.some((slot) => slot.id === slotId));

  const selectSlot = (slot: AlbumPhotoSlot) => {
    if (isSaving) return;
    pendingSlotIdRef.current = slot.id;
    setActiveSlotId(slot.id);
    setError("");
    if (!editor.slotAssignments[slot.id]) {
      setNotice("Choose one or more photos to place in this album slot.");
      // Keep this synchronous with the slot click so mobile browsers allow the
      // hidden file input to open as a user-initiated action.
      inputRef.current?.click();
    } else {
      setNotice("Choose a photo from the library below to place it in this slot.");
    }
  };

  const selectPhotoForSlot = (photoId: string) => {
    const targetSlotId =
      pendingSlotIdRef.current ??
      activeSlotId ??
      allSlots.find((slot) => !editor.slotAssignments[slot.id])?.id;
    if (!targetSlotId) {
      setNotice("All album slots already have photos. Select a slot to replace its photo.");
      return;
    }

    const targetSlot = requiredSlots.find((slot) => slot.id === targetSlotId);
    const photoIsUsedByAnotherRequiredSlot = requiredSlots.some(
      (slot) =>
        slot.id !== targetSlotId &&
        editor.slotAssignments[slot.id]?.photoId === photoId,
    );
    if (targetSlot && photoIsUsedByAnotherRequiredSlot) {
      setError("Each required album slot needs its own photo. Choose another upload for this slot.");
      setNotice("Duplicate photo placement is blocked for the 55-photo album edition.");
      return;
    }

    const pageIndex = findPageIndexForSlot(targetSlotId);
    setEditor((current) => ({
      ...current,
      activePageIndex: pageIndex >= 0 ? pageIndex : current.activePageIndex,
      slotAssignments: {
        ...current.slotAssignments,
        [targetSlotId]: { photoId, position: { x: 0, y: 0 }, scale: 1 },
      },
    }));
    pendingSlotIdRef.current = targetSlotId;
    setActiveSlotId(targetSlotId);
    setError("");
    setNotice("Photo placed. Select another slot or continue to the next page.");
  };

  const clearActiveSlot = () => {
    if (!activeSlotId) return;
    setEditor((current) => {
      const { [activeSlotId]: _, ...slotAssignments } = current.slotAssignments;
      return { ...current, slotAssignments };
    });
    setNotice("Photo removed from this slot.");
  };

  const removePhoto = (photoId: string) => {
    const photo = photoById.get(photoId);
    if (photo?.localUrl) {
      URL.revokeObjectURL(photo.localUrl);
      objectUrlsRef.current.delete(photo.localUrl);
    }
    setEditor((current) => ({
      ...current,
      uploadedPhotos: current.uploadedPhotos.filter((candidate) => candidate.id !== photoId),
      slotAssignments: Object.fromEntries(
        Object.entries(current.slotAssignments).filter(
          ([, assignment]) => assignment.photoId !== photoId,
        ),
      ),
    }));
    setError("");
    setNotice("Photo removed. Any album slot using it is ready for a replacement.");
  };

  const updateTextField = (fieldId: string, value: string) => {
    setEditor((current) => ({
      ...current,
      textValues: { ...current.textValues, [fieldId]: value },
    }));
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const invalid = files.filter(
      (file) =>
        !SUPPORTED_ALBUM_IMAGE_TYPES.has(file.type) ||
        file.size > MAX_ALBUM_FILE_SIZE,
    );
    const validFiles = files.filter(
      (file) =>
        SUPPORTED_ALBUM_IMAGE_TYPES.has(file.type) &&
        file.size <= MAX_ALBUM_FILE_SIZE,
    );
    const availableCount = Math.max(
      0,
      photoLibraryLimit - editor.uploadedPhotos.length,
    );
    const acceptedFiles = validFiles.slice(0, availableCount);

    if (!acceptedFiles.length) {
      setError(
        availableCount
          ? "Choose JPG, PNG, or WEBP photos smaller than 15MB."
          : `This ${template.requiredPhotoCount}-photo album is full. Remove a photo before adding a replacement.`,
      );
      return;
    }

    const newPhotos = acceptedFiles.map((file, index): LocalAlbumPhoto => {
      const localUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(localUrl);
      return {
        id: `album-photo-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        localUrl,
        file,
      };
    });

    const requestedSlotId = pendingSlotIdRef.current ?? activeSlotId;
    setEditor((current) => {
      const preferredSlot = requestedSlotId
        ? allSlots.find((slot) => slot.id === requestedSlotId)
        : undefined;
      const emptySlots = allSlots.filter(
        (slot) => !current.slotAssignments[slot.id] && slot.id !== preferredSlot?.id,
      );
      const assignmentTargets = preferredSlot ? [preferredSlot, ...emptySlots] : emptySlots;
      const slotAssignments = { ...current.slotAssignments };
      newPhotos.forEach((photo, index) => {
        const target = assignmentTargets[index];
        if (target) {
          slotAssignments[target.id] = {
            photoId: photo.id,
            position: { x: 0, y: 0 },
            scale: 1,
          };
        }
      });
      return {
        ...current,
        uploadedPhotos: [...current.uploadedPhotos, ...newPhotos],
        slotAssignments,
      };
    });
    const preferredSlotId = requestedSlotId && allSlots.some((slot) => slot.id === requestedSlotId)
      ? requestedSlotId
      : allSlots.find((slot) => !editor.slotAssignments[slot.id])?.id;
    if (preferredSlotId) {
      pendingSlotIdRef.current = preferredSlotId;
      setActiveSlotId(preferredSlotId);
    }

    const excluded = files.length - acceptedFiles.length;
    setError("");
    setNotice(
      `${acceptedFiles.length} photo${acceptedFiles.length === 1 ? "" : "s"} added to your photo library. Any available slots were filled.${
        invalid.length || excluded
          ? " Unsupported, oversized, or excess files were skipped."
          : ""
      }`,
    );
  };

  const goToPage = (nextIndex: number) => {
    setEditor((current) => ({
      ...current,
      activePageIndex: Math.min(Math.max(nextIndex, 0), template.pages.length - 1),
    }));
    pendingSlotIdRef.current = undefined;
    setActiveSlotId(undefined);
    setError("");
    setNotice("");
  };

  const goNext = () => {
    if (editor.activePageIndex === template.pages.length - 1) {
      setReviewOpen(true);
      return;
    }
    goToPage(editor.activePageIndex + 1);
  };

  const openReview = () => {
    setError("");
    setReviewOpen(true);
  };

  const goToFirstPhotoIssue = () => {
    const firstSlotId =
      missingRequiredSlots[0]?.id ?? duplicateRequiredSlotIds[0];
    if (!firstSlotId) return;
    const index = findPageIndexForSlot(firstSlotId);
    setReviewOpen(false);
    if (index >= 0) goToPage(index);
    pendingSlotIdRef.current = firstSlotId;
    setActiveSlotId(firstSlotId);
    setError(
      missingRequiredSlots.some((slot) => slot.id === firstSlotId)
        ? "This required photo slot still needs a photo."
        : "Choose a different photo for this slot so every required placement is unique.",
    );
  };

  const addAlbumToCart = async () => {
    if (!albumIsComplete) {
      goToFirstPhotoIssue();
      return;
    }
    const assignedPhotoIds = Array.from(
      new Set(Object.values(editor.slotAssignments).map((assignment) => assignment.photoId)),
    );
    const selectedPhotos = editor.uploadedPhotos.filter((photo) =>
      assignedPhotoIds.includes(photo.id),
    );
    if (!selectedPhotos.length) {
      setError("Please select photos before adding this album to cart.");
      return;
    }

    setIsSaving(true);
    setSaveProgress({ complete: 0, total: selectedPhotos.length });
    try {
      const coverPage = template.pages.find((page) => page.type === "front-cover") ?? template.pages[0];
      const coverPreview = await createAlbumPreview(
        coverPage,
        editor.slotAssignments,
        photoById,
        editor.textValues,
      );
      const { uploaded, coverResult } = await uploadAlbumPhotos(
        product.id,
        selectedPhotos,
        coverPreview,
        (complete, total) => setSaveProgress({ complete, total }),
      );
      const coverUrl = coverResult.cdnUrl || coverResult.url;

      const persistedPhotos = selectedPhotos.map((photo) => {
        const result = uploaded.get(photo.id);
        if (!result) throw new Error("A selected photo was not saved");
        return {
          id: photo.id,
          fileName: photo.fileName,
          remoteUrl: result.cdnUrl || result.url,
          storageKey: result.key,
        };
      });
      const assignedSlots = allSlots.flatMap((slot, index) => {
        const assignment = editor.slotAssignments[slot.id];
        const result = assignment ? uploaded.get(assignment.photoId) : undefined;
        if (!assignment || !result) return [];
        const url = result.cdnUrl || result.url;
        return [
          {
            originalUrl: url,
            croppedUrl: url,
            backgroundRemovedUrl: "",
            position: assignment.position ?? { x: 0, y: 0 },
            scale: assignment.scale ?? 1,
            rotation: slot.rotation ?? 0,
            crop: { x: 0, y: 0, width: 100, height: 100 },
            qualityScore: "original-upload",
            slot: index + 1,
            storageKey: result.key,
            originalFileName: result.originalName || "album-photo",
          },
        ];
      });
      const persistedEditor: AlbumEditorState = {
        templateId: template.id,
        templateVersion: template.version,
        templateSnapshot: {
          id: template.id,
          version: template.version,
          productId: template.productId,
          pageCount: template.pageCount,
          requiredPhotoCount: template.requiredPhotoCount,
          galleryViews: template.galleryViews,
          pages: template.pages,
        },
        activePageIndex: editor.activePageIndex,
        uploadedPhotos: persistedPhotos,
        slotAssignments: editor.slotAssignments,
        textValues: editor.textValues,
        coverPreview: coverUrl,
      };
      const customisationJson: ProductCustomisation = {
        productId: product.id,
        templateId: template.id,
        uploadedImages: assignedSlots,
        texts: [],
        selectedOptions: {
          size: selectedSize,
          thickness: selectedThickness || "Standard",
          frameColor: "Template artwork",
          border: "Template artwork",
          background: "Template artwork",
          quantity: 1,
        },
        previewImage: coverUrl,
        printFile: coverUrl,
        priceSnapshot: {
          basePrice: selectedSizePrice,
          optionsPrice: selectedThicknessPrice,
          discount: 0,
          finalPrice: selectedPrice,
        },
        album: persistedEditor,
      };

      addItem({
        id: `ikonnic-album-${Date.now()}`,
        productId: product.id,
        productSlug: product.slug,
        productName,
        slug: product.slug,
        title: productName,
        categorySlug: product.categorySlug,
        category: product.categoryName,
        image: coverUrl,
        thumbnail: coverUrl,
        price: selectedPrice,
        unitPrice: selectedPrice,
        finalTotal: selectedPrice,
        optionsPrice: selectedThicknessPrice,
        discount: 0,
        quantity: 1,
        selectedOptions: {
          shape: "album",
          size: selectedSize,
          thickness: selectedThickness || "Standard",
          frameColor: "Template artwork",
          border: "Template artwork",
          background: "Template artwork",
          photos: `${template.requiredPhotoCount} required photos`,
          quantity: 1,
        },
        uploadedImagePreview: coverUrl,
        uploadedImageReference: persistedPhotos.map((photo) => photo.storageKey).join(","),
        previewImage: coverUrl,
        customisation: {
          album: persistedEditor,
          selectedOptions: {
            templateId: template.id,
            pageCount: template.pageCount,
            requiredPhotoCount: template.requiredPhotoCount,
            size: selectedSize,
            thickness: selectedThickness || "Standard",
            basePrice: selectedSizePrice,
            optionsPrice: selectedThicknessPrice,
            finalPrice: selectedPrice,
          },
        },
        customisationJson,
      });
      setReviewOpen(false);
      setShowCrossSellPopup(true);
    } catch {
      setError("We could not securely save this album. Your placed photos are still available—please try again.");
      setReviewOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-68px)] bg-[#f4f5f7] pb-12 text-[#07142f]">
      <div className="mx-auto max-w-[1240px] px-4 pb-4 pt-5 sm:px-6">
        <Breadcrumbs
          items={[
            { label: product.categoryName, href: `/category/${product.categorySlug}` },
            { label: productName, href: `/product/${product.slug}` },
            { label: "Customize album" },
          ]}
        />
      </div>

      <div className="mx-auto grid max-w-[1240px] gap-7 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#dfe4ec] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ikonnic-red px-4 text-sm font-black text-white shadow-sm transition hover:bg-rosegold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                <Upload size={18} />
                {editor.uploadedPhotos.length
                  ? `Upload photos (${editor.uploadedPhotos.length}/${template.requiredPhotoCount})`
                  : `Upload ${template.requiredPhotoCount} photos`}
              </button>
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                <Images size={16} />
                {editor.uploadedPhotos.length}/{template.requiredPhotoCount} uploaded
              </span>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-black uppercase tracking-[0.11em] text-slate-500">Unique required photos</p>
              <p className="mt-0.5 text-sm font-black text-[#07142f]">
                {completedRequiredSlots} of {template.requiredPhotoCount} placed
              </p>
            </div>
          </div>

          {notice ? <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">{notice}</p> : null}
          {error ? <p role="alert" className="flex items-start gap-2 rounded-xl border border-rosegold-200 bg-rosegold-50 px-4 py-3 text-sm font-bold text-ikonnic-red"><AlertCircle className="mt-0.5 shrink-0" size={17} />{error}</p> : null}

          <div className="rounded-2xl border border-[#e7e9ed] bg-[#eef0f2] p-3 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Album page</p>
                <h1 className="mt-1 text-xl font-black text-[#07142f] sm:text-2xl">{activePage.label}</h1>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#07142f] shadow-sm">
                {editor.activePageIndex + 1} of {template.pageCount}
              </span>
            </div>
            <div className="mx-auto max-w-[720px]">
              <AlbumPageCanvas
                page={activePage}
                product={product}
                assignments={editor.slotAssignments}
                photos={photoById}
                textValues={editor.textValues}
                activeSlotId={activeSlotId}
                onSelectSlot={selectSlot}
              />
            </div>
            {activePage.textFields?.length ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-[#dfe4ec] bg-white p-3 sm:grid-cols-2">
                {activePage.textFields.map((field) => (
                  <label key={field.id} className="block text-xs font-black text-[#07142f]">
                    {field.label}
                    <input
                      type="text"
                      value={editor.textValues[field.id] ?? field.defaultValue ?? ""}
                      maxLength={field.maxLength}
                      onChange={(event) => updateTextField(field.id, event.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-[#dfe4ec] bg-white px-3 text-sm font-semibold text-[#07142f] outline-none transition focus:border-ikonnic-red focus:ring-2 focus:ring-rosegold-100"
                    />
                  </label>
                ))}
              </div>
            ) : null}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToPage(editor.activePageIndex - 1)}
                disabled={editor.activePageIndex === 0 || isSaving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dfe4ec] bg-white px-4 text-sm font-black text-[#07142f] transition hover:border-rosegold-300 hover:bg-rosegold-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={18} /> Previous
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#07142f] px-4 text-sm font-black text-white transition hover:bg-[#10224b] disabled:cursor-wait disabled:opacity-60"
              >
                {editor.activePageIndex === template.pageCount - 1 ? "Review album" : "Next"}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <section className="rounded-2xl border border-[#dfe4ec] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#07142f]">Photo library</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">Upload exactly {template.requiredPhotoCount} photos. Click a page slot, then choose its unique photo to place or replace it.</p>
              </div>
              {activeSlotId ? (
                <button type="button" onClick={clearActiveSlot} className="rounded-lg border border-rosegold-200 bg-rosegold-50 px-3 py-2 text-xs font-black text-ikonnic-red hover:bg-rosegold-100">
                  Clear selected slot
                </button>
              ) : null}
            </div>
            {editor.uploadedPhotos.length ? (
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                {editor.uploadedPhotos.map((photo) => {
                  const selected = activeSlotId && editor.slotAssignments[activeSlotId]?.photoId === photo.id;
                  return (
                    <div key={photo.id} className="group relative aspect-square">
                      <button
                        type="button"
                        onClick={() => selectPhotoForSlot(photo.id)}
                        disabled={isSaving}
                        className={`h-full w-full overflow-hidden rounded-xl border-2 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red focus-visible:ring-offset-2 disabled:opacity-60 ${selected ? "border-ikonnic-red" : "border-transparent hover:border-rosegold-300"}`}
                        aria-label={`Place ${photo.fileName}`}
                      >
                        <img src={photoSource(photo)} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        disabled={isSaving}
                        aria-label={`Remove ${photo.fileName}`}
                        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-slate-950/75 text-white opacity-0 shadow-sm transition hover:bg-ikonnic-red focus:opacity-100 group-hover:opacity-100 disabled:cursor-wait"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-rosegold-200 bg-rosegold-50/40 text-center transition hover:border-ikonnic-red hover:bg-rosegold-50">
                <ImagePlus size={26} className="text-ikonnic-red" />
                <span className="mt-2 text-sm font-black text-[#07142f]">Upload {template.requiredPhotoCount} photos to start placing them</span>
                <span className="mt-1 text-xs font-semibold text-slate-500">JPG, PNG, or WEBP, up to 15MB each</span>
              </button>
            )}
          </section>
        </section>

        <aside className="min-w-0 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-[#dfe4ec] bg-white p-5 shadow-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-rosegold-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-ikonnic-red"><BookOpen size={15} /> Photo album</span>
            <h2 className="mt-4 text-2xl font-black leading-tight text-[#07142f]">{productName}</h2>
            <p className="mt-4 text-3xl font-black text-ikonnic-red">₹{selectedPrice.toLocaleString("en-IN")}</p>
            {albumSizeOptions.length > 1 ? (
              <div className="mt-5">
                <p className="text-sm font-black text-[#07142f]">Album size</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {albumSizeOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      disabled={option.disabled || isSaving}
                      onClick={() => setSelectedSize(option.label)}
                      className={`rounded-lg border px-3 py-2 text-xs font-black transition ${selectedSize === option.label ? "border-ikonnic-red bg-ikonnic-red text-white" : "border-[#dfe4ec] bg-white text-[#07142f] hover:border-rosegold-300"} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {albumThicknessOptions.length ? (
              <div className="mt-4">
                <p className="text-sm font-black text-[#07142f]">Thickness</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {albumThicknessOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      disabled={option.disabled || isSaving}
                      onClick={() => setSelectedThickness(option.label)}
                      className={`rounded-lg border px-3 py-2 text-xs font-black transition ${selectedThickness === option.label ? "border-ikonnic-red bg-ikonnic-red text-white" : "border-[#dfe4ec] bg-white text-[#07142f] hover:border-rosegold-300"} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      {option.label}{option.price ? ` (+₹${option.price.toLocaleString("en-IN")})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-5 rounded-xl border border-[#dfe4ec] bg-[#f8fafc] p-4">
              <div className="flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">Template</span><span className="font-black text-[#07142f]">{template.pageCount} pages</span></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">Required photos</span><span className="font-black text-[#07142f]">{template.requiredPhotoCount}</span></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="font-semibold text-slate-500">Placed uniquely</span><span className={`font-black ${albumIsComplete ? "text-emerald-700" : "text-amber-700"}`}>{completedRequiredSlots}/{template.requiredPhotoCount}</span></div>
            </div>
            <button type="button" onClick={openReview} disabled={isSaving} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-ikonnic-red px-4 text-base font-black text-white shadow-[0_9px_18px_rgba(183,110,121,0.2)] transition hover:bg-rosegold-600 disabled:cursor-wait disabled:opacity-60"><ShoppingCart size={20} /> Review & add to cart</button>
            <p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-500">Review every template page before the placed photos are securely saved to your cart.</p>
          </div>
        </aside>
      </div>

      <input ref={inputRef} type="file" accept={ALBUM_IMAGE_ACCEPT} multiple className="hidden" onChange={handleFiles} />

      {reviewOpen ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="album-review-title" onKeyDown={(event) => { if (event.key === "Escape" && !isSaving) setReviewOpen(false); }}>
          <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#e7e9ed] px-5 py-4 sm:px-6">
              <div><h2 id="album-review-title" className="text-xl font-black text-[#07142f]">Review your album</h2><p className="mt-1 text-sm font-semibold text-slate-500">Check the placed photos on each configured page before adding to cart.</p></div>
              <button type="button" onClick={() => setReviewOpen(false)} disabled={isSaving} aria-label="Close album review" className="grid size-9 shrink-0 place-items-center rounded-full bg-rosegold-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"><X size={18} /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-5 sm:px-6">
              {!albumIsComplete ? (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={19} /><p className="text-sm font-bold text-amber-900">{missingRequiredSlots.length ? `${missingRequiredSlots.length} required photo slot${missingRequiredSlots.length === 1 ? " is" : "s are"} empty.` : `${duplicateRequiredSlotIds.length} required placement${duplicateRequiredSlotIds.length === 1 ? " repeats" : "s repeat"} a photo.`} Upload and place {template.requiredPhotoCount} different photos before adding this album to cart.</p></div><button type="button" onClick={goToFirstPhotoIssue} className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-xs font-black text-white hover:bg-amber-800">Go to first photo issue</button></div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><CheckCircle2 size={19} />All {template.requiredPhotoCount} unique required photo slots are complete.</div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {template.pages.map((page, index) => {
                  const incomplete = page.slots.filter((slot) => slot.required && !editor.slotAssignments[slot.id]).length;
                  const duplicates = page.slots.filter((slot) => duplicateRequiredSlotIds.includes(slot.id)).length;
                  return <button key={page.id} type="button" onClick={() => { setReviewOpen(false); goToPage(index); }} className={`overflow-hidden rounded-xl border-2 bg-[#f7f8fa] p-1 text-left transition hover:border-rosegold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ikonnic-red ${index === editor.activePageIndex ? "border-ikonnic-red" : "border-transparent"}`}><AlbumPageCanvas page={page} product={product} assignments={editor.slotAssignments} photos={photoById} textValues={editor.textValues} compact /><span className="flex items-center justify-between gap-2 px-2 py-2 text-[11px] font-black text-[#07142f]"><span className="truncate">{index + 1}. {page.label}</span>{incomplete || duplicates ? <span className="shrink-0 text-amber-700">{incomplete ? `${incomplete} empty` : `${duplicates} repeat`}</span> : <CheckCircle2 className="shrink-0 text-emerald-600" size={14} />}</span></button>;
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#e7e9ed] bg-[#f8fafc] px-5 py-4 sm:flex-row sm:justify-end sm:px-6"><button type="button" onClick={() => setReviewOpen(false)} disabled={isSaving} className="min-h-11 rounded-xl border border-[#dfe4ec] bg-white px-5 text-sm font-black text-[#07142f] transition hover:bg-rosegold-50 disabled:opacity-50">Back to editor</button><button type="button" onClick={addAlbumToCart} disabled={isSaving || !albumIsComplete} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#07142f] px-5 text-sm font-black text-white transition hover:bg-[#10224b] disabled:cursor-not-allowed disabled:opacity-45">{isSaving ? <><Loader2 size={17} className="animate-spin" />Saving {saveProgress.complete}/{saveProgress.total}</> : <><ShoppingCart size={17} />Add album to cart</>}</button></div>
          </div>
        </div>
      ) : null}

      <CrossSellPopup isOpen={showCrossSellPopup} onClose={() => setShowCrossSellPopup(false)} addedProductId={product.id} categorySlug={product.categorySlug} />
    </main>
  );
}
