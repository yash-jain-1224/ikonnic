import { getAlbumCoverLayout } from "@/data/albumCoverLayouts";
import {
  customizerTemplateById,
  customizerTemplateByProductSlug,
} from "@/data/customizerTemplates";
import type {
  AlbumGalleryView,
  AlbumPageTemplate,
  AlbumPhotoSlot,
  AlbumTemplate,
  CustomizerTemplate,
  Product,
} from "@/types";

type AlbumProfileId = "travel" | "birthday" | "family" | "default";

type InteriorLayout = {
  id: string;
  label: string;
  type?: AlbumPageTemplate["type"];
  slots: Omit<AlbumPhotoSlot, "id">[];
  backgroundColor: string;
};

type AlbumEditionId = "standard-24-page";

type AlbumEdition = {
  id: AlbumEditionId;
  pageCount: number;
  requiredPhotoCount: number;
  interiorPageCount: number;
  basePhotosPerInteriorPage: number;
  enhancedPhotosPerInteriorPage: number;
};

type InteriorLayoutSelection = {
  twoPhoto: string[];
  threePhoto: string[];
};

type AlbumGalleryViewDefinition = Omit<AlbumGalleryView, "image"> & {
  imageIndex: number;
};

type AlbumProfile = {
  id: AlbumProfileId;
  version: string;
  editionId: AlbumEditionId;
  defaultCoverSlotCount: number;
  coverBackgroundColor: string;
  backBackgroundColor: string;
  backCoverSlots: Omit<AlbumPhotoSlot, "id">[];
  galleryViews: AlbumGalleryViewDefinition[];
  interiorLayoutSelection: InteriorLayoutSelection;
  interiorLayouts: InteriorLayout[];
};

// Album editions are data, not editor assumptions. Profiles opt into an
// edition and provide their own visual layout selection below, so future
// sizes/counts can be added without changing the customizer flow.
const albumEditions: Record<AlbumEditionId, AlbumEdition> = {
  "standard-24-page": {
    id: "standard-24-page",
    pageCount: 24,
    requiredPhotoCount: 55,
    interiorPageCount: 22,
    basePhotosPerInteriorPage: 2,
    enhancedPhotosPerInteriorPage: 3,
  },
};

const standardAlbumGalleryViews: AlbumGalleryViewDefinition[] = [
  {
    id: "front-cover",
    label: "Front cover",
    type: "front-cover",
    imageIndex: 0,
  },
  {
    id: "back-cover",
    label: "Front & back covers",
    type: "back-cover",
    imageIndex: 2,
  },
  {
    id: "inside-spread-1",
    label: "Inside spread",
    type: "inside-spread",
    imageIndex: 3,
  },
];

type AlbumGalleryAssetOverride = {
  backCover?: string;
  insideSpread?: string;
};

const omgsAlbumBackCoverAssetSlugs = new Set([
  "knocked-once-entered-forever-house-warming-photo-album",
  "new-house-same-love-bigger-dreams-house-warming-photo-album",
  "wildlife-travel-photo-album",
  "snow-travel-photo-album",
  "mountain-travel-photo-album",
  "beach-travel-photo-album",
  "family-memories-photo-album-all-together-as-a-family",
  "family-memories-photo-album",
  "fathers-day-for-the-best-man-in-the-world",
  "home-heart-happiness-house-warming-photo-album",
  "house-warming-memories-photo-album",
  "sweet-home-house-warming-photo-album",
  "divine-house-warming-photo-album",
  "house-warming-photo-album",
  "time-to-travel-travel-photobook-4",
  "world-explorers-travel-photobook-3",
  "wanderlust-travel-photobook-2",
  "travel-photobook-1",
  "he-she-anniversary-photo-album",
  "anniversary-photo-album-5",
  "anniversary-photo-album-4",
  "anniversary-photo-album-3",
  "anniversary-photo-album-2",
  "anniversary-photo-album",
  "birthday-custom-name-photo-book",
  "birthday-photo-celebration-photo-book",
  "lets-celebrate-birthday-photo-book",
  "baby-birthday-celebrations-photo-book",
  "birthday-celebrations-photo-book",
  "birthday-photo-book-purple",
  "birthday-photo-album-blue",
  "birthday-photo-album",
  "pink-birthday-photo-album",
  "kids-baby-purple-photo-album",
  "kids-baby-album",
  "floral-photo-book",
  "photo-book-baby",
]);

