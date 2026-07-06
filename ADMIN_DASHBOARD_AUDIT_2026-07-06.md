# Ikonnic Admin Dashboard — Comprehensive Audit & Remediation Report

**Date:** 6 July 2026
**Scope:** Admin Portal across deployed frontend, backend, database, APIs, auth layer, storage
**Frontend:** https://www.ikonnic.com (Next.js 16, App Router, Vercel `bom1`)
**Backend:** https://backend-xi-one-34.vercel.app/api/v1 (NestJS + Prisma + Azure PostgreSQL)
**Method:** Full code review + live API validation with a real `SUPER_ADMIN` token + post-deploy re-test.

---

## Executive Summary

The Admin Portal was **functional but had one launch-blocking defect and several correctness/UX gaps**. All were fixed, deployed to production, and re-verified live.

- **Blocking bug fixed:** admin-uploaded product/category images uploaded "successfully" but were **not viewable** by browsers (Azure returned `409 PublicAccessNotPermitted`). Uploads now return long-lived read-SAS URLs — verified `HTTP 200 image/webp` anonymously post-deploy.
- **Missing capability added:** there was **no Category management UI** at all (backend endpoints existed but were unreachable from the console, and category `accent`/`featured` were silently rejected by validation). A full Categories CRUD screen was built and wired.
- **5 additional bugs fixed:** wrong AOV math, missing order-status audit trail, misleading/failing product delete, wrong HTTP code on category delete, stock-status casing mismatch.
- **Dashboard enriched** with recent orders and low-stock alerts (previously a single count).

**Production readiness: 92/100 — GO for launch**, with 2 non-blocking follow-ups (below).

---

## 1. Admin Features Currently Implemented (verified live)

| Area | Capability | Status |
|------|-----------|--------|
| **Auth & Security** | Admin login/logout, JWT + refresh rotation, rate limiting | ✅ Working |
| | RBAC (`ADMIN`/`SUPER_ADMIN` only) on all admin endpoints | ✅ Enforced (401 unauth, 403 customer) |
| | Route protection via middleware (redirect to `/login?redirect=…`) | ✅ Working |
| | Server-side authorization (guards) — authoritative | ✅ Working |
| **Dashboard** | Revenue, orders, customers, AOV cards | ✅ Working |
| | Orders-by-status breakdown, top products | ✅ Working |
| | Recent orders list + low-stock alerts + quick actions | ✅ **Added this audit** |
| **Products** | Create / edit / delete, images + gallery upload, pricing, tags, size/thickness options, featured/sale, search + pagination | ✅ Working |
| **Categories** | Create / edit / delete, image, accent, featured, visibility toggle, product counts | ✅ **UI added this audit** |
| **Orders** | List with customer info + items, status filter, status update (validated state machine), pagination | ✅ Working |
| **Inventory** | Stock levels, reserved/available, adjustments (absolute/delta), low-stock filter, transaction audit trail | ✅ Working |
| **Coupons** | Create / edit / delete, %/flat, limits, expiry, per-user cap, usage tracking, activate/deactivate | ✅ Working |
| **Analytics** | Daily revenue trend, order-status funnel, new customers, AOV, top products, 7/30/90-day ranges | ✅ Working |
| **Customers** | Listing with role, verification, order counts, join date, pagination | ✅ Working |
| **Media** | Single/multiple/avatar upload to Azure Blob, SAS direct-upload, delete | ✅ Working (fixed) |
| **Emails** | Order confirmation, status update, cancellation (nodemailer/SMTP) | ✅ Working |

---

## 2. Missing / Partially Implemented

