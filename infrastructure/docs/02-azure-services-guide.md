# Azure Services Configuration Guide

## Overview
This guide covers the detailed setup and configuration of all Azure services used by the Ikonnic e-commerce platform.

---

## 1. Azure PostgreSQL Flexible Server

### Connection Details
| Property | Value |
|----------|-------|
| Server | `ikonnic-pg-server.postgres.database.azure.com` |
| Port | `5432` |
| Database | `ikonnic_db` |
| SSL Mode | `require` |
| SKU | `B_Standard_B1ms` (1 vCore, 2GB RAM) |
| Storage | 32GB |

### Post-Provisioning Setup

#### 1.1 Connect to Database
```bash
# Install psql if not available
brew install libpq

# Connect
psql "host=ikonnic-pg-server.postgres.database.azure.com \
  port=5432 dbname=ikonnic_db user=ikonnic_admin \
  password=<from-keyvault> sslmode=require"
```

#### 1.2 Create Application Schema
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS auth;

-- Users table
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  provider VARCHAR(50) NOT NULL DEFAULT 'email',
  provider_id VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE app.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  category VARCHAR(100) NOT NULL,
  images TEXT[] DEFAULT '{}',
  variants JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE app.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart table
CREATE TABLE app.carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wishlist table
CREATE TABLE app.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES app.products(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Reviews table
CREATE TABLE app.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES app.products(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_category ON app.products(category);
CREATE INDEX idx_products_slug ON app.products(slug);
CREATE INDEX idx_orders_user ON app.orders(user_id);
CREATE INDEX idx_orders_status ON app.orders(status);
CREATE INDEX idx_orders_number ON app.orders(order_number);
CREATE INDEX idx_wishlists_user ON app.wishlists(user_id);
CREATE INDEX idx_reviews_product ON app.reviews(product_id);
```

#### 1.3 Create Read-Only User (for analytics)
```sql
CREATE ROLE ikonnic_readonly WITH LOGIN PASSWORD '<strong-password>';
GRANT USAGE ON SCHEMA app, auth TO ikonnic_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO ikonnic_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO ikonnic_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO ikonnic_readonly;
```

#### 1.4 Firewall Rules
```bash
# Allow Vercel edge network (all IPs for serverless)
az postgres flexible-server firewall-rule create \
  --resource-group Ikonnic-RG \
  --name ikonnic-pg-server \
  --rule-name AllowVercel \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 255.255.255.255

# For production: Use Private Link or restrict to known IPs
```

#### 1.5 Performance Tuning
```bash
# Adjust server parameters for B1ms
az postgres flexible-server parameter set \
  --resource-group Ikonnic-RG \
  --server-name ikonnic-pg-server \
  --name max_connections --value 50

az postgres flexible-server parameter set \
  --resource-group Ikonnic-RG \
  --server-name ikonnic-pg-server \
  --name shared_buffers --value "128MB"

az postgres flexible-server parameter set \
  --resource-group Ikonnic-RG \
  --server-name ikonnic-pg-server \
  --name work_mem --value "4MB"
```

#### 1.6 Backup & Recovery
- **Automated backups**: 7 days retention (default for B-series)
- **Point-in-time restore**: Available within retention window
- **Geo-redundant backup**: Not available on B-series (upgrade to GP for DR)

```bash
# Restore to point in time
az postgres flexible-server restore \
  --resource-group Ikonnic-RG \
  --name ikonnic-pg-restored \
  --source-server ikonnic-pg-server \
  --restore-time "2024-01-15T10:00:00Z"
```

---

## 2. Azure Blob Storage

### Container Structure
| Container | Access | Purpose |
|-----------|--------|---------|
| `products` | Private | Product images (served via SAS URLs) |
| `user-uploads` | Private | Customer customization uploads |
| `assets` | Blob (public read) | Static assets, category images |

### 2.1 Upload Strategy (SAS Tokens)

#### Server-Side SAS Generation (API Route)
```typescript
// /src/app/api/upload/route.ts
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);

export async function POST(request: Request) {
  const { filename, contentType, container = "user-uploads" } = await request.json();
  
  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(contentType)) {
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Generate unique blob name
  const blobName = `${Date.now()}-${crypto.randomUUID()}-${filename}`;
  const containerClient = blobServiceClient.getContainerClient(container);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Generate SAS token for upload (valid 15 minutes)
  const sasToken = generateBlobSASQueryParameters({
    containerName: container,
    blobName,
    permissions: BlobSASPermissions.parse("cw"), // create + write
    expiresOn: new Date(Date.now() + 15 * 60 * 1000),
    contentType,
  }, blobServiceClient.credential).toString();

  return Response.json({
    uploadUrl: `${blockBlobClient.url}?${sasToken}`,
    blobUrl: blockBlobClient.url,
    blobName,
  });
}
```

#### Client-Side Direct Upload
```typescript
// /src/lib/upload.ts
export async function uploadFile(file: File, container = "user-uploads") {
  // 1. Get SAS URL from our API
  const res = await fetch("/api/upload", {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      container,
    }),
  });
  const { uploadUrl, blobUrl } = await res.json();

  // 2. Upload directly to Azure Blob Storage
  await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type,
    },
    body: file,
  });

  return blobUrl;
}
```

### 2.2 Image Processing Pipeline
```typescript
// /src/lib/imageProcessing.ts
import sharp from "sharp";