// Curated and source-specific album records override generated gallery indexes
// when their imported asset sequence differs from the standard catalogue order.
const curatedAlbumGalleryAssets: Record<string, AlbumGalleryAssetOverride> = {
  "fathers-day-for-the-best-man-in-the-world": {
    insideSpread: "/images/omgs-reference/product/eff492c68a37c1c9.jpg",
  },
  "bts-our-moments-our-stories-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/time-to-travel-travel-photobook-4.jpg",
    insideSpread: "/images/omgs-reference/product/7eea5f03dc6943de.jpg",
  },
  "happy-family-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/anniversary-photo-album.jpg",
    insideSpread: "/images/omgs-reference/product/d8f0d74385c05dc2.jpg",
  },
  "my-1st-year-birthday-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/birthday-photo-album.jpg",
    insideSpread: "/images/omgs-reference/product/9d73bed976c81fd1.jpg",
  },
  "bts-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/birthday-custom-name-photo-book.jpg",
    insideSpread: "/images/omgs-reference/product/cd563d0a8871514c.jpg",
  },
  "couples-love-story-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/travel-photobook-1.jpg",
    insideSpread: "/images/omgs-reference/product/ea4313669e31d74f.jpg",
  },
  "golden-wedding-anniversary-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/kids-baby-album.jpg",
    insideSpread: "/images/omgs-reference/product/c911c06fdc2d782e.jpg",
  },
  "travel-memories-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/home-heart-happiness-house-warming-photo-album.jpg",
    insideSpread: "/images/omgs-reference/product/5f199246e8dac790.jpg",
  },
  "my-family-my-world-personalised-photo-album": {
    backCover:
      "/images/omgs-reference/album-back-covers/pink-birthday-photo-album.jpg",
    insideSpread: "/images/omgs-reference/product/beba15f68bf6788a.jpg",
  },
};

const rectangleSlot = (
  x: number,
  y: number,
  width: number,
  height: number,
  required = true,
): Omit<AlbumPhotoSlot, "id"> => ({
  x,
  y,
  width,
  height,
  required,
  shape: "rectangle",
});

