/**
 * Server-side data layer for React Server Components.
 *
 * Every getter tries the backend API first (ISR-cached fetch) and falls back
 * to the bundled static data when the API is unreachable (e.g. local builds,
 * backend downtime). This keeps the storefront functional in both modes while
 * making the backend the source of truth once it is deployed.
 */
import type { Category, Product, ProductOption, ProductReview } from "@/types";
import { productBySlug, products as staticProducts, productsByCategory } from "@/data/products";
import { categories as staticCategories, categoryMap } from "@/data/categories";
import { isWhitelistedCategory, WHITELISTED_CATEGORY_SLUGS } from "@/config/whitelist";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const FETCH_TIMEOUT_MS = 5000;

// Product routes are statically generated during `next build`. Calling the
// deployed API once for every generated route creates a large burst of
// serverless invocations (and database connections) before the storefront is
// even live. Use the bundled catalogue for that build step; ISR requests after
// deployment continue to use the configured API and refresh normally.
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

async function fetchJson<T>(path: string, revalidate = 300): Promise<T | null> {
  if (isProductionBuild) return null;

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Mappers: backend API shape → frontend types ───────────

type ApiOption = { label: string; value: string; priceDelta?: number | null; disabled?: boolean | null };
type ApiReview = {
  id: string;
  rating: number;
  title?: string | null;
  text: string;
  photos?: string[];
  videoUrl?: string | null;
  isVerified?: boolean;
  createdAt?: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
};

function mapOptions(options?: ApiOption[] | null): ProductOption[] | undefined {
  if (!options?.length) return undefined;
  return options.map((o) => ({
    label: o.label,
    value: o.value,
    priceDelta: o.priceDelta ?? undefined,
    disabled: o.disabled ?? undefined,
  }));
}

function mapReviews(reviews?: ApiReview[] | null): ProductReview[] | undefined {
  if (!reviews?.length) return undefined;
  return reviews.map((r) => ({
    id: r.id,
    author: [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ") || "Verified Customer",
    rating: r.rating,
    text: r.text,
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : undefined,
    verified: r.isVerified,
    photos: r.photos?.length ? r.photos : undefined,
    videoUrl: r.videoUrl ?? undefined,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiProduct(p: any): Product | null {
  if (!p?.slug || !p?.title) return null;
  const fallback = productBySlug(p.slug);
  const galleryFromImages: string[] | undefined = p.images?.length
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p.images.map((img: any) => img.url).filter(Boolean)
    : undefined;

  return {
    id: p.id ?? fallback?.id ?? p.slug,
    slug: p.slug,
    sku: p.sku ?? fallback?.sku,
    title: p.title,
    categorySlug: p.category?.slug ?? fallback?.categorySlug ?? "",
    categoryName: p.category?.name ?? fallback?.categoryName ?? "",
    price: Number(p.price ?? fallback?.price ?? 0),
    oldPrice: p.oldPrice != null ? Number(p.oldPrice) : fallback?.oldPrice,
    sale: p.sale ?? fallback?.sale,
    image: p.image || fallback?.image || "",
    thumbnail: p.thumbnail ?? fallback?.thumbnail,
    gallery: (p.gallery?.length ? p.gallery : undefined) ?? galleryFromImages ?? fallback?.gallery,
    alt: p.metaTitle ?? fallback?.alt,
    filterTags: p.filterTags?.length ? p.filterTags : fallback?.filterTags ?? [],
    description: p.description ?? fallback?.description ?? "",
    longDescription: p.longDescription ?? fallback?.longDescription,
    stockStatus: p.stockStatus ?? fallback?.stockStatus,
    stockCount: p.stockCount ?? fallback?.stockCount,
    sizeOptions: mapOptions(p.sizeOptions) ?? fallback?.sizeOptions,
    thicknessOptions: mapOptions(p.thicknessOptions) ?? fallback?.thicknessOptions,
    reviewsCount: p.totalReviews ?? p.reviewsCount ?? fallback?.reviewsCount,
    reviews: mapReviews(p.reviews) ?? fallback?.reviews,
    customizerTemplateId: p.customizerTemplateId ?? fallback?.customizerTemplateId,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeApiCategory(apiCategory: any, staticCategory: Category | undefined): Category | null {
  if (!apiCategory?.slug) return staticCategory ?? null;
  return {
    ...(staticCategory ?? {}),
    slug: apiCategory.slug,
    name: apiCategory.name ?? staticCategory?.name ?? "",
    description: apiCategory.description ?? staticCategory?.description ?? "",
    accent: apiCategory.accent ?? staticCategory?.accent ?? "#d90000",
    image: apiCategory.image ?? staticCategory?.image,
    featured: apiCategory.featured ?? staticCategory?.featured,
    seoContent: apiCategory.seoContent ?? staticCategory?.seoContent,
    productCount: apiCategory._count?.products || staticCategory?.productCount,
  };
}

// ─── Public getters (API first, static fallback) ───────────

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiProduct = await fetchJson<any>(`/products/${encodeURIComponent(slug)}`);
  const mapped = apiProduct ? mapApiProduct(apiProduct) : null;
  return mapped ?? productBySlug(slug) ?? null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const staticCategory = categoryMap[slug];
  const apiCategory = await fetchJson(`/categories/${encodeURIComponent(slug)}`);
  return mergeApiCategory(apiCategory, staticCategory);
}

export async function getProductsForCategory(slug: string, limit = 8): Promise<Product[]> {
  const apiResult = await fetchJson<{ data?: unknown[] }>(
    `/products?categorySlug=${encodeURIComponent(slug)}&limit=${limit}`,
  );
  const mapped = (apiResult?.data ?? [])
    .map(mapApiProduct)
    .filter((p): p is Product => p !== null);
  if (mapped.length) return mapped.slice(0, limit);

  // Static fallback: curated product list first, then category membership
  const category = categoryMap[slug];
  const linkedProducts = (category?.productSlugs ?? []).flatMap((productSlug) => {
    const product = productBySlug(productSlug);
    return product ? [product] : [];
  });
  const categoryProducts = productsByCategory(slug);
  return (linkedProducts.length ? linkedProducts : categoryProducts).slice(0, limit);
}

function staticFeaturedProducts(limit: number): Product[] {
  const categoryBySlug = new Map(staticCategories.map((category) => [category.slug, category]));
  const featuredSlugs = new Set(
    WHITELISTED_CATEGORY_SLUGS.flatMap((slug) => categoryBySlug.get(slug)?.productSlugs ?? []),
  );
  return staticProducts
    .filter((p) => isWhitelistedCategory(p.categorySlug) && featuredSlugs.has(p.slug))
    .slice(0, limit);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const apiResult = await fetchJson<unknown>(`/products/featured?limit=${limit}`);
  const list = Array.isArray(apiResult) ? apiResult : undefined;
  const mapped = (list ?? [])
    .map(mapApiProduct)
    .filter((p): p is Product => p !== null && isWhitelistedCategory(p.categorySlug));
  if (mapped.length) return mapped.slice(0, limit);
  return staticFeaturedProducts(limit);
}

export async function getHomeCategories(): Promise<Category[]> {
  const staticWhitelisted = WHITELISTED_CATEGORY_SLUGS.flatMap((slug) => {
    const category = categoryMap[slug];
    return category ? [category] : [];
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiCategories = await fetchJson<any[]>(`/categories`);
  if (!Array.isArray(apiCategories) || !apiCategories.length) return staticWhitelisted;

  const apiBySlug = new Map(apiCategories.map((c) => [c.slug, c]));
  return staticWhitelisted.map(
    (staticCategory) => mergeApiCategory(apiBySlug.get(staticCategory.slug), staticCategory) ?? staticCategory,
  );
}
