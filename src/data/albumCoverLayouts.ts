export type AlbumFrameVariant = "plain" | "photo-mat" | "polaroid" | "circle";

export type AlbumCoverSlotGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  borderRadius?: string;
  clipPath?: string;
  frameVariant?: AlbumFrameVariant;
  badgeWidth?: number;
  badgeHeight?: number;
  badgeRadius?: string;
  badgeOffsetX?: number;
  objectPosition?: string;
};

export type AlbumCoverLayout = {
  id: string;
  artworkAware?: boolean;
  showHeading?: boolean;
  slots: AlbumCoverSlotGeometry[];
};

const layouts = {
  travelThree: {
    id: "travel-three",
    slots: [
      {
        left: 20,
        top: 50,
        width: 20.5,
        height: 23.5,
        rotation: -7,
        zIndex: 30,
        frameVariant: "plain",
        badgeWidth: 68,
        badgeHeight: 64,
      },
      {
        left: 35.2,
        top: 43.5,
        width: 27.5,
        height: 32,
        rotation: -7,
        zIndex: 20,
        frameVariant: "plain",
        badgeWidth: 60,
        badgeHeight: 60,
      },
      {
        left: 58.5,
        top: 45.5,
        width: 19.5,
        height: 22.5,
        rotation: -7,
        zIndex: 30,
        frameVariant: "plain",
        badgeWidth: 68,
        badgeHeight: 64,
      },
    ],
  },
  loveArch: {
    id: "love-arch",
    slots: [
      {
        left: 16,
        top: 31,
        width: 45,
        height: 55,
        rotation: -7,
        zIndex: 20,
        borderRadius: "44% 44% 30% 36%",
        frameVariant: "plain",
        badgeWidth: 81,
        badgeHeight: 82,
        badgeRadius: "14%",
        objectPosition: "50% 45%",
      },
    ],
  },
  birthdayWide: {
    id: "birthday-wide",
    slots: [
      {
        left: 20.8,
        top: 28.7,
        width: 45.3,
        height: 51.5,
        rotation: -7,
        zIndex: 20,
        borderRadius: "2%",
        frameVariant: "plain",
        badgeWidth: 65,
        badgeHeight: 60,
        badgeRadius: "14%",
        objectPosition: "50% 42%",
      },
    ],
  },
  travelTales: {
    id: "travel-tales",
    showHeading: true,
    slots: [
      {
        left: 12.8,
        top: 45.7,
        width: 27.2,
        height: 25.5,
        rotation: -7,
        zIndex: 20,
        frameVariant: "plain",
        badgeWidth: 61,
        badgeHeight: 63,
        badgeRadius: "14%",
      },
      {
        left: 37.4,
        top: 31.8,
        width: 29.2,
        height: 30.5,
        rotation: -7,
        zIndex: 30,
        frameVariant: "plain",
        badgeWidth: 59,
        badgeHeight: 63,
        badgeRadius: "14%",
      },
    ],
  },
  fullBleedBirthday: {
    id: "full-bleed-birthday",
    slots: [
      {
        left: 23.5,
        top: 27.5,
        width: 64.5,
        height: 53.5,
        rotation: -7,
        zIndex: 20,
        borderRadius: "1%",
        frameVariant: "plain",
        badgeWidth: 45,
        badgeHeight: 48,
        badgeRadius: "14%",
        objectPosition: "50% 45%",
      },
    ],
  },
  fullBleedBaby: {
    id: "full-bleed-baby",
    slots: [
      {
        left: 24,
        top: 26.5,
        width: 63.5,
        height: 55,
        rotation: -7,
        zIndex: 20,
        borderRadius: "2%",
        frameVariant: "plain",
        badgeWidth: 45,
        badgeHeight: 48,
        badgeRadius: "14%",
        objectPosition: "50% 44%",
      },
    ],
  },
  circlePortrait: {
    id: "circle-portrait",
    slots: [
      {
        left: 27,
        top: 27.5,
        width: 45,
        height: 44.5,
        rotation: -7,
        zIndex: 20,
        borderRadius: "50%",
        clipPath: "ellipse(49% 49% at 50% 50%)",
        frameVariant: "circle",
        badgeWidth: 55,
        badgeHeight: 44,
        badgeRadius: "16%",
        objectPosition: "50% 42%",
      },
    ],
  },
  fullBleedPink: {
    id: "full-bleed-pink",
    slots: [
      {
        left: 22.5,
        top: 26.5,
        width: 66,
        height: 54,
        rotation: -7,
        zIndex: 20,
        borderRadius: "2%",
        frameVariant: "plain",
        badgeWidth: 44,
        badgeHeight: 48,
        badgeRadius: "14%",
        objectPosition: "50% 44%",
      },
    ],
  },
} satisfies Record<string, AlbumCoverLayout>;

