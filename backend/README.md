# Ikonnic E-Commerce Backend

## Complete Production-Ready Backend API for Ikonnic Personalised Gifts Platform

Built with **NestJS**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and **Redis**.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  localhost:3000 — Ikonnic Storefront                                │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ REST API
┌─────────────────────────────────▼───────────────────────────────────┐
│                    API GATEWAY / LOAD BALANCER                       │
│  Rate Limiting • CORS • Helmet • Compression                        │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                     NESTJS APPLICATION (Port 4000)                   │
├─────────────────────────────────────────────────────────────────────┤
│ Modules:                                                             │
│  ├── Auth (JWT, Refresh Tokens, OTP, Social Login)                  │
│  ├── Users (Profile, Addresses)                                      │
│  ├── Products (Catalog, Variants, Options)                           │
│  ├── Categories (Hierarchy, Filters, Volume Pricing)                 │
│  ├── Cart (Persistent, Guest, Merge)                                 │
│  ├── Wishlist (Add/Remove/List)                                      │
│  ├── Orders (State Machine, Tracking)                                │
│  ├── Payments (Razorpay, Stripe, Webhooks, Refunds)                 │
│  ├── Shipping (Serviceability, Tracking, Courier Integration)        │
│  ├── Coupons (Validation, Per-user Limits)                           │
│  ├── Reviews (CRUD, Verified Purchase)                               │
│  ├── Search (Full-text, Autocomplete)                                │
│  ├── Notifications (Email, SMS, WhatsApp)                            │
│  ├── Admin (Dashboard, Metrics, Management)                          │
│  └── Health (Liveness, Readiness)                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Infrastructure:                                                      │
│  ├── Prisma ORM → PostgreSQL                                        │
│  ├── Redis (Caching, Rate Limiting, Sessions)                        │
│  ├── Bull (Background Jobs)                                          │
│  └── Swagger (API Documentation)                                     │
└───────────┬─────────────────────────────────┬───────────────────────┘
            │                                 │
┌───────────▼─────────────┐    ┌──────────────▼──────────────┐
│   PostgreSQL (Port 5432) │    │     Redis (Port 6379)       │
│   ikonnic_db             │    │     Caching & Sessions      │
└──────────────────────────┘    └─────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start Infrastructure (Docker)
```bash
docker-compose up -d postgres redis
```

### 3. Run Database Migrations
```bash
npx prisma migrate dev --name init
```

### 4. Seed Database
```bash
npx prisma db seed
```

### 5. Start Development Server
```bash
npm run start:dev
```

### 6. Access
- **API**: http://localhost:4000/api/v1
- **Swagger Docs**: http://localhost:4000/docs
- **Health Check**: http://localhost:4000/api/v1/health
- **Adminer (DB)**: http://localhost:8080

---

## 📋 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email/phone |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout & revoke tokens |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset with OTP |
| POST | `/auth/verify-email` | Verify email with OTP |
| POST | `/auth/send-otp` | Send OTP |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get profile |
| PUT | `/users/profile` | Update profile |
| GET | `/users/addresses` | List addresses |
| POST | `/users/addresses` | Add address |
| PUT | `/users/addresses/:id` | Update address |
| DELETE | `/users/addresses/:id` | Delete address |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List with filters/pagination |
| GET | `/products/featured` | Featured products |
| GET | `/products/trending` | Trending products |
| GET | `/products/:slug` | Product details |
| GET | `/products/:slug/related` | Related products |
| GET | `/products/:id/stock` | Check stock |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | All categories |
| GET | `/categories/:slug` | Category details |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get cart |
| POST | `/cart/items` | Add to cart |
| PUT | `/cart/items/:id` | Update item |
| DELETE | `/cart/items/:id` | Remove item |
| DELETE | `/cart` | Clear cart |
| POST | `/cart/merge` | Merge guest cart |

### Wishlist
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wishlist` | Get wishlist |
| POST | `/wishlist/:productId` | Add item |
| DELETE | `/wishlist/:productId` | Remove item |
| GET | `/wishlist/check/:productId` | Check if in wishlist |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Create order |
| GET | `/orders` | Order history |
| GET | `/orders/:id` | Order details |
| GET | `/orders/track/:orderNumber` | Track order |
| PATCH | `/orders/:id/cancel` | Cancel order |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/initiate` | Initiate payment |
| POST | `/payments/verify` | Verify payment |
| POST | `/payments/refund` | Initiate refund |
| GET | `/payments/history/:orderId` | Payment history |
| POST | `/payments/webhook/:provider` | Gateway webhooks |