const albumProfiles: Record<AlbumProfileId, AlbumProfile> = {
  travel: {
    id: "travel",
    version: "2.1.0",
    editionId: "standard-24-page",
    defaultCoverSlotCount: 2,
    coverBackgroundColor: "#dce8e6",
    backBackgroundColor: "#243f42",
    backCoverSlots: [
      { ...rectangleSlot(24, 22, 52, 56), borderRadius: "4%" },
    ],
    galleryViews: standardAlbumGalleryViews,
    interiorLayoutSelection: {
      twoPhoto: ["travel-opening", "travel-landscape"],
      threePhoto: ["travel-postcards"],
    },
    interiorLayouts: [
      {
        id: "travel-opening",
        label: "Opening spread",
        backgroundColor: "#f7f1e7",
        slots: [
          rectangleSlot(5, 12, 39, 72),
          rectangleSlot(56, 12, 39, 72),
        ],
      },
      {
        id: "travel-postcards",
        label: "Postcard spread",
        backgroundColor: "#e5efe9",
        slots: [
          { ...rectangleSlot(7, 17, 27, 49), rotation: -4 },
          rectangleSlot(37, 10, 27, 49),
          { ...rectangleSlot(67, 20, 25, 45), rotation: 4 },
        ],
      },
      {
        id: "travel-landscape",
        label: "Landscape spread",
        backgroundColor: "#eef3f1",
        slots: [
          rectangleSlot(5, 12, 90, 47),
          rectangleSlot(27, 64, 46, 23),
        ],
      },
      {
        id: "travel-grid",
        label: "Memory grid",
        backgroundColor: "#fbf6ee",
        slots: [
          rectangleSlot(6, 11, 26, 34),
          rectangleSlot(37, 11, 26, 34),
          rectangleSlot(68, 11, 26, 34),
          rectangleSlot(21, 51, 26, 34),
          rectangleSlot(53, 51, 26, 34),
        ],
      },
    ],
  },
  birthday: {
    id: "birthday",
    version: "2.1.0",
    editionId: "standard-24-page",
    defaultCoverSlotCount: 1,
    coverBackgroundColor: "#f9e0eb",
    backBackgroundColor: "#6c3e5f",
    backCoverSlots: [
      {
        ...rectangleSlot(27, 22, 46, 56),
        borderRadius: "50%",
        shape: "circle",
      },
    ],
    galleryViews: standardAlbumGalleryViews,
    interiorLayoutSelection: {
      twoPhoto: ["birthday-opening"],
      threePhoto: ["birthday-moments"],
    },
    interiorLayouts: [
      {
        id: "birthday-opening",
        label: "Celebration spread",
        backgroundColor: "#fff3f8",
        slots: [
          rectangleSlot(7, 13, 39, 68),
          { ...rectangleSlot(55, 13, 38, 68), borderRadius: "10%" },
        ],
      },
      {
        id: "birthday-moments",
        label: "Party moments",
        backgroundColor: "#fff7e5",
        slots: [
          { ...rectangleSlot(8, 16, 25, 49), rotation: -4 },
          rectangleSlot(38, 10, 25, 49),
          { ...rectangleSlot(68, 16, 25, 49), rotation: 4 },
          rectangleSlot(31, 69, 38, 19),
        ],
      },
      {
        id: "birthday-portrait",
        label: "Birthday portrait",
        backgroundColor: "#f7e7f0",
        slots: [
          {
            ...rectangleSlot(31, 9, 38, 76),
            borderRadius: "50%",
            shape: "circle",
          },
        ],
      },
    ],
  },
  family: {
    id: "family",
    version: "2.1.0",
    editionId: "standard-24-page",
    defaultCoverSlotCount: 1,
    coverBackgroundColor: "#e9e1d5",
    backBackgroundColor: "#564b42",
    backCoverSlots: [
      { ...rectangleSlot(23, 22, 54, 56), borderRadius: "6%" },
    ],
    galleryViews: standardAlbumGalleryViews,
    interiorLayoutSelection: {
      twoPhoto: ["family-opening"],
      threePhoto: ["family-story"],
    },
    interiorLayouts: [
      {
        id: "family-opening",
        label: "Family opening",
        backgroundColor: "#f8f4ed",
        slots: [
          rectangleSlot(6, 12, 42, 70),
          rectangleSlot(53, 12, 41, 70),
        ],
      },
      {
        id: "family-story",
        label: "Our story",
        backgroundColor: "#ecf0e3",
        slots: [
          rectangleSlot(7, 13, 37, 45),
          rectangleSlot(56, 13, 37, 45),
          rectangleSlot(28, 64, 44, 22),
        ],
      },
      {
        id: "family-grid",
        label: "Family memories",
        backgroundColor: "#f5eee6",
        slots: [
          rectangleSlot(7, 12, 26, 31),
          rectangleSlot(37, 12, 26, 31),
          rectangleSlot(67, 12, 26, 31),
          rectangleSlot(22, 51, 26, 31),
          rectangleSlot(52, 51, 26, 31),
        ],
      },
    ],
  },
  default: {
    id: "default",
    version: "2.1.0",
    editionId: "standard-24-page",
    defaultCoverSlotCount: 1,
    coverBackgroundColor: "#edf0ef",
    backBackgroundColor: "#3f474a",
    backCoverSlots: [
      { ...rectangleSlot(25, 24, 50, 52), borderRadius: "4%" },
    ],
    galleryViews: standardAlbumGalleryViews,
    interiorLayoutSelection: {
      twoPhoto: ["album-opening", "album-feature"],
      threePhoto: ["album-moments"],
    },
    interiorLayouts: [
      {
        id: "album-opening",
        label: "Opening spread",
        backgroundColor: "#ffffff",
        slots: [
          rectangleSlot(6, 12, 41, 70),
          rectangleSlot(53, 12, 41, 70),
        ],
      },
      {
        id: "album-moments",
        label: "Memory spread",
        backgroundColor: "#f4f2ef",
        slots: [
          rectangleSlot(6, 13, 27, 52),
          rectangleSlot(37, 13, 27, 52),
          rectangleSlot(68, 13, 26, 52),
        ],
      },
      {
        id: "album-feature",
        label: "Feature spread",
        backgroundColor: "#eef1f2",
        slots: [
          rectangleSlot(7, 12, 86, 58),
          rectangleSlot(34, 74, 32, 14),
        ],
      },
    ],
  },
};