> **Update (round 2):** the items originally listed here — order detail, internal notes,
> reviews moderation, customer detail + account status, and reports export — have now been
> **built and deployed**. See [§11 Round 2](#11-round-2--additional-pages-built). The list below
> is what genuinely remains.

Still not built (require larger, dedicated subsystems — marked non-live in the console):

- **Templates editor** — customizer template geometry (printable area, safe zone, bleed, masks, text zones). Needs a visual editor + template schema work.
- **Production queue** — per-item production workflow (image approval → print → QC → pack → dispatch). Needs a production-ops domain.
- **Standalone Shipping dashboard** — bulk courier assignment / AWB / failed-delivery queues. *(Per-order shipment creation via Shiprocket is wired on the order detail page.)*
- **Support tickets** — contact/ticketing subsystem.
- **Granular roles** — `PRODUCTION_MANAGER` / `SUPPORT_AGENT` exist in the enum but admin access is all-or-nothing (`ADMIN`/`SUPER_ADMIN`). No per-role scoping.

None block go-live for a COD storefront; they are operational-maturity enhancements.

---

## 3. Bugs Identified & Fixed

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| B1 | **Critical** | Uploaded images returned a bare blob URL that anonymous browsers can't read → `409 PublicAccessNotPermitted`; product/category images would render broken on the storefront. | `UploadService` now stamps a long-lived **read-SAS** token on returned URLs (config `AZURE_BLOB_PUBLIC_READ`, `AZURE_BLOB_READ_SAS_TTL_DAYS`) and derives account name/key from the connection string so SAS always works. Verified `HTTP 200` anonymously. |
| B2 | High | `deleteProduct` always fell into the catch block and reported "Product has existing orders" even for products with none; it could never hard-delete a product that had an inventory record. | Distinguish real order references (soft-delete) from clean deletes; remove dependent options/images/cart/wishlist/inventory rows then hard-delete; accurate `message` + `deactivated` flag. |
| B3 | Medium | Admin order-status changes never recorded **who** changed them (`changedBy` always null) — controller didn't inject the request user. | Controller now injects `@Req()` and passes the admin id through to `OrderStatusHistory.changedBy`. |
| B4 | Medium | Dashboard **AOV was wrong** — non-cancelled revenue divided by *all* orders (incl. cancelled). | Divide by non-cancelled order count. (Live: ₹27.5M vs previously ₹10.3M for the same data.) |
| B5 | Medium | Category `accent` and `featured` were **silently rejected** by the global `forbidNonWhitelisted` validation pipe (missing from DTO), so they could never be set via API; `deleteCategory` returned `404` for a conflict. | Added `accent`/`featured` (and optional `slug`) to category DTOs; `deleteCategory` now returns **409 Conflict** with a clear message and blocks on subcategories. |
| B6 | Low | Product stock-status badge/select used UPPERCASE values but the backend stores/returns lowercase (`in_stock`), so the badge colour never matched and the edit select mis-selected. | Normalised frontend to lowercase to match the backend. |

---

## 4. Frontend Fixes Completed

- **New Category Management screen** (`/admin/categories`, `AdminCategoriesClient.tsx`): full CRUD, image upload, accent colour picker, featured + visibility toggles, product counts, slug locked on edit to protect storefront URLs.
- **Product form:** replaced the free-text "Category Slug" input with a **category dropdown** populated from the live categories list; fixed stock-status casing.
- **Dashboard:** added a **Recent Orders** panel, **Low-Stock Alerts** panel (with count badge), and a full **Quick Actions** row linking every module.
- **Admin console landing:** added the Categories module card (marked LIVE), tightened Products/Categories descriptions.

## 5. Backend Fixes Completed

- `upload.service.ts`: read-SAS public URLs + connection-string credential parsing (B1).
- `admin.service.ts`: corrected AOV; added `recentOrdersList` / `lowStockProducts` / `lowStockCount` to the dashboard; rewrote `deleteProduct` (B2); `deleteCategory` → 409 + subcategory guard; category-cache invalidation on create/update/delete.
- `admin.controller.ts`: capture admin id for order-status audit trail (B3).
- `admin.dto.ts`: category DTO accepts `accent`/`featured`, `slug` optional (B5).

## 6. Database / Schema

**No migration required.** The Prisma schema already supported every field involved (`OrderStatusHistory.changedBy`, `Coupon.usedCount`, `Order.internalNotes`, `Category.accent/featured`, inventory tables). The defects were in **DTO validation and service logic**, not the schema. Cache invalidation for `categories:all` was added so admin category edits reflect on the storefront within one request rather than after the 10-min TTL.

## 7. APIs Added / Corrected

- No new endpoints were required — the category CRUD endpoints already existed and are now reachable from the UI.
- **Response shapes corrected:** `GET /admin/dashboard` now returns `recentOrdersList`, `lowStockProducts`, `lowStockCount`, and a corrected `aov`.
- **Request contracts corrected:** `POST/PUT /admin/categories` now accept `accent`, `featured`, and an optional `slug`.
- **Status codes corrected:** `DELETE /admin/categories/:id` → `409` on conflict (was `404`).

---

## 8. Final End-to-End Test Results (post-deploy, live production)

| Test | Result |
|------|--------|
| All 8 admin endpoints unauthenticated | ✅ 401 |
| Customer token → admin endpoints (GET/POST/DELETE) | ✅ 403 (RBAC) |
| Admin login (`SUPER_ADMIN`) | ✅ token issued |
| Dashboard: keys + corrected AOV + recent orders + low-stock | ✅ AOV ₹27.5M (÷3 non-cancelled), 8 recent orders, lowStock fields present |
| Analytics (7/30/90d) | ✅ correct buckets |
| Orders list / status filter / pagination | ✅ |
| Order status invalid transition / invalid enum | ✅ 400 both |
| Coupon create → update → delete | ✅ full lifecycle |
| Category create **with accent+featured** | ✅ persisted (was rejected pre-fix) |
| Product create → update → inventory adjust → transaction log | ✅ |
| **Product hard-delete with inventory records** | ✅ "deleted successfully", `deactivated:false` (was stuck pre-fix) |
| Category delete with product | ✅ **409 Conflict** with clear message |
| Category delete when empty | ✅ deleted |
| **Image upload → anonymous fetch of returned URL** | ✅ **HTTP 200 image/webp** (was 409 pre-fix) |
| Frontend admin routes (9) | ✅ 307 → `/login?redirect=…` when unauth (guard works) |
| Frontend home / login / product SSR | ✅ 200 |
| Backend health post-deploy | ✅ `ok` |
| Test data cleanup | ✅ catalog back to baseline (50 categories, 0 audit artifacts) |

---

## 9. Production Readiness Assessment — **92 / 100 · GO**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Authentication & RBAC | 10/10 | 401/403 enforced server-side; middleware UX guard |
| Core CRUD (products/categories/coupons/inventory) | 10/10 | All verified live incl. edge cases |
| Media / image pipeline | 9/10 | Fixed; SAS URLs work regardless of account setting |
| Dashboard & analytics | 9/10 | Enriched; data integrity correct |
| Order management | 7/10 | Status flow solid; no detail view / internal notes yet |
| Observability | 8/10 | App Insights + Sentry wired; audit trail now records admin id |
| Operational maturity | 7/10 | Production/shipping/support/reviews modules pending |

## 10. Go-Live Recommendations & Remaining Risks

**Ship now.** Revenue-critical and catalog-management flows are correct and verified.

**Recommended within week 1 (non-blocking):**
1. **SAS key rotation awareness** — read-SAS URLs are signed with the storage account key; if the key is rotated, previously-issued image URLs break. Preferred long-term: enable *blob public read* on the account (then set `AZURE_BLOB_PUBLIC_READ=true`) or front the container with a CDN. The SAS approach is the safe default that makes images work today without touching Azure account settings.
2. **Admin order detail view + internal notes** — highest-value missing operational screen.

**Known/accepted risks (unchanged from prior audits):**
- Stateless JWT: access token remains valid until its ~15-min TTL after logout (refresh token is revoked). A demoted/deactivated admin retains access until token expiry — acceptable given the short TTL; add a per-request DB check only if stricter revocation is required.
- Per-instance in-memory cache (5–10 min TTL) rather than shared Redis — bounded staleness, non-blocking.

**Deployment:** backend + frontend built clean, committed to branch `admin-audit-fixes` (pushed), and deployed to production via Vercel CLI (`backend-xi-one-34.vercel.app`, `www.ikonnic.com`). Merge `admin-audit-fixes` → `main` to align git integration.

---

## 11. Round 2 — Additional Pages Built

A second pass built the operational screens that were missing and fixed one more latent bug.

### New bug found & fixed
- **Reviews never appeared on the storefront.** `getProductReviews` filters `isApproved: true`, reviews are created with `isApproved: false`, and there was **no moderation UI** — so no customer review could ever be published. A moderation screen now lets admins approve/hide reviews (2 pending reviews were found in production).

### New backend endpoints (admin module)
| Endpoint | Purpose |
|----------|---------|
| `GET /admin/orders/:id` | Full order detail (no owner scoping) |
| `PATCH /admin/orders/:id/notes` | Internal (admin-only) order notes |
| `GET /admin/users/:id` | Customer detail: order history, addresses, lifetime value |
| `PATCH /admin/users/:id/status` | Activate/deactivate customer (guards self + non-customer accounts) |
| `GET /admin/reviews` · `PATCH /admin/reviews/:id` · `DELETE /admin/reviews/:id` | Review moderation (approve/hide/reply/delete, pending filter) |

### New frontend pages
- **`/admin/orders/[id]`** — items with customisation JSON, uploaded artwork + preview links, shipping/billing address, full status timeline, payment, status update, internal notes editor, and Shiprocket "Create shipment".
- **`/admin/customers/[id]`** — profile, order count / lifetime value / reviews stats, order history (linked), saved addresses, and an activate/deactivate control.
- **`/admin/reviews`** — moderation queue with pending/approved/all filters, approve/hide, public admin replies, delete, photo reviews.
- **Analytics CSV export**; orders & customers list rows now deep-link to detail pages; console marks Orders/Customers/Reviews live.

### Round-2 live test results (production)
| Test | Result |
|------|--------|
| `GET /admin/orders/:id` full payload | ✅ items, timeline, payments, address, user, shipment |
| Internal notes set + clear | ✅ 200 both |
| `GET /admin/users/:id` (orders + LTV + addresses) | ✅ |
| Deactivate → login blocked → reactivate → login works | ✅ **401 while deactivated, 200 after** |
| Self-deactivate guard | ✅ 400 |
| Reviews list + pending filter | ✅ `pendingCount: 2` |
| Review approve → revert | ✅ net-zero |
| New frontend routes (`/admin/reviews`, `/admin/orders/[id]`, `/admin/customers/[id]`) | ✅ 307 guard (routes live) |

### Revised readiness — **95 / 100 · GO**
Order management rises to **10/10** (detail view, timeline, notes, shipment) and a **Reviews (9/10)** capability is added. Remaining gaps (Templates, Production queue, standalone Shipping dashboard, Support, granular roles) are post-launch operational-maturity work, not blockers.

---

## 12. Round 3 — Redesign Audit (sidebar/topbar/dashboard shell)

A subsequent redesign added a persistent sidebar + topbar shell and rebuilt the dashboard. Auditing it surfaced **fabricated and broken data being shown to the business owner** — the most serious class of issue for an admin console.

### Bugs found & fixed
| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| R1 | **High** | Dashboard showed **hardcoded fake trends** — "+12.5%" revenue, "+3.2%" AOV, "vs 2.1% prev" conversion — all static strings, always green/up. | Removed all fabricated trends; each KPI now shows a truthful sublabel only. |
| R2 | **High** | "Failed Payments" read a non-existent order status (`PAYMENT_FAILED`) → **always 0**. | Backend now returns `failedPayments` from real `Payment.status = FAILED`. |
| R3 | **High** | "Pending Production" read non-existent statuses (`PROCESSING`/`IN_PRODUCTION`) → **always 0**. | "In Production" now sums the real workflow statuses (IMAGE_PROCESSING…PACKING, REPRINT). |
| R4 | Medium | "Conversion Rate" was orders÷customers mislabeled as a conversion %, with a fake prior-period comparison. | Replaced with a real **Delivered** count. |
| R5 | Medium | Order-status color maps used wrong keys (`CONFIRMED`/`PROCESSING`) → most statuses fell to grey. | Corrected to the real `OrderStatus` enum; shared map for grid + badges. |
| R6 | Medium | Top-bar **theme toggle** did nothing (no dark-mode system). | Removed (dead control). |
| R7 | Medium | **Notifications bell** showed a permanent fake unread dot, not wired to data. | Wired to the real notifications API — live unread badge, dropdown, mark-all-read. |
| R8 | Medium | Global **search** was inert (showed ⌘K hint, no handler). | ⌘K focuses it; Enter routes to `/admin/products?q=` and the list honours it. |
| R9 | Low | Dashboard period `<select>` was a dead control. | Replaced with a link to Analytics. |
| R10 | Low | Sidebar and mobile drawer **duplicated** the nav list and had **diverged** (Reviews placement, Settings/Audit). | Single shared `ADMIN_NAV` config used by both. |
| R11 | Low | Quick-action "New" links didn't open create forms; inner pages kept a redundant "← Admin Console" link beside the new sidebar. | `?action=new` opens the form (Products, Coupons); redundant back-links removed. |

### Round-3 live test results (production)
- `GET /admin/dashboard` → `failedPayments: 0` (real), In Production derives `1` from `IMAGE_PROCESSING`, Delivered `0`, status keys real — ✅
- Notifications API returns `[]` → bell shows **no fake badge** — ✅
- Frontend admin routes return the 307 auth-guard redirect — ✅
- Both projects typecheck + build clean; deployed to production.

### Remaining (cosmetic / low-risk, non-blocking)
- Inner list pages still carry their own container padding/max-width inside the shell (minor double-padding).
- The layout shell renders admin chrome for any authenticated user; per-page role checks + backend RBAC still gate all data (no security impact).
- Sidebar collapse state isn't persisted across reloads.

**Readiness holds at 95/100 · GO** — Round 3 removed misleading data and dead controls, materially improving trust in the console.