### Coupons
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/coupons/validate` | Validate coupon |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reviews/product/:productId` | Product reviews |
| POST | `/reviews` | Create review |
| PUT | `/reviews/:id` | Update review |
| DELETE | `/reviews/:id` | Delete review |

### Shipping
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shipping/check/:pincode` | Check serviceability |
| GET | `/shipping/track/:trackingNumber` | Track shipment |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=` | Full-text search |
| GET | `/search/autocomplete?q=` | Autocomplete |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Dashboard metrics |
| GET | `/admin/orders` | All orders |
| GET | `/admin/users` | All users |
| PATCH | `/admin/orders/:id/status` | Update order status |

---

## 🗄 Database Schema

### Core Tables
- `users` — Customer & admin accounts
- `sessions` — Active sessions
- `refresh_tokens` — JWT refresh token rotation
- `addresses` — Billing & shipping addresses
- `categories` — Product categories with hierarchy
- `products` — Product catalog
- `product_variants` — Size/color variants
- `product_options` — Configurable options
- `inventory_records` — Stock per warehouse
- `warehouses` — Production hubs (Jaipur, Bengaluru)
- `carts` / `cart_items` — Persistent shopping cart
- `wishlists` / `wishlist_items` — Wishlist
- `orders` / `order_items` — Order management
- `order_status_history` — Full status audit trail
- `payments` — Payment transactions
- `refunds` — Refund records
- `shipments` / `shipment_tracking` — Shipping
- `coupons` / `coupon_usages` — Discount system
- `reviews` — Product reviews
- `notifications` — Email/SMS/Push log
- `invoices` — Generated invoices
- `blog_posts` — Blog content
- `activity_logs` / `audit_logs` — Security audit

---

## 🔐 Security Features

- **JWT with Refresh Token Rotation** — Short-lived access tokens (15min), long-lived refresh (7d)
- **Password Hashing** — bcrypt with 12 rounds
- **Rate Limiting** — Throttler per IP/user
- **Input Validation** — class-validator on all DTOs
- **CORS** — Strict origin allowlist
- **Helmet** — Secure HTTP headers
- **RBAC** — Role-based access control (Customer, Admin, Super Admin)
- **SQL Injection Protection** — Prisma parameterized queries
- **XSS Protection** — Input sanitization + helmet

---

## 🐳 Deployment

### Docker
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

### Environment Variables
See `.env.example` for complete list.

---

## 🧪 Testing

```bash
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
```

---

## 📊 Order State Machine

```
PENDING → PAYMENT_CONFIRMED → IMAGE_PROCESSING → DESIGN_APPROVAL
  ↓              ↓                    ↓                 ↓
CANCELLED    CANCELLED           CANCELLED        PRINTING
                                                     ↓
                              REPRINT ←── QUALITY_CHECK
                                                     ↓
                                                  PACKING
                                                     ↓
                                                  SHIPPED
                                                     ↓
                                           OUT_FOR_DELIVERY
                                                     ↓
                                                DELIVERED
                                                     ↓
                                              RETURNED / REFUNDED
```

---

## 📦 Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Cache | Redis 7 |
| Auth | JWT + Passport |
| Payments | Razorpay + Stripe |
| Email | Nodemailer |
| Docs | Swagger/OpenAPI |
| Container | Docker |
| Orchestration | Kubernetes |
| Monitoring | Health checks + Prometheus-ready |

---

## 🗂 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma        # Complete database schema
│   └── seed.ts              # Database seeding
├── src/
│   ├── main.ts              # Application bootstrap
│   ├── app.module.ts        # Root module
│   ├── prisma/              # Database service
│   ├── redis/               # Cache service
│   └── modules/
│       ├── auth/            # Authentication & authorization
│       ├── users/           # User management
│       ├── products/        # Product catalog
│       ├── categories/      # Category management
│       ├── cart/            # Shopping cart
│       ├── wishlist/        # Wishlist
│       ├── orders/          # Order management
│       ├── payments/        # Payment processing
│       ├── shipping/        # Shipping & tracking
│       ├── coupons/         # Discount system
│       ├── reviews/         # Product reviews
│       ├── search/          # Search & autocomplete
│       ├── notifications/   # Email/SMS/Push
│       ├── admin/           # Admin dashboard
│       ├── upload/          # File uploads
│       └── health/          # Health checks
├── k8s/                     # Kubernetes manifests
├── docker-compose.yml       # Local development
├── Dockerfile               # Production image
└── package.json
```
