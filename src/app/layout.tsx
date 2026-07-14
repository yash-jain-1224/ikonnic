import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";

const getSiteUrl = () => {
  let url = process.env.NEXT_PUBLIC_APP_URL || "https://www.ikonnic.com";
  url = url.trim().replace(/\/+$/, "");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  try {
    new URL(url);
    return url;
  } catch {
    return "https://www.ikonnic.com";
  }
};

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    default: "Ikonnic | Personalised Decor & Gifts",
    template: "%s | Ikonnic",
  },
  description: "India's favourite personalised gifting brand. Custom acrylic photos, wall décor, clocks, frames, albums, keychains & gifts — delivered across India.",
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/images/ikonnic-wbg.png",
    apple: "/images/ikonnic-wbg.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Ikonnic",
    title: "Ikonnic | Personalised Decor & Gifts",
    description: "Custom acrylic photos, wall décor, clocks, frames, albums, keychains & gifts — designed with your memories, delivered across India.",
    // Image supplied by the generated app/opengraph-image.tsx route (always available).
  },
  twitter: {
    card: "summary_large_image",
    title: "Ikonnic | Personalised Decor & Gifts",
    description: "Custom acrylic photos, wall décor, clocks, frames, albums, keychains & gifts.",
    // Image supplied by the generated app/twitter-image.tsx route.
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <LayoutWrapper
            header={<SiteHeader />}
            footer={<SiteFooter />}
            whatsapp={<WhatsAppButton />}
          >
            {children}
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