// This is product/template configuration, not a runtime theme guess. New
// album products can set `albumTemplateId` directly on their product or
// customizer-template record; the default is a deliberately versioned,
// reusable fallback rather than a product-specific hardcode.
const albumTemplateIdByProductSlug: Record<string, AlbumProfileId> = {
  "time-to-travel-travel-photobook-4": "travel",
  "world-explorers-travel-photobook-3": "travel",
  "travel-photobook-1": "travel",
  "travel-memories-personalised-photo-album": "travel",
  "wildlife-travel-photo-album": "travel",
  "snow-travel-photo-album": "travel",
  "mountain-travel-photo-album": "travel",
  "beach-travel-photo-album": "travel",
  "my-1st-year-birthday-personalised-photo-album": "birthday",
  "bts-personalised-photo-album": "birthday",
  "birthday-photo-album": "birthday",
  "birthday-custom-name-photo-book": "birthday",
  "birthday-photo-celebration-photo-book": "birthday",
  "pink-birthday-photo-album": "birthday",
  "kids-baby-album": "birthday",
  "kids-baby-purple-photo-album": "birthday",
  "happy-family-personalised-photo-album": "family",
  "my-family-my-world-personalised-photo-album": "family",
  "family-memories-photo-album": "family",
  "family-memories-photo-album-all-together-as-a-family": "family",
  "fathers-day-for-the-best-man-in-the-world": "family",
};

function getCustomizerTemplate(product: Product): CustomizerTemplate | undefined {
  return (
    (product.customizerTemplateId
      ? customizerTemplateById[product.customizerTemplateId]
      : undefined) ?? customizerTemplateByProductSlug[product.slug]
  );
}

