# Environment Variables Matrix

## Complete Environment Variable Reference for Ikonnic E-Commerce Platform

---

## Variable Categories

### 🔐 Secrets (stored in Azure Key Vault)
### 🌐 Public (safe for client-side exposure)
### ⚙️ Config (server-side only, non-secret)

---

## Full Matrix

| Variable | Category | Required | Source | Dev Value | Production Value |
|----------|----------|----------|--------|-----------|-----------------|
| **── Core ──** | | | | | |
| `NODE_ENV` | ⚙️ | ✅ | Auto | `development` | `production` |
| `NEXT_PUBLIC_APP_URL` | 🌐 | ✅ | Manual | `http://localhost:3000` | `https://ikonnic.com` |
| `NEXT_PUBLIC_APP_NAME` | 🌐 | ✅ | Manual | `Ikonnic (Dev)` | `Ikonnic` |
| `NEXT_PUBLIC_API_URL` | 🌐 | ✅ | Manual | `http://localhost:3000/api` | `https://ikonnic.com/api` |
| **── Auth (Entra ID) ──** | | | | | |
| `AZURE_AD_CLIENT_ID` | ⚙️ | ✅ | App Registration | `<dev-app-id>` | `<prod-app-id>` |
| `AZURE_AD_CLIENT_SECRET` | 🔐 | ✅ | Key Vault | `<dev-secret>` | `<prod-secret>` |
| `AZURE_AD_TENANT_ID` | ⚙️ | ✅ | Azure Portal | `<tenant-id>` | `<tenant-id>` |
| `NEXTAUTH_URL` | ⚙️ | ✅ | Manual | `http://localhost:3000` | `https://ikonnic.com` |
| `NEXTAUTH_SECRET` | 🔐 | ✅ | Generated | `<dev-secret>` | `<prod-secret>` |
| **── Auth (Google) ──** | | | | | |
| `GOOGLE_CLIENT_ID` | ⚙️ | ✅ | Google Console | `<dev-client-id>` | `<prod-client-id>` |
| `GOOGLE_CLIENT_SECRET` | 🔐 | ✅ | Key Vault | `<dev-secret>` | `<prod-secret>` |
| **── Database ──** | | | | | |
| `DATABASE_URL` | 🔐 | ✅ | Key Vault | `postgresql://localhost:5432/ikonnic_dev` | `postgresql://ikonnic_admin:<pass>@ikonnic-pg-server.postgres.database.azure.com:5432/ikonnic_db?sslmode=require` |
| `DATABASE_URL_UNPOOLED` | 🔐 | ❌ | Key Vault | Same as DATABASE_URL | Same as DATABASE_URL |
| **── Storage ──** | | | | | |
| `AZURE_STORAGE_CONNECTION_STRING` | 🔐 | ✅ | Key Vault | `UseDevelopmentStorage=true` | `DefaultEndpointsProtocol=https;AccountName=ikonnicstorage;...` |
| `AZURE_STORAGE_ACCOUNT_NAME` | ⚙️ | ✅ | Manual | `devstorageaccount` | `ikonnicstorage` |
| `NEXT_PUBLIC_STORAGE_URL` | 🌐 | ✅ | Manual | `http://127.0.0.1:10000/devstorageaccount` | `https://ikonnicstorage.blob.core.windows.net` |
| **── Email ──** | | | | | |
| `SENDGRID_API_KEY` | 🔐 | ✅ | Key Vault | `SG.test-key` | `SG.production-key` |
| `SENDGRID_FROM_EMAIL` | ⚙️ | ✅ | Manual | `noreply@test.ikonnic.com` | `orders@ikonnic.com` |
| `SENDGRID_FROM_NAME` | ⚙️ | ❌ | Manual | `Ikonnic (Test)` | `Ikonnic` |
| **── Payment ──** | | | | | |
| `RAZORPAY_KEY_ID` | ⚙️ | ✅ | Razorpay Dashboard | `rzp_test_xxxxx` | `rzp_live_xxxxx` |
| `RAZORPAY_KEY_SECRET` | 🔐 | ✅ | Key Vault | `<test-secret>` | `<live-secret>` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | 🌐 | ✅ | Razorpay Dashboard | `rzp_test_xxxxx` | `rzp_live_xxxxx` |
| `RAZORPAY_WEBHOOK_SECRET` | 🔐 | ✅ | Razorpay Dashboard | `<test-webhook-secret>` | `<live-webhook-secret>` |
| **── Monitoring ──** | | | | | |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | ⚙️ | ❌ | Azure Portal | _(not set)_ | `InstrumentationKey=xxx;...` |
| `NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING` | 🌐 | ❌ | Azure Portal | _(not set)_ | `InstrumentationKey=xxx;...` |
| **── Feature Flags ──** | | | | | |
| `NEXT_PUBLIC_ENABLE_REVIEWS` | 🌐 | ❌ | Manual | `true` | `true` |
| `NEXT_PUBLIC_ENABLE_WISHLIST` | 🌐 | ❌ | Manual | `true` | `true` |
| `NEXT_PUBLIC_ENABLE_CUSTOMIZER` | 🌐 | ❌ | Manual | `true` | `true` |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | 🌐 | ❌ | Manual | `false` | `false` |
| **── Vercel (Auto) ──** | | | | | |
| `VERCEL` | ⚙️ | Auto | Vercel | _(not set)_ | `1` |
| `VERCEL_ENV` | ⚙️ | Auto | Vercel | _(not set)_ | `production` |
| `VERCEL_URL` | ⚙️ | Auto | Vercel | _(not set)_ | `ikonnic.vercel.app` |
| `VERCEL_GIT_COMMIT_SHA` | ⚙️ | Auto | Vercel | _(not set)_ | `<commit-hash>` |

