# Ikonnic — Deployed-Environment E2E Validation Report

**Date:** 2026-07-06 · **Tester:** Claude Code (automated E2E suite + targeted probes)
**Frontend:** https://www.ikonnic.com (Vercel project `ikonnic`)
**Backend:** https://backend-xi-one-34.vercel.app/api/v1 (Vercel project `backend`, NestJS + Prisma + Azure PostgreSQL, region `bom1`)
**Fix commits:** `c84ef15`, `f6206f1`, plus the connection-exhaustion fix (all deployed to production and re-tested)

---

## 1. What was tested

A 91-test API suite ran against the **live production backend**, plus 11 targeted round-2 probes, 24 frontend route checks, file-upload and email-delivery verification. Every test hit the deployed environment (no mocks, no local servers).

| Area | Coverage |
|---|---|
| Registration & auth | register, duplicate/invalid/weak-password rejection, login, wrong-password 401, JWT session, malformed-token 401, refresh rotation, old-token revocation, logout revocation |
| Profile & addresses | get/update profile, create/list addresses (checkout payload shape) |
| Catalog | list + pagination, category filter, price filter + sort, detail by slug, related, featured, trending, stock check, 404s, search + autocomplete, SQLi-style input |
| Cart | guest cart, server-side price enforcement (tamper attempt ignored), invalid product, negative qty, update, remove, clear, guest→user merge |
| Checkout (COD) | order create with address, server-side price recompute (tampered `unitPrice: 1` ignored), COD forced, auto-confirm, `IKN-` numbering, 18% GST, free shipping ≥ ₹999, empty/fake/unauthenticated rejections |
| Orders | history, detail, ownership scoping, public tracking with identifier, wrong-identifier denial, customer cancel + stock restore |
| Emails (Gmail SMTP) | order confirmation & cancellation — verified as `SENT` in the notification log (Gmail accepted the messages); forgot-password OTP returns 200 with non-enumerating response |
| Admin | login, RBAC (customer → 403), dashboard, product CRUD with real admin-UI payloads, duplicate-slug 400, storefront propagation, inventory adjust + transaction log + low-stock report, order status updates + transition validation, users list, analytics, coupon CRUD + storefront validation |
| Stock integrity | oversell rejected (qty 99 > stock), race-safe conditional decrement, decrement/restore verified through order + cancel cycle |
| Media | image upload → Azure Blob (webp conversion works); public readability **blocked by account config** (see §4) |
| Frontend | 24 routes checked; auth-gating redirects (`/checkout`, `/account`, `/admin`, `/wishlist` → login); SSR renders live backend data; security headers; CORS allows prod origin, ignores unknown origins |

**Final result: 100 of 102 meaningful checks pass.** The two “failures” in run 3 (SG3/SG5) were test-arithmetic errors — recomputation confirmed stock behaved exactly correctly (10 + 5 adjustment − 2 order = 13; +2 after cancel = 15).

## 2. Issues found and fixed (deployed + re-verified)

