export function sanitizeBrandText(value: string) {
  return value
    .replace(/support@omgs\.in/gi, "support@giftora.in")
    .replace(/OMGS\.in/gi, "Giftora")
    .replace(/OMGs/g, "Giftora")
    .replace(/OMGS/g, "Giftora")
    .replace(/\bomgs\b/g, "giftora")
    .replace(/omgs\.in/gi, "giftora.in");
}

export function sanitizeOptionalBrandText(value?: string) {
  return value ? sanitizeBrandText(value) : value;
}
