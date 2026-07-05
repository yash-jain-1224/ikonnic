export type Category = {
  slug: string;
  sourceSlug?: string;
  sourceUrl?: string;
  name: string;
  description: string;
  accent: string;
  image?: string;
  alt?: string;
  imagePrompt?: string;
  featured?: boolean;
  customisationType?: string;
  requiresPhotoUpload?: boolean;
  requiresTextInput?: boolean;
  requiresMultiplePhotos?: boolean;
  requiresShapeMask?: boolean;
  filters?: string[];
  productSlugs?: string[];
  seoContent?: string;
  productCount?: number;
  volumePricing?: {
    baseLabel: string;
    tiers: { quantity: number; label: string; pricePerPiece: number }[];
  };
};

export type ProductReview = {
  id?: string;
  author: string;
  rating: number;
  text: string;
  date?: string;
  verified?: boolean;
  photos?: string[];
  videoUrl?: string;
  sourceUrl?: string;
};

export type ProductOption = {
  label: string;
  value: string;
  priceDelta?: number;
  disabled?: boolean;
};

export type CustomizerTemplate = {
  id: string;
  productSlug?: string;
  productType: string;
  previewType: "acrylic-slab" | "clock" | "nameplate" | "monogram" | "album" | "stand" | "keychain" | "tag" | "generic";
  orientation?: "portrait" | "landscape" | "square" | "auto";
  shape?: "rectangle" | "rounded-rectangle" | "circle" | "heart" | "leaf" | "cutout" | "custom";
  uploadSlots: number;
  requiresPhotoUpload: boolean;
  requiresTextInput: boolean;
  requiresBackgroundRemoval: boolean;
  sizeOptions: ProductOption[];
  thicknessOptions: ProductOption[];
  colorOptions: ProductOption[];
  sourceUrl?: string;
  sourceFields?: string[];
  sourceButtons?: string[];
};

export type Product = {
  id: string;
  slug: string;
  sourceSlug?: string;
  sourceUrl?: string;
  sku?: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  oldPrice?: number;
  sale?: boolean;
  image: string;
  thumbnail?: string;
  gallery?: string[];
  sourceImages?: string[];
  alt?: string;
  filterTags: string[];
  description: string;
  longDescription?: string;
  stockStatus?: string;
  stockCount?: number | null;
  sizeOptions?: ProductOption[];
  thicknessOptions?: ProductOption[];
  reviewsCount?: number;
  reviews?: ProductReview[];
  schemaData?: string[];
  customizerTemplateId?: string;
};

export type HeroSlide = {
  id: number;
  eyebrow: string;
  title: string;
  description: string;
  categorySlug: string;
  image: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  content: string[];
};

export type SelectedOptions = {
  shape: string;
  size: string;
  orientation?: string;
  photos?: string;
  thickness?: string;
  frameColor?: string;
  border?: string;
  background?: string;
  quantity?: number;
};

export type UploadedCustomImage = {
  originalUrl: string;
  croppedUrl: string;
  backgroundRemovedUrl: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  crop: Record<string, number>;
  qualityScore: string;
};

export type CustomTextOverlay = {
  value: string;
  fontFamily: string;
  fontSize: string;
  color: string;
  position: { x: number; y: number };
  alignment: string;
  rotation: number;
};

export type ProductCustomisation = {
  productId: string;
  templateId: string;
  uploadedImages: UploadedCustomImage[];
  texts: CustomTextOverlay[];
  selectedOptions: {
    size: string;
    thickness: string;
    frameColor: string;
    border: string;
    background: string;
    quantity: number;
    orientation?: string;
    dimensions?: string;
    shape?: string;
  };
  previewImage: string;
  printFile: string;
  priceSnapshot: {
    basePrice: number;
    optionsPrice: number;
    discount: number;
    finalPrice: number;
  };
};

export type CartItem = {
  id?: string;
  lineId: string;
  productId: string;
  productSlug?: string;
  productName?: string;
  slug: string;
  title: string;
  categorySlug?: string;
  category?: string;
  image: string;
  thumbnail?: string;
  price: number;
  unitPrice?: number;
  optionsPrice?: number;
  discount?: number;
  coupon?: string;
  tax?: number;
  shippingEstimate?: number;
  finalTotal?: number;
  userIdOrGuestSessionId?: string;
  quantity: number;
  selectedOptions: SelectedOptions;
  selectedSize?: string;
  selectedThickness?: string;
  selectedColor?: string;
  uploadedImagePreview?: string;
  uploadedImageReference?: string;
  previewImage?: string;
  customisation?: Record<string, unknown>;
  customisationJson?: ProductCustomisation;
};

export type WishlistItem = {
  lineId: string;
  productId: string;
  slug: string;
  title: string;
  category: string;
  image: string;
  price: number;
  addedAt: string;
};

export type OrderStatus =
  | "Order placed"
  | "Payment confirmed"
  | "Image processing"
  | "Design approval"
  | "Printing"
  | "Quality check"
  | "Packing"
  | "Shipped"
  | "Out for delivery"
  | "Delivered"
  | "Cancelled"
  | "Refunded"
  | "Reprint initiated";

export type IkonnicOrder = {
  id: string;
  email: string;
  phone: string;
  total: number;
  status: OrderStatus;
  items: CartItem[];
  createdAt: string;
  trackingEvents: { status: OrderStatus; timestamp: string; note: string }[];
};