1. **Deployed backend was stale.** Production ran a build from before the COD-enforcement/Gmail-SMTP commit — orders got `GFT-` numbers, stayed `PENDING`, and SMTP env vars added to Vercel were unused. → Redeployed; orders now `IKN-`, auto-`PAYMENT_CONFIRMED`, emails send.
2. **Checkout could create unfulfillable COD orders (critical).** The address DTO demanded `label`/`addressLine1` — fields that exist neither in the Prisma model nor in the checkout payload — so *every* new-address save failed; the frontend swallowed the error and placed orders with **no shipping address**. → DTO aligned to the model/frontend (`streetLine1`/`streetLine2`/`landmark`); checkout now blocks the order with a clear message if the address can't be saved. Verified: orders carry `shippingAddressId`.
3. **Profile update always 500.** DTO accepted `name`/`email`, service passed them raw to Prisma (no such columns). → `name` split onto `firstName`/`lastName`; email removed from unverified profile updates.
4. **Admin product create/update broken (triple contract mismatch).** Admin UI sends `title`/`categorySlug`/`gallery`/options; DTO whitelisted a different field set (`name`, required `slug`); service read `data.title` → any valid request 400'd or 500'd. → DTOs rewritten to the real UI/service contract; `sku`, `isActive`, `taxRate`, `weight`, `hsnCode`, size/thickness options now persist; duplicate slug and missing category return 400.
5. **No oversell guard.** Any quantity (tested 99,999) was accepted; inventory could go negative. → Conditional atomic decrement inside the order transaction (`stockCount >= qty` or full rollback); cancellation restores stock; `stockStatus` recomputed.
6. **Invalid admin order status → 500.** → `@IsEnum(OrderStatus)` (400 now); illegal transitions already validated (e.g. IMAGE_PROCESSING→SHIPPED rejected).
7. **“Deleted” products stayed live at their URL.** Hard delete failed on FK constraints for ordered products (500), and product detail didn't filter `isActive`. → Delete falls back to deactivation; `findBySlug` 404s inactive products (cached copies included).
8. **Stale product cache after admin/stock changes.** 5-minute cached product detail was never invalidated — price updates, deactivations and stock changes didn't reach the storefront. → Cache invalidation on product update/delete, inventory adjust, order create/cancel. Verified live: price 100→250 visible immediately.
9. **`/shop` redirected to a 404** (`/category/all` doesn't exist). → Redirects to `/`, plus a rescue redirect for clients that cached the old 308.
10. **`GET /notifications` didn't exist** though the frontend API client references it. → Added JWT-scoped list/mark-read/mark-all-read endpoints (also used to verify email delivery).
11. **Test hygiene:** broken spec DI wiring and stale expectations fixed — backend suite now 79/79 green.
12. **Every frontend build knocked the backend over for live traffic (critical, caught post-report).** Production builds prerender every product page (~460 routes across `/product` and `/customise`), fanning hundreds of concurrent requests into the backend. Each auto-scaled serverless instance opened a full Prisma connection pool against Azure PostgreSQL (Burstable tier, low `max_connections`), exhausting the server — real users got `FUNCTION_INVOCATION_FAILED` / `PrismaClientInitializationError` for the duration of the build. The storefront's local-data fallback masked this: builds "succeeded" while the API was down. → Fixed two ways: `PrismaService` now caps each instance at `connection_limit=1&pool_timeout=20` (standard Prisma-on-serverless setting, unless `DATABASE_URL` sets its own), and `/customise/[slug]` no longer prerenders all products (it duplicated the entire `/product/[slug]` fetch fan-out; now on-demand with the same 300s ISR). Frontend build time halved; backend health verified 200 through subsequent build windows.

## 3. Verified working (evidence-based)

- Full customer journey: register → browse/search → cart (guest + merged) → address → COD checkout → confirmation email (SMTP `SENT`) → history → public tracking → cancel → stock restored → cancellation email (`SENT`).
- Full admin journey: login → dashboard → product create/update/delete with live storefront propagation → inventory adjust with audit trail → order status pipeline with transition rules → customers, analytics, coupons.
- Security posture: server-side price recomputation (cart *and* order), COD forced server-side, RBAC enforced, ownership scoping on orders/addresses/notifications, refresh-token rotation + revocation, throttled auth endpoints, no `passwordHash` leakage, strict validation whitelist, security headers, CORS restricted to known origins.
- Performance (bom1, cold-ish samples): API 0.29–0.50s; SSR pages 0.4–1.2s. Acceptable for launch.

## 4. Remaining blockers (need account-owner decisions)

Two changes were deliberately left to you because they alter production security posture / secrets:

**(a) Blob public access — required before admin-uploaded imagery works.** Uploads land in Azure Blob (`ikonnicstorage/uploads`) and the API returns direct blob URLs, but the storage **account** has `allowBlobPublicAccess: false` → the URLs return 409 `PublicAccessNotPermitted`. Current catalog images are unaffected (served from `/images/...` in the frontend); this only breaks **newly uploaded** product/customization imagery.

Option A — match the app's current design (public read on blobs, no listing):
```bash
az storage account update --name ikonnicstorage --resource-group Ikonnic-RG --allow-blob-public-access true
az storage container set-permission --name uploads --account-name ikonnicstorage --public-access blob --auth-mode login
```
Option B — keep the account private and serve images via SAS URLs / a backend proxy (code change; the upload module already has SAS support).

**(b) Optional: mirror the DB pooling params into the Vercel env var.** The `connection_limit=1` cap now lives in code (`PrismaService`). If you'd rather manage it in configuration, update the `backend` project's production `DATABASE_URL` to append `connection_limit=1&pool_timeout=20&connect_timeout=15` — the code detects existing params and defers to them. Purely optional; the code-level fix is already live.

## 5. Non-blocking observations

- **Cache is per-instance** (Redis disabled → in-memory fallback). Invalidation works within an instance; cross-instance staleness is bounded by the 5-min TTL. For multi-instance correctness, provision managed Redis (e.g. Upstash via Vercel Marketplace) and set `REDIS_ENABLED=true`.
- Password-reset OTP emails aren't linked to a `userId` in the notification log (they send fine; they just don't appear in the user's feed).
- Guest checkout is intentionally login-gated by middleware; the localStorage "demo order" fallback in `CheckoutClient` is dead code and could be removed.
- No UI currently consumes the notifications endpoints (API-complete, UI-optional).
- `/account` page is still a local demo profile rather than backend-driven.
- Consider setting `git config user.email` — commits currently use a machine-local identity.

## 6. Production readiness & go-live recommendation

**GO — with one caveat.** Every revenue-critical flow (browse → cart → COD checkout → email → tracking → admin fulfillment) now works end-to-end in production with server-side pricing, stock integrity, and working transactional email. Recommendation:

1. **Before announcing launch:** decide and apply the Azure blob-access option (§4) so admin-uploaded imagery renders.
2. **Week-1 hardening (non-blocking):** managed Redis, remove dead guest-checkout code, wire `/account` to the real profile API.