---

## .env.local Template (Development)

```env
# ─── Core ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Ikonnic (Dev)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# ─── Authentication ─────────────────────────────────
AZURE_AD_CLIENT_ID=your-dev-app-id
AZURE_AD_CLIENT_SECRET=your-dev-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

GOOGLE_CLIENT_ID=your-google-dev-client-id
GOOGLE_CLIENT_SECRET=your-google-dev-secret

# ─── Database ───────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ikonnic_dev

# ─── Storage ────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
AZURE_STORAGE_ACCOUNT_NAME=devstorageaccount
NEXT_PUBLIC_STORAGE_URL=http://127.0.0.1:10000/devstorageaccount

# ─── Email ──────────────────────────────────────────
SENDGRID_API_KEY=SG.test-key-here
SENDGRID_FROM_EMAIL=noreply@test.ikonnic.com
SENDGRID_FROM_NAME=Ikonnic (Test)

# ─── Payment ────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your-test-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_WEBHOOK_SECRET=your-test-webhook-secret

# ─── Monitoring (optional in dev) ───────────────────
# APPLICATIONINSIGHTS_CONNECTION_STRING=
# NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING=

# ─── Feature Flags ──────────────────────────────────
NEXT_PUBLIC_ENABLE_REVIEWS=true
NEXT_PUBLIC_ENABLE_WISHLIST=true
NEXT_PUBLIC_ENABLE_CUSTOMIZER=true
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

---

## .env.example (Committed to repo)

```env
# Copy this file to .env.local and fill in values
# See infrastructure/docs/04-environment-variables.md for details

NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Ikonnic
NEXT_PUBLIC_API_URL=

AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

DATABASE_URL=

AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_ACCOUNT_NAME=
NEXT_PUBLIC_STORAGE_URL=

SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_WEBHOOK_SECRET=

APPLICATIONINSIGHTS_CONNECTION_STRING=
NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING=

NEXT_PUBLIC_ENABLE_REVIEWS=true
NEXT_PUBLIC_ENABLE_WISHLIST=true
NEXT_PUBLIC_ENABLE_CUSTOMIZER=true
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

---

## Validation Script

```typescript
// /src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Core
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  
  // Auth
  AZURE_AD_CLIENT_ID: z.string().min(1),
  AZURE_AD_CLIENT_SECRET: z.string().min(1),
  AZURE_AD_TENANT_ID: z.string().uuid(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  
  // Database
  DATABASE_URL: z.string().startsWith("postgresql://"),
  
  // Storage
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
  AZURE_STORAGE_ACCOUNT_NAME: z.string().min(1),
  NEXT_PUBLIC_STORAGE_URL: z.string().url(),
  
  // Email
  SENDGRID_API_KEY: z.string().startsWith("SG."),
  SENDGRID_FROM_EMAIL: z.string().email(),
  
  // Payment
  RAZORPAY_KEY_ID: z.string().startsWith("rzp_"),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().startsWith("rzp_"),
  
  // Optional
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}
```