export async function processProductImage(buffer: Buffer) {
  const variants = await Promise.all([
    // Thumbnail (200x200)
    sharp(buffer).resize(200, 200, { fit: "cover" }).webp({ quality: 80 }).toBuffer(),
    // Medium (600x600)  
    sharp(buffer).resize(600, 600, { fit: "inside" }).webp({ quality: 85 }).toBuffer(),
    // Large (1200x1200)
    sharp(buffer).resize(1200, 1200, { fit: "inside" }).webp({ quality: 90 }).toBuffer(),
  ]);

  return { thumbnail: variants[0], medium: variants[1], large: variants[2] };
}
```

### 2.3 CDN & Caching
```bash
# CORS is already configured in provisioning script
# For CDN, use Vercel's built-in image optimization:
# next.config.ts → images.remotePatterns

# Or enable Azure CDN (adds ~$7/month):
az cdn profile create \
  --resource-group Ikonnic-RG \
  --name ikonnic-cdn \
  --sku Standard_Microsoft

az cdn endpoint create \
  --resource-group Ikonnic-RG \
  --profile-name ikonnic-cdn \
  --name ikonnic-assets \
  --origin ikonnicstorage.blob.core.windows.net \
  --origin-host-header ikonnicstorage.blob.core.windows.net
```

### 2.4 Lifecycle Management
```bash
# Auto-delete temp uploads after 7 days
az storage account management-policy create \
  --account-name ikonnicstorage \
  --resource-group Ikonnic-RG \
  --policy '{
    "rules": [
      {
        "name": "cleanup-temp-uploads",
        "type": "Lifecycle",
        "definition": {
          "actions": {
            "baseBlob": {
              "delete": { "daysAfterModificationGreaterThan": 7 }
            }
          },
          "filters": {
            "blobTypes": ["blockBlob"],
            "prefixMatch": ["user-uploads/temp/"]
          }
        }
      }
    ]
  }'
```

---

## 3. Azure Key Vault

### Secret Inventory
| Secret Name | Description | Rotation |
|-------------|-------------|----------|
| `pg-connection-string` | PostgreSQL connection string | 90 days |
| `pg-admin-password` | Database admin password | 90 days |
| `storage-connection-string` | Blob storage connection | 90 days |
| `nextauth-secret` | NextAuth.js session secret | 180 days |
| `azure-ad-client-secret` | Entra ID app secret | 365 days |
| `google-client-secret` | Google OAuth secret | N/A |
| `sendgrid-api-key` | SendGrid email API key | 365 days |
| `razorpay-key-secret` | Payment gateway secret | 365 days |

### 3.1 Access from Vercel
```bash
# Option 1: Service Principal (recommended)
az ad sp create-for-rbac --name "ikonnic-vercel-sp" \
  --role "Key Vault Secrets User" \
  --scopes "/subscriptions/<SUB_ID>/resourceGroups/Ikonnic-RG/providers/Microsoft.KeyVault/vaults/ikonnic-kv"

# Option 2: Direct secret copy to Vercel env vars
az keyvault secret show --vault-name ikonnic-kv --name pg-connection-string --query value -o tsv
```

### 3.2 Secret Rotation Script
```bash
#!/bin/bash
# Rotate PostgreSQL password
NEW_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | head -c 24)

# Update in PostgreSQL
az postgres flexible-server update \
  --resource-group Ikonnic-RG \
  --name ikonnic-pg-server \
  --admin-password "$NEW_PASSWORD"

# Update in Key Vault
az keyvault secret set \
  --vault-name ikonnic-kv \
  --name pg-admin-password \
  --value "$NEW_PASSWORD"

# Update connection string
CONNECTION_STRING="postgresql://ikonnic_admin:${NEW_PASSWORD}@ikonnic-pg-server.postgres.database.azure.com:5432/ikonnic_db?sslmode=require"
az keyvault secret set \
  --vault-name ikonnic-kv \
  --name pg-connection-string \
  --value "$CONNECTION_STRING"

