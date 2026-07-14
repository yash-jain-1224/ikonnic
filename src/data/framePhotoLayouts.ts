export type FramePhotoSlotGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
};

export type FramePhotoLayout = {
  id: string;
  artworkAspectRatio: number;
  slots: FramePhotoSlotGeometry[];
};

const layouts = {
  dualPanel: {
    id: "dual-panel",
    artworkAspectRatio: 1,
    slots: [
      { left: 18.2, top: 26.8, width: 31.8, height: 46.5 },
      { left: 50, top: 26.8, width: 32, height: 46.5 },
    ],
  },
  roundedPortraitGrid: {
    id: "rounded-portrait-grid",
    artworkAspectRatio: 1,
    slots: [
      { left: 27, top: 18.3, width: 23.2, height: 31.9 },
      { left: 50.2, top: 18.3, width: 23, height: 31.9 },
      { left: 27, top: 50.2, width: 23.2, height: 31.8 },
      { left: 50.2, top: 50.3, width: 23, height: 31.5 },
    ],
  },
  roundedLandscapeGrid: {
    id: "rounded-landscape-grid",
    artworkAspectRatio: 1,
    slots: [
      { left: 18.2, top: 27, width: 31.8, height: 23.2 },
      { left: 50, top: 27, width: 32, height: 23.2 },
      { left: 18.2, top: 50.2, width: 31.8, height: 23.1 },
      { left: 50, top: 50.3, width: 32, height: 23 },
    ],
  },
} satisfies Record<string, FramePhotoLayout>;

const framePhotoLayoutByProductSlug: Record<string, FramePhotoLayout> = {};

function register(layout: FramePhotoLayout, slugs: string[]) {
  slugs.forEach((slug) => {
    framePhotoLayoutByProductSlug[slug] = layout;
  });
}

register(layouts.dualPanel, [
  "acrylic-photo-aluminum-frame-dual-border-square",
  "aluminum-framed-acrylic-photo-landscape-2-pics-collage-black",
]);

register(layouts.roundedPortraitGrid, [
  "acrylic-photo-aluminum-frame-rounded-rect-portrait",
  "aluminum-framed-acrylic-photo-portrait-collage-black",
]);

register(layouts.roundedLandscapeGrid, [
  "acrylic-photo-aluminum-frame-rounded-rect-landscape",
  "aluminum-framed-acrylic-photo-landscape-collage-black",
]);

export function getFramePhotoLayout(productSlug: string) {
  return framePhotoLayoutByProductSlug[productSlug];
}