const albumLayoutByProductSlug: Record<string, AlbumCoverLayout> = {};

function register(layout: AlbumCoverLayout, slugs: string[]) {
  slugs.forEach((slug) => {
    albumLayoutByProductSlug[slug] = layout;
  });
}

register(layouts.travelThree, [
  "bts-our-moments-our-stories-personalised-photo-album",
  "time-to-travel-travel-photobook-4",
]);

register(layouts.loveArch, [
  "happy-family-personalised-photo-album",
  "anniversary-photo-album",
]);

register(layouts.birthdayWide, [
  "bts-personalised-photo-album",
  "birthday-custom-name-photo-book",
]);

register(layouts.travelTales, [
  "couples-love-story-personalised-photo-album",
  "travel-photobook-1",
]);

register(layouts.fullBleedBirthday, [
  "my-1st-year-birthday-personalised-photo-album",
  "birthday-photo-album",
]);

register(layouts.fullBleedBaby, [
  "golden-wedding-anniversary-personalised-photo-album",
  "kids-baby-album",
]);

register(layouts.circlePortrait, [
  "travel-memories-personalised-photo-album",
  "home-heart-happiness-house-warming-photo-album",
]);

register(layouts.fullBleedPink, [
  "my-family-my-world-personalised-photo-album",
  "pink-birthday-photo-album",
]);

const legacyAlbumSlugs = [
  "he-she-anniversary-photo-album",
  "birthday-photo-celebration-photo-book",
  "family-memories-photo-album",
  "fathers-day-for-the-best-man-in-the-world",
  "anniversary-photo-album-3",
  "floral-photo-book",
  "sweet-home-house-warming-photo-album",
  "family-memories-photo-album-all-together-as-a-family",
  "house-warming-memories-photo-album",
  "anniversary-photo-album-2",
  "kids-baby-purple-photo-album",
  "world-explorers-travel-photobook-3",
];

function genericAlbumSlot(
  index: number,
  count: number,
): AlbumCoverSlotGeometry {
  if (count <= 1) {
    return {
      left: 33,
      top: 24,
      width: 34,
      height: 58,
      zIndex: 20,
      borderRadius: "4%",
      frameVariant: "photo-mat",
      badgeWidth: 66,
      badgeHeight: 56,
      badgeRadius: "14%",
    };
  }

  if (count === 2) {
    return (
      [
        {
          left: 13,
          top: 34,
          width: 34,
          height: 48,
          rotation: 5,
          zIndex: 20,
          frameVariant: "polaroid" as const,
          badgeWidth: 68,
          badgeHeight: 62,
          badgeRadius: "14%",
        },
        {
          left: 49,
          top: 20,
          width: 34,
          height: 48,
          rotation: -5,
          zIndex: 30,
          frameVariant: "polaroid" as const,
          badgeWidth: 68,
          badgeHeight: 62,
          badgeRadius: "14%",
        },
      ][index] ?? genericAlbumSlot(0, 1)
    );
  }

  const columns = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / columns);
  const width = columns === 2 ? 28 : 22;
  const height = Math.min(34, 64 / rows);
  const horizontalGap = columns === 2 ? 8 : 5;
  const totalWidth = columns * width + (columns - 1) * horizontalGap;
  const row = Math.floor(index / columns);
  const column = index % columns;

  return {
    left: (100 - totalWidth) / 2 + column * (width + horizontalGap),
    top: 18 + row * (height + 5),
    width,
    height,
    zIndex: 20 + index,
    borderRadius: "4%",
    frameVariant: "photo-mat",
    badgeWidth: 68,
    badgeHeight: 58,
    badgeRadius: "14%",
  };
}

legacyAlbumSlugs.forEach((slug) => {
  albumLayoutByProductSlug[slug] = {
    id: `legacy-${slug}`,
    artworkAware: false,
    slots: [genericAlbumSlot(0, 1)],
  };
});

function normalizedProductSlug(productSlug: string) {
  const path = productSlug.toLowerCase().split(/[?#]/, 1)[0];
  const segments = path.split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}

export function getAlbumCoverLayout(
  productSlug: string,
  fallbackSlotCount: number,
): AlbumCoverLayout {
  const layout = albumLayoutByProductSlug[normalizedProductSlug(productSlug)];
  if (layout) return layout;

  const count = Math.max(1, fallbackSlotCount);
  return {
    id: `generic-${count}`,
    artworkAware: false,
    showHeading: count > 1,
    slots: Array.from({ length: count }, (_, index) =>
      genericAlbumSlot(index, count),
    ),
  };
}

export function getAlbumCoverSlotCount(productSlug: string) {
  return albumLayoutByProductSlug[normalizedProductSlug(productSlug)]?.slots
    .length;
}
