# Production Readiness Checklist

## Ikonnic E-Commerce Platform — Pre-Launch Verification

---

## 🔐 Security

### Authentication & Authorization
- [ ] Microsoft Entra ID app registration configured
- [ ] Redirect URIs match production domain exactly
- [ ] Client secret stored in Key Vault (not in code)
- [ ] Google OAuth configured with production redirect URIs
- [ ] NEXTAUTH_SECRET is unique per environment (min 32 chars)
- [ ] Admin routes protected by role check (middleware + page level)
- [ ] API routes validate session/JWT on every request
- [ ] CORS configured correctly (only allow ikonnic.com)
- [ ] Rate limiting on authentication endpoints
- [ ] Account lockout after failed attempts

### Data Protection
- [ ] All database connections use SSL/TLS (`sslmode=require`)
- [ ] No secrets in source code or git history
- [ ] All secrets in Azure Key Vault
- [ ] Environment variables set in Vercel (not .env files in production)
- [ ] PII data encrypted at rest (Azure default)
- [ ] File uploads validated (type, size, content)
- [ ] SQL injection prevention (parameterized queries/ORM)
- [ ] XSS protection headers set
- [ ] CSRF protection enabled (NextAuth default)

### Infrastructure Security
- [ ] Key Vault access restricted to necessary principals only
- [ ] Storage account is private (no public anonymous access)
- [ ] SAS tokens are short-lived (≤15 minutes for uploads)
- [ ] PostgreSQL firewall rules configured
- [ ] No debug/development endpoints exposed
- [ ] Error messages don't leak internal details to users

---

## 🌐 Network & DNS

### Domain Configuration
- [ ] `ikonnic.com` points to Vercel (A record: 76.76.21.21)
- [ ] `www.ikonnic.com` redirects to `ikonnic.com`
- [ ] SSL certificate active and auto-renewing (Vercel managed)
- [ ] HSTS header enabled (Strict-Transport-Security)
- [ ] DNS propagation verified globally

### Email DNS
- [ ] SPF record configured for SendGrid
- [ ] DKIM records (s1, s2) configured
- [ ] Domain authenticated in SendGrid dashboard
- [ ] Test email delivery from `orders@ikonnic.com`

---

## 🗄️ Database

### PostgreSQL Configuration
- [ ] Production database created (`ikonnic_db`)
- [ ] Schema migrations applied (all tables exist)
- [ ] Indexes created for frequently queried columns
- [ ] Connection string works from Vercel functions
- [ ] SSL connection verified
- [ ] Backup policy confirmed (7-day retention)
- [ ] Point-in-time restore tested
- [ ] Read-only user created for analytics (optional)
- [ ] Max connections parameter set (50 for B1ms)
- [ ] Connection pooling evaluated (PgBouncer for >1000 users)

### Data Integrity
- [ ] Foreign key constraints in place
- [ ] NOT NULL constraints on required fields
- [ ] Unique constraints on emails, slugs, order numbers
- [ ] Check constraints on prices (>0), ratings (1-5)
- [ ] Default values set for created_at/updated_at

---

## 📦 Storage

### Azure Blob Storage
- [ ] Containers created: `products`, `user-uploads`, `assets`
- [ ] CORS rules configured for ikonnic.com
- [ ] SAS token generation works from API routes
- [ ] Direct upload flow tested (client → Blob Storage)
- [ ] File type validation (only images: jpg, png, webp)
- [ ] File size limit enforced (max 10MB)
- [ ] Lifecycle policy for temp uploads (7-day cleanup)
- [ ] Images accessible via `next/image` optimization

---

## 📧 Email

### SendGrid Configuration
- [ ] API key generated and stored in Key Vault
- [ ] Domain authentication complete (SPF + DKIM)
- [ ] Sender identity verified
- [ ] Email templates created:
  - [ ] Welcome email
  - [ ] Order confirmation
  - [ ] Shipping update
  - [ ] Password reset
- [ ] Test emails received in inbox (not spam)
- [ ] Unsubscribe link present in marketing emails
- [ ] Reply-to address configured

---

## 💳 Payment

### Razorpay Configuration
- [ ] Live mode credentials obtained
- [ ] Live key ID and secret stored in Key Vault
- [ ] Webhook endpoint configured (`/api/webhooks/razorpay`)
- [ ] Webhook secret stored securely
- [ ] Payment flow tested end-to-end (live mode, ₹1 test)
- [ ] Refund flow tested
- [ ] Payment failure handling works
- [ ] Order status updates on payment success/failure
- [ ] Idempotency keys prevent duplicate charges

---

## 🚀 Performance

### Frontend
- [ ] Lighthouse score >90 (Performance, Accessibility, SEO)
- [ ] Core Web Vitals pass:
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] Images optimized (WebP/AVIF via next/image)
- [ ] JavaScript bundle size < 200KB (first load)
- [ ] Fonts preloaded
- [ ] Critical CSS inlined
- [ ] Lazy loading for below-fold images

