import { ogAlt, ogSize, ogContentType, renderBrandOgImage } from "@/lib/og-image";

export const runtime = "nodejs";
export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default function OpengraphImage() {
  return renderBrandOgImage();
}