function productSearchText(product: Product) {
  return [
    product.slug,
    product.title,
    product.categorySlug,
    product.categoryName,
    product.description,
    ...(product.filterTags ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function getAlbumProfile(product: Product): AlbumProfile {
  const customizerTemplate = getCustomizerTemplate(product);
  const configuredTemplateId =
    product.albumTemplateId ??
    customizerTemplate?.albumTemplateId ??
    albumTemplateIdByProductSlug[product.slug] ??
    "default";
  return albumProfiles[configuredTemplateId as AlbumProfileId] ?? albumProfiles.default;
}

function uniqueImages(product: Product) {
  return Array.from(
    new Set([product.image, ...(product.gallery ?? [])].filter(Boolean)),
  );
}

function galleryImageAt(images: string[], index: number) {
  return images[index];
}

function getConfiguredAlbumGalleryImage(
  product: Product,
  view: AlbumGalleryViewDefinition,
  images: string[],
) {
  const curatedAssets = curatedAlbumGalleryAssets[product.slug];

  if (view.type === "back-cover") {
    if (curatedAssets?.backCover) return curatedAssets.backCover;

    if (omgsAlbumBackCoverAssetSlugs.has(product.slug)) {
      return `/images/omgs-reference/album-back-covers/${product.slug}.jpg`;
    }
  }

  if (view.type === "inside-spread" && curatedAssets?.insideSpread) {
    return curatedAssets.insideSpread;
  }

  return galleryImageAt(images, view.imageIndex);
}

export function isAlbumProduct(product: Product | null | undefined) {
  if (!product) return false;

  const template = getCustomizerTemplate(product);
  if (product.categorySlug === "photo-albums") return true;
  if (albumTemplateIdByProductSlug[product.slug]) return true;
  if (template?.previewType === "album" || template?.productType === "album") {
    return true;
  }

  return /\b(photo\s*album|photo\s*book|photobook)\b/.test(
    productSearchText(product),
  );
}

export function getAlbumGalleryViews(product: Product): AlbumGalleryView[] {
  if (!isAlbumProduct(product)) return [];

  const profile = getAlbumProfile(product);
  const images = uniqueImages(product);
  return profile.galleryViews.flatMap((view) => {
    const image = getConfiguredAlbumGalleryImage(product, view, images);
    return image ? [{ ...view, image }] : [];
  });
}

function buildCoverSlots(product: Product, profile: AlbumProfile) {
  const customizerTemplate = getCustomizerTemplate(product);
  const fallbackCount = Math.max(
    1,
    customizerTemplate?.uploadSlots ?? profile.defaultCoverSlotCount,
  );

  return getAlbumCoverLayout(product.slug, fallbackCount).slots.map(
    (slot, index): AlbumPhotoSlot => ({
      id: `front-cover-slot-${index + 1}`,
      x: slot.left,
      y: slot.top,
      width: slot.width,
      height: slot.height,
      rotation: slot.rotation,
      borderRadius: slot.borderRadius,
      clipPath: slot.clipPath,
      shape:
        slot.frameVariant === "circle" || slot.borderRadius === "50%"
          ? "circle"
          : slot.clipPath
            ? "custom"
            : "rectangle",
      required: true,
    }),
  );
}

function buildBackCoverSlots(profile: AlbumProfile) {
  return profile.backCoverSlots.map(
    (slot, index): AlbumPhotoSlot => ({
      ...slot,
      id: `back-cover-slot-${index + 1}`,
    }),
  );
}

function getAlbumEdition(profile: AlbumProfile) {
  return albumEditions[profile.editionId];
}

function getInteriorLayout(
  profile: AlbumProfile,
  photoCount: number,
  pageIndex: number,
) {
  const layoutIds =
    photoCount === 2
      ? profile.interiorLayoutSelection.twoPhoto
      : profile.interiorLayoutSelection.threePhoto;
  const layoutId = layoutIds[pageIndex % layoutIds.length];
  const layout = profile.interiorLayouts.find((candidate) => candidate.id === layoutId);

  if (!layout || layout.slots.length < photoCount) {
    throw new Error(
      `Album profile "${profile.id}" is missing a ${photoCount}-photo interior layout.`,
    );
  }

  return layout;
}

function buildInteriorPages(
  profile: AlbumProfile,
  galleryViews: AlbumGalleryView[],
  fixedPhotoSlotCount: number,
) {
  const edition = getAlbumEdition(profile);
  const interiorPhotoTarget = edition.requiredPhotoCount - fixedPhotoSlotCount;
  const basePhotoTotal =
    edition.interiorPageCount * edition.basePhotosPerInteriorPage;
  const extraPhotosPerEnhancedPage =
    edition.enhancedPhotosPerInteriorPage - edition.basePhotosPerInteriorPage;
  const enhancedPageCount =
    (interiorPhotoTarget - basePhotoTotal) / extraPhotosPerEnhancedPage;

  if (
    !Number.isInteger(enhancedPageCount) ||
    enhancedPageCount < 0 ||
    enhancedPageCount > edition.interiorPageCount
  ) {
    throw new Error(
      `Album edition "${edition.id}" cannot distribute ${interiorPhotoTarget} interior photos for profile "${profile.id}".`,
    );
  }

  const insideImages = galleryViews
    .filter((view) => view.type === "inside-spread")
    .map((view) => view.image);

  return Array.from(
    { length: edition.interiorPageCount },
    (_, index): AlbumPageTemplate => {
      // Spread the more detailed three-photo layouts through the book instead
      // of front-loading them, which keeps every template visually balanced.
      const enhancedBefore = Math.floor(
        (index * enhancedPageCount) / edition.interiorPageCount,
      );
      const enhancedThroughCurrent = Math.floor(
        ((index + 1) * enhancedPageCount) / edition.interiorPageCount,
      );
      const photoCount =
        enhancedThroughCurrent > enhancedBefore
          ? edition.enhancedPhotosPerInteriorPage
          : edition.basePhotosPerInteriorPage;
      const layout = getInteriorLayout(profile, photoCount, index);
      const pageId = `inside-${String(index + 1).padStart(2, "0")}-${layout.id}`;

      return {
        id: pageId,
        order: index + 2,
        label: layout.label,
        type: layout.type ?? "inside-spread",
        backgroundImage: index === 0 ? galleryImageAt(insideImages, 0) : undefined,
        backgroundColor: layout.backgroundColor,
        slots: layout.slots.slice(0, photoCount).map((slot, slotIndex) => ({
          ...slot,
          id: `${pageId}-slot-${slotIndex + 1}`,
        })),
      };
    },
  );
}

function requiredPhotoCount(pages: AlbumPageTemplate[]) {
  return pages.reduce(
    (total, page) =>
      total + page.slots.filter((slot) => slot.required).length,
    0,
  );
}

export function getAlbumTemplate(product: Product): AlbumTemplate | null {
  if (!isAlbumProduct(product)) return null;

  const profile = getAlbumProfile(product);
  const edition = getAlbumEdition(profile);
  const galleryViews = getAlbumGalleryViews(product);
  const coverSlots = buildCoverSlots(product, profile);
  const backCoverSlots = buildBackCoverSlots(profile);
  const interiorPages = buildInteriorPages(
    profile,
    galleryViews,
    coverSlots.length + backCoverSlots.length,
  );
  const pages: AlbumPageTemplate[] = [
    {
      id: "front-cover",
      order: 1,
      label: "Front cover",
      type: "front-cover",
      backgroundImage: galleryViews.find((view) => view.type === "front-cover")
        ?.image,
      backgroundColor: profile.coverBackgroundColor,
      slots: coverSlots,
    },
    ...interiorPages,
    {
      id: "back-cover",
      order: edition.pageCount,
      label: "Back cover",
      type: "back-cover",
      // The gallery preview is a labelled front/back composite; it must not
      // become the single-canvas editor background for the back cover.
      backgroundColor: profile.backBackgroundColor,
      slots: backCoverSlots,
    },
  ];
  const photoCount = requiredPhotoCount(pages);

  if (
    pages.length !== edition.pageCount ||
    photoCount !== edition.requiredPhotoCount
  ) {
    throw new Error(
      `Album edition "${edition.id}" must produce ${edition.pageCount} pages and ${edition.requiredPhotoCount} photos.`,
    );
  }

  return {
    id: `album-${profile.id}@${profile.version}:${product.id}`,
    version: profile.version,
    productId: product.id,
    pageCount: pages.length,
    requiredPhotoCount: photoCount,
    galleryViews,
    pages,
  };
}
