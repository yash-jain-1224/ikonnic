import type { MetadataRoute } from "next";

const getBaseUrl = () => {
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

const BASE_URL = getBaseUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/checkout", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
