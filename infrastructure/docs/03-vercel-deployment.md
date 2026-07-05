# Vercel Deployment Guide

## Overview
Ikonnic is deployed on Vercel as a Next.js application. This guide covers the complete deployment configuration, environment variables, and production optimization.

---

## 1. Vercel Project Setup

### 1.1 Connect Repository
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import from GitHub: `your-org/ikonnicEcommerceWebsite`
3. Framework Preset: **Next.js**
4. Root Directory: `/` (default)
5. Build Command: `next build`
6. Output Directory: `.next` (default)

### 1.2 Domain Configuration
| Domain | Type | Purpose |
|--------|------|---------|
| `ikonnic.com` | Primary | Production |
| `www.ikonnic.com` | Redirect → ikonnic.com | WWW redirect |
| `staging.ikonnic.com` | Preview | Staging environment |

### DNS Records at Registrar
```
A     @              76.76.21.21
CNAME www            cname.vercel-dns.com
CNAME staging        cname.vercel-dns.com
```

---

## 2. Environment Variables

### 2.1 Production Environment Variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

#### Core Application
| Variable | Value | Environments |
|----------|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://ikonnic.com` | Production |
| `NEXT_PUBLIC_APP_NAME` | `Ikonnic` | All |
| `NODE_ENV` | `production` | Production |

#### Authentication (Microsoft Entra ID)
| Variable | Value | Environments |
|----------|-------|-------------|
| `AZURE_AD_CLIENT_ID` | `<from-app-registration>` | All |
| `AZURE_AD_CLIENT_SECRET` | `<from-key-vault>` | All |
| `AZURE_AD_TENANT_ID` | `<your-tenant-id>` | All |
| `NEXTAUTH_URL` | `https://ikonnic.com` | Production |
| `NEXTAUTH_URL` | `https://staging.ikonnic.com` | Preview |
| `NEXTAUTH_URL` | `http://localhost:3000` | Development |
| `NEXTAUTH_SECRET` | `<openssl rand -base64 32>` | All |

#### Authentication (Google OAuth)
| Variable | Value | Environments |
|----------|-------|-------------|
| `GOOGLE_CLIENT_ID` | `<from-google-console>` | All |
| `GOOGLE_CLIENT_SECRET` | `<from-key-vault>` | All |

#### Database (PostgreSQL)
| Variable | Value | Environments |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://ikonnic_admin:<pass>@ikonnic-pg-server.postgres.database.azure.com:5432/ikonnic_db?sslmode=require` | All |
| `DATABASE_URL_UNPOOLED` | Same as DATABASE_URL | All |

#### Azure Storage
| Variable | Value | Environments |
|----------|-------|-------------|
| `AZURE_STORAGE_CONNECTION_STRING` | `<from-key-vault>` | All |
| `AZURE_STORAGE_ACCOUNT_NAME` | `ikonnicstorage` | All |
| `NEXT_PUBLIC_STORAGE_URL` | `https://ikonnicstorage.blob.core.windows.net` | All |

#### Email (SendGrid)
| Variable | Value | Environments |
|----------|-------|-------------|
| `SENDGRID_API_KEY` | `<from-key-vault>` | All |
| `SENDGRID_FROM_EMAIL` | `orders@ikonnic.com` | Production |
| `SENDGRID_FROM_EMAIL` | `noreply@ikonnic.com` | Preview |

#### Payment (Razorpay)
| Variable | Value | Environments |
|----------|-------|-------------|
| `RAZORPAY_KEY_ID` | `<razorpay-key-id>` | All |
| `RAZORPAY_KEY_SECRET` | `<from-key-vault>` | All |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `<razorpay-key-id>` | All |

#### Monitoring
| Variable | Value | Environments |
|----------|-------|-------------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `<from-azure>` | Production |
| `NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING` | `<from-azure>` | Production |

#### Feature Flags
| Variable | Value | Environments |
|----------|-------|-------------|
| `NEXT_PUBLIC_ENABLE_REVIEWS` | `true` | Production |
| `NEXT_PUBLIC_ENABLE_WISHLIST` | `true` | All |
| `NEXT_PUBLIC_ENABLE_CUSTOMIZER` | `true` | All |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | `false` | All |

