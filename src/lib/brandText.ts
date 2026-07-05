export function sanitizeBrandText(value: string) {
  return value
    .replace(/support@omgs\.in/gi, "support@ikonnic.in")
    .replace(/OMGS\.in/gi, "Ikonnic")
    .replace(/OMGs/g, "Ikonnic")
    .replace(/OMGS/g, "Ikonnic")
    .replace(/\bomgs\b/g, "ikonnic")
    .replace(/omgs\.in/gi, "ikonnic.in");
}

export function sanitizeOptionalBrandText(value?: string) {
  return value ? sanitizeBrandText(value) : value;
}