### Backend
- [ ] API response time < 500ms (P95)
- [ ] Database queries < 100ms (P95)
- [ ] No N+1 query problems
- [ ] ISR configured for product/category pages
- [ ] Static pages pre-rendered at build time
- [ ] Error responses are fast (no hanging requests)

### Caching Strategy
- [ ] Static assets: `max-age=31536000, immutable`
- [ ] API responses: `no-store` (for authenticated)
- [ ] Product pages: ISR with 60s revalidation
- [ ] Category pages: ISR with 300s revalidation
- [ ] Homepage: ISR with 60s revalidation

---

## 📊 Monitoring & Alerting

### Application Insights
- [ ] Connection string configured in Vercel
- [ ] Server-side telemetry initializing
- [ ] Client-side telemetry loading
- [ ] Custom events tracked (OrderPlaced, ProductViewed, etc.)
- [ ] Error exceptions auto-captured

### Alerts Configured
- [ ] High error rate (>5% in 5 min) → Email notification
- [ ] Slow response time (>3s average) → Email notification
- [ ] Database connection failures → Email notification
- [ ] Budget alert at 80% ($80) and 100% ($100)

### Logging
- [ ] Log Analytics workspace receiving data
- [ ] Application logs structured (JSON format)
- [ ] No sensitive data in logs (passwords, tokens)
- [ ] Log retention set (30 days)

---

## 🔄 CI/CD Pipeline

### GitHub Actions
- [ ] Infrastructure pipeline (`infrastructure.yml`) working
- [ ] Backend pipeline (`backend.yml`) working
- [ ] Build succeeds on `main` branch
- [ ] Tests pass before deployment
- [ ] Environment variables available in CI
- [ ] Deployment to Vercel automated
- [ ] Database migrations run in pipeline

### Deployment Process
- [ ] `main` branch auto-deploys to production
- [ ] Preview deployments work for PRs
- [ ] Rollback process documented and tested
- [ ] Zero-downtime deployments (Vercel default)

---

## 🧪 Testing

### Pre-Launch Testing
- [ ] User registration flow (Entra ID + Google)
- [ ] Login/logout flow
- [ ] Product browsing and search
- [ ] Add to cart / remove from cart
- [ ] Checkout flow (with Razorpay test payment)
- [ ] Order confirmation email received
- [ ] Order tracking page works
- [ ] Wishlist add/remove
- [ ] Product customizer upload
- [ ] Admin panel access (role-gated)
- [ ] Mobile responsive on all pages
- [ ] 404 page displays correctly
- [ ] Error boundaries catch failures gracefully

### Load Testing (Optional for MVP)
- [ ] 100 concurrent users simulation
- [ ] No database connection exhaustion
- [ ] Response times within SLA

---

## 📋 Legal & Compliance

- [ ] Privacy Policy page live (`/privacy-policy`)
- [ ] Terms & Conditions page live (`/terms-conditions`)
- [ ] Refund/Return policy page live (`/refund-return-policy`)
- [ ] Cookie consent banner (if applicable)
- [ ] Contact information visible
- [ ] GST/tax compliance (Indian e-commerce)

---

## 🌍 SEO & Discoverability

- [ ] `robots.txt` configured correctly
- [ ] `sitemap.xml` generated dynamically
- [ ] Meta titles and descriptions on all pages
- [ ] Open Graph tags for social sharing
- [ ] Structured data (JSON-LD) for products
- [ ] Canonical URLs set
- [ ] 301 redirects for old/changed URLs
- [ ] Google Search Console verified
- [ ] Google Analytics (or equivalent) active

---

## 📱 Accessibility

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Keyboard navigation works
- [ ] Screen reader tested (basic check)
- [ ] Focus indicators visible
- [ ] Skip-to-content link present

---

## 🚨 Disaster Recovery

- [ ] Database backup verified (can restore)
- [ ] Blob storage backup strategy defined
- [ ] Key Vault soft-delete enabled (90 days)
- [ ] Runbook for common incidents documented
- [ ] On-call contact defined
- [ ] DNS failover plan (if Vercel down: maintenance page)

---

## ✅ Final Sign-Off

| Area | Owner | Status | Date |
|------|-------|--------|------|
| Infrastructure | DevOps | ⬜ Pending | |
| Security | Lead Dev | ⬜ Pending | |
| Performance | Frontend | ⬜ Pending | |
| Payment | Backend | ⬜ Pending | |
| Email | Backend | ⬜ Pending | |
| Monitoring | DevOps | ⬜ Pending | |
| Legal | Business | ⬜ Pending | |
| **LAUNCH APPROVED** | **All** | ⬜ | |
