import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // The catalogue deliberately has many statically generated product pages.
    // Keep the prerender worker fan-out bounded so a production build stays
    // within Vercel's memory limits and does not stampede the API/database.
    staticGenerationMaxConcurrency: 4,
    staticGenerationMinPagesPerWorker: 50,
  },
  images: {
    remotePatterns: [
      // Azure Blob Storage (configured via env)
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net",
      },
      // Fallback for development/other CDN
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.ikonnic.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI/production builds
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Control source map upload
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