### 2.2 Pull Secrets from Key Vault
```bash
#!/bin/bash
# Script to sync Key Vault secrets to Vercel
VAULT_NAME="ikonnic-kv"

# Requires: npm i -g vercel
echo "Pulling secrets from Azure Key Vault..."

vercel env add DATABASE_URL production < <(az keyvault secret show --vault-name $VAULT_NAME --name pg-connection-string --query value -o tsv)
vercel env add AZURE_STORAGE_CONNECTION_STRING production < <(az keyvault secret show --vault-name $VAULT_NAME --name storage-connection-string --query value -o tsv)
vercel env add AZURE_AD_CLIENT_SECRET production < <(az keyvault secret show --vault-name $VAULT_NAME --name azure-ad-client-secret --query value -o tsv)
vercel env add SENDGRID_API_KEY production < <(az keyvault secret show --vault-name $VAULT_NAME --name sendgrid-api-key --query value -o tsv)

echo "✅ All secrets synced to Vercel"
```

---

## 3. vercel.json Configuration

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["bom1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate" }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "/api/sitemap" },
    { "source": "/robots.txt", "destination": "/api/robots" }
  ],
  "redirects": [
    { "source": "/shop", "destination": "/category/all", "permanent": true },
    { "source": "/products/:slug", "destination": "/product/:slug", "permanent": true }
  ],
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-carts",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/send-review-requests",
      "schedule": "0 10 * * *"
    }
  ]
}
```

---

## 4. Next.js Configuration

### next.config.ts Updates
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ikonnicstorage.blob.core.windows.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google avatars
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // For image uploads
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 5. Deployment Workflow

### 5.1 Branch Strategy
| Branch | Environment | Auto Deploy | Domain |
|--------|------------|-------------|--------|
| `main` | Production | ✅ | `ikonnic.com` |
| `staging` | Preview | ✅ | `staging.ikonnic.com` |
| `feature/*` | Preview | ✅ | Auto-generated |

### 5.2 Deployment Checklist
- [ ] All environment variables set in Vercel
- [ ] Domain DNS configured and verified
- [ ] Database migrations applied
- [ ] Storage containers created with CORS
- [ ] SendGrid domain authenticated
- [ ] Entra ID redirect URIs match production URL
- [ ] Google OAuth redirect URIs match production URL
- [ ] Security headers verified
- [ ] Performance baseline captured
- [ ] Error monitoring active (Application Insights)

### 5.3 Pre-Deployment Validation
```bash
# Local build test
npm run build

# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Preview deployment
vercel --prod=false
```

---

## 6. Performance Optimization

### 6.1 Edge Functions (Vercel)
```typescript
// /src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};

export function middleware(request: NextRequest) {
  // Rate limiting header
  const response = NextResponse.next();
  
  // Admin route protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("next-auth.session-token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}
```

### 6.2 ISR (Incremental Static Regeneration)
```typescript
// Product pages: revalidate every 60 seconds
export const revalidate = 60;

// Category pages: revalidate every 5 minutes
export const revalidate = 300;

// Blog posts: revalidate every hour
export const revalidate = 3600;
```

### 6.3 Vercel Analytics
```bash
npm install @vercel/analytics @vercel/speed-insights
```

```typescript
// /src/app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 7. Monitoring & Rollback

### 7.1 Deployment Monitoring
- **Vercel Dashboard**: Real-time deployment logs
- **Application Insights**: Server-side errors and performance
- **Vercel Analytics**: Core Web Vitals and user metrics

### 7.2 Instant Rollback
```bash
# List recent deployments
vercel list

# Rollback to previous deployment
vercel rollback

# Or promote a specific deployment
vercel promote <deployment-url>
```

### 7.3 Health Check Endpoint
```typescript
// /src/app/api/health/route.ts
export async function GET() {
  const checks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    services: {
      database: await checkDatabase(),
      storage: await checkStorage(),
    },
  };

  const allHealthy = Object.values(checks.services).every(s => s === "ok");
  
  return Response.json(checks, {
    status: allHealthy ? 200 : 503,
  });
}
```
