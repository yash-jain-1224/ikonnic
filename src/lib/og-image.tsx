import { ImageResponse } from "next/og";

export const ogAlt = "Ikonnic — Personalised Decor & Gifts";
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export function renderBrandOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: 8,
            background: "#e11d48",
            padding: "12px 40px",
            borderRadius: 12,
          }}
        >
          IKONNIC
        </div>
        <div style={{ fontSize: 40, marginTop: 40, opacity: 0.9 }}>
          Personalised Decor &amp; Gifts
        </div>
        <div style={{ fontSize: 26, marginTop: 16, opacity: 0.7 }}>
          Custom acrylic photos, wall décor, frames &amp; more — delivered across India
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
