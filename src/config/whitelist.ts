/**
 * Whitelist of the 12 curated acrylic gift categories.
 * All other inherited source categories remain archived in data.
 */
export const WHITELISTED_CATEGORY_SLUGS = [
  "acrylic-name-plate",
  "acrylic-monogram-nameplate",
  "acrylic-photo-fridge-magnets",
  "personalised-keychains",
  "aluminium-framed-acrylic-photo",
  "acrylic-photo-stand",
  "acrylic-photo-mini-wall-gallery",
  "wall-clocks",
  "acrylic-wall-photo",
  "luggage-tags",
  "photo-albums",
  "gift-bundles",
] as const;

export type WhitelistedCategorySlug = (typeof WHITELISTED_CATEGORY_SLUGS)[number];

export function isWhitelistedCategory(slug: string): slug is WhitelistedCategorySlug {
  return (WHITELISTED_CATEGORY_SLUGS as readonly string[]).includes(slug);
}