echo "✅ PostgreSQL password rotated. Update Vercel env vars!"
```

---

## 4. SendGrid Email Service

### 4.1 Account Setup
1. Create SendGrid account at [sendgrid.com](https://sendgrid.com)
2. Free tier: 100 emails/day (sufficient for MVP)
3. Generate API key with "Mail Send" permission

### 4.2 DNS Configuration (for ikonnic.com)
Add these DNS records at your domain registrar:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | `em1234.ikonnic.com` | `u1234.wl.sendgrid.net` | Domain authentication |
| CNAME | `s1._domainkey.ikonnic.com` | `s1.domainkey.u1234.wl.sendgrid.net` | DKIM |
| CNAME | `s2._domainkey.ikonnic.com` | `s2.domainkey.u1234.wl.sendgrid.net` | DKIM |
| TXT | `ikonnic.com` | `v=spf1 include:sendgrid.net ~all` | SPF |
| CNAME | `url1234.ikonnic.com` | `sendgrid.net` | Link tracking |

### 4.3 Email Templates

#### Order Confirmation Template
```json
{
  "template_id": "d-xxxxxxxxxxxxx",
  "subject": "Order Confirmed - {{orderNumber}}",
  "dynamic_data": {
    "customerName": "{{name}}",
    "orderNumber": "{{orderNumber}}",
    "orderTotal": "{{total}}",
    "items": "{{items}}",
    "shippingAddress": "{{address}}"
  }
}
```

#### Email Service Implementation
```typescript
// /src/lib/email.ts
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendOrderConfirmation(order: Order) {
  await sgMail.send({
    to: order.email,
    from: { email: "orders@ikonnic.com", name: "Ikonnic" },
    templateId: "d-order-confirmation-template-id",
    dynamicTemplateData: {
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      orderTotal: `₹${order.total}`,
      items: order.items,
      shippingAddress: order.shippingAddress,
    },
  });
}

export async function sendShippingUpdate(order: Order, trackingUrl: string) {
  await sgMail.send({
    to: order.email,
    from: { email: "shipping@ikonnic.com", name: "Ikonnic Shipping" },
    templateId: "d-shipping-update-template-id",
    dynamicTemplateData: {
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      trackingUrl,
    },
  });
}

export async function sendWelcomeEmail(user: { email: string; name: string }) {
  await sgMail.send({
    to: user.email,
    from: { email: "hello@ikonnic.com", name: "Ikonnic" },
    templateId: "d-welcome-template-id",
    dynamicTemplateData: {
      name: user.name,
    },
  });
}
```

### 4.4 Required Email Templates
| Template | Trigger | Priority |
|----------|---------|----------|
| Welcome | User registration | High |
| Order Confirmation | Order placed | High |
| Shipping Update | Status change | High |
| Password Reset | User request | High |
| Order Delivered | Delivery confirmed | Medium |
| Review Request | 3 days after delivery | Low |
| Abandoned Cart | 24h after cart activity | Low |

---

## 5. Application Insights & Monitoring

### 5.1 Next.js Integration
```bash
npm install applicationinsights @microsoft/applicationinsights-web
```

#### Server-Side Tracking
```typescript
// /src/lib/monitoring.ts
import * as appInsights from "applicationinsights";

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .start();
}

export const telemetryClient = appInsights.defaultClient;
```

#### Client-Side Tracking
```typescript
// /src/lib/analytics.ts
import { ApplicationInsights } from "@microsoft/applicationinsights-web";

export const appInsights = new ApplicationInsights({
  config: {
    connectionString: process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING,
    enableAutoRouteTracking: true,
    enableCorsCorrelation: true,
  },
});

// Initialize in layout
if (typeof window !== "undefined") {
  appInsights.loadAppInsights();
}
```

### 5.2 Custom Metrics
```typescript
// Track business events
telemetryClient.trackEvent({
  name: "OrderPlaced",
  properties: { orderNumber, paymentMethod },
  measurements: { orderTotal, itemCount },
});

telemetryClient.trackEvent({
  name: "ProductViewed",
  properties: { productId, category },
});

telemetryClient.trackEvent({
  name: "CartAbandoned",
  properties: { userId, itemCount },
  measurements: { cartValue },
});
```

### 5.3 Alerts Configuration
```bash
# Alert: High error rate (>5% in 5 minutes)
az monitor metrics alert create \
  --resource-group Ikonnic-RG \
  --name "high-error-rate" \
  --scopes "/subscriptions/<SUB_ID>/resourceGroups/Ikonnic-RG/providers/Microsoft.Insights/components/ikonnic.comsights" \
  --condition "count requests/failed > 5 where request/resultCode >= 500" \
  --window-size 5m \
  --evaluation-frequency 1m

# Alert: Slow response time (>3s average)
az monitor metrics alert create \
  --resource-group Ikonnic-RG \
  --name "slow-response" \
  --scopes "/subscriptions/<SUB_ID>/resourceGroups/Ikonnic-RG/providers/Microsoft.Insights/components/ikonnic.comsights" \
  --condition "avg requests/duration > 3000" \
  --window-size 5m
```
