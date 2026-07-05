# Cost Analysis & Scaling Plan

## Overview
Ikonnic is designed for ~1,000 users at MVP with a budget target of **<$100/month**. This document covers current costs, scaling triggers, and upgrade paths.

---

## 1. Current Cost Breakdown (MVP - ~1,000 users)

| Service | SKU/Tier | Specs | Monthly Cost |
|---------|----------|-------|-------------|
| **Vercel** | Pro | Unlimited bandwidth, 100GB, serverless | $20.00 |
| **PostgreSQL Flexible** | B_Standard_B1ms | 1 vCore, 2GB RAM, 32GB storage | $12.93 |
| **Azure Blob Storage** | Standard_LRS | ~10GB stored, ~50K operations | $1.50 |
| **Azure Key Vault** | Standard | ~100 operations/month | $0.50 |
| **Application Insights** | Pay-per-use | ~1GB data/month | $2.30 |
| **Log Analytics** | Pay-per-use | ~0.5GB ingestion, 30d retention | $1.15 |
| **Microsoft Entra ID** | Free tier | Up to 50,000 objects | $0.00 |
| **SendGrid** | Free tier | 100 emails/day | $0.00 |
| **Domain (ikonnic.com)** | Annual | .in domain | ~$1.00/mo |
| | | **TOTAL** | **~$39.38/month** |

### Cost Assumptions
- 1,000 registered users, ~200 DAU
- ~50 orders/day average
- ~100 image uploads/day
- ~500MB new storage/month
- ~10,000 API calls/day

---

## 2. Scaling Triggers & Thresholds

| Metric | Current Capacity | Warning Threshold | Action Required |
|--------|-----------------|-------------------|-----------------|
| **Concurrent DB connections** | 50 (B1ms) | >35 connections | Upgrade to B2ms |
| **Database CPU** | 1 vCore | >70% sustained | Upgrade to B2ms |
| **Database storage** | 32GB | >25GB used | Expand storage |
| **Blob storage** | Unlimited (LRS) | >100GB | Consider CDN |
| **API response time** | <1s target | >2s P95 | Optimize queries/caching |
| **Vercel bandwidth** | 100GB/month | >80GB | Monitor usage |
| **SendGrid emails** | 100/day | >80/day sustained | Upgrade to Essentials |
| **Monthly active users** | ~1,000 | >2,500 | Review all services |
| **Orders/day** | ~50 | >200 | Add connection pooling |

---

## 3. Scaling Phases

### Phase 1: MVP (Current) — 0–1,000 users | ~$40/month

| Service | Configuration |
|---------|--------------|
| Compute | Vercel Pro (serverless) |
| Database | B_Standard_B1ms (1 vCore, 2GB) |
| Storage | Standard_LRS (local redundancy) |
| Email | SendGrid Free (100/day) |
| CDN | Vercel built-in |
| Cache | None (ISR only) |

---

### Phase 2: Growth — 1,000–5,000 users | ~$80–120/month

**Trigger**: Sustained >70% DB CPU or >35 connections

| Upgrade | From | To | Cost Delta |
|---------|------|-----|-----------|
| Database | B_Standard_B1ms | B_Standard_B2ms (2 vCore, 4GB) | +$13 |
| Database storage | 32GB | 64GB | +$4 |
| SendGrid | Free | Essentials (50K/month) | +$20 |
| Blob CDN | None | Azure CDN Standard | +$7 |
| Connection pooling | None | PgBouncer (built-in) | $0 |

**Actions**:
```bash
# Upgrade PostgreSQL to B2ms
az postgres flexible-server update \
  --resource-group Ikonnic-RG \
  --name ikonnic-pg-server \
  --sku-name Standard_B2ms

# Expand storage
az postgres flexible-server update \
  --resource-group Ikonnic-RG \
  --name ikonnic-pg-server \
  --storage-size 64

# Enable PgBouncer (built-in connection pooling)
az postgres flexible-server parameter set \
  --resource-group Ikonnic-RG \
  --server-name ikonnic-pg-server \
  --name pgbouncer.enabled --value true
```

---

### Phase 3: Scale — 5,000–20,000 users | ~$150–300/month

**Trigger**: >5,000 users, >500 orders/day, need HA

| Upgrade | From | To | Cost Delta |
|---------|------|-----|-----------|
| Database | B2ms (Burstable) | GP_Standard_D2ds_v4 (General Purpose) | +$80 |
| Database HA | None | Zone-redundant HA | +$80 |
| Storage | LRS | GRS (geo-redundant) | +$5 |
| Blob CDN | Standard | Premium (rules engine) | +$15 |
| Vercel | Pro | Enterprise (custom) | +$100+ |
| Email | Essentials | Pro (100K/month) | +$40 |

**Actions**:
```bash
# Upgrade to General Purpose
az postgres flexible-server update \
  --resource-group Ikonnic-RG \
  --name ikonnic-pg-server \
  --sku-name Standard_D2ds_v4 \
  --tier GeneralPurpose

# Enable HA
az postgres flexible-server update \
  --resource-group Ikonnic-RG \
  --name ikonnic-pg-server \
  --high-availability ZoneRedundant

# Enable geo-redundant storage
az storage account update \
  --resource-group Ikonnic-RG \
  --name ikonnicstorage \
  --sku Standard_GRS
```

---

### Phase 4: Enterprise — 20,000+ users | $500+/month

At this scale, consider:
- **Azure Container Apps** for API (replaces Vercel functions for heavy workloads)
- **Azure Redis Cache** for session store and caching
- **Azure Front Door** for global load balancing
- **Read replicas** for database
- **Dedicated Vercel Enterprise** plan
- **Multi-region deployment**

---

## 4. Cost Optimization Tips

### Immediate Savings
| Tip | Savings |
|-----|---------|
| Use Vercel ISR aggressively (reduce function invocations) | -10% compute |
| Set proper Cache-Control headers for static assets | -20% bandwidth |
| Use `next/image` for automatic WebP/AVIF conversion | -40% image bandwidth |
| Clean up old blobs with lifecycle policies | Variable |
| Use Azure Reserved Instances (1-year for PostgreSQL) | -30% DB cost |

### Reserved Instance Savings (If committing for 1 year)
| Service | Pay-as-you-go | 1-year Reserved | Savings |
|---------|--------------|-----------------|---------|
| PostgreSQL B1ms | $12.93/mo | ~$9.05/mo | 30% |
| PostgreSQL B2ms | $25.86/mo | ~$18.10/mo | 30% |

### Free Tier Maximization
- **Entra ID Free**: Up to 50,000 objects (users + groups)
- **SendGrid Free**: 100 emails/day (3,000/month)
- **Application Insights**: First 5GB/month free
- **Key Vault**: 10,000 operations/month free
- **Vercel Hobby** (if personal): Free tier available

---

## 5. Cost Monitoring

### Azure Cost Alerts
```bash
# Set up budget alert at $50/month
az consumption budget create \
  --budget-name "Ikonnic-Monthly-Budget" \
  --resource-group Ikonnic-RG \
  --amount 50 \
  --time-grain Monthly \
  --category Cost \
  --start-date "2024-01-01" \
  --end-date "2025-12-31"

# Alert at 80% and 100%
az consumption budget create \
  --budget-name "Ikonnic-Budget-Alert" \
  --resource-group Ikonnic-RG \
  --amount 100 \
  --time-grain Monthly \
  --category Cost \
  --notifications '{
    "80percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 80,
      "contactEmails": ["admin@ikonnic.com"]
    },
    "100percent": {
      "enabled": true,
      "operator": "GreaterThan",
      "threshold": 100,
      "contactEmails": ["admin@ikonnic.com"]
    }
  }'
```

### Monthly Cost Review Checklist
- [ ] Review Azure Cost Management dashboard
- [ ] Check Vercel usage (bandwidth, function invocations)
- [ ] Verify no orphaned resources
- [ ] Review storage growth rate
- [ ] Check database connection pool utilization
- [ ] Validate CDN cache hit ratio
- [ ] Review SendGrid email usage

---

## 6. Avoided Costly Services (and Why)

| Service | Monthly Cost | Why Avoided | Alternative |
|---------|-------------|-------------|-------------|
| AKS (Kubernetes) | $70+ | Overkill for MVP, complex ops | Vercel serverless |
| Azure Redis Cache | $15+ | Not needed at <5K users | Vercel ISR + React cache |
| Azure App Gateway | $25+ | Not needed with Vercel edge | Vercel middleware |
| Azure Front Door | $35+ | Overkill for single-region | Vercel CDN |
| Azure Functions Premium | $40+ | Cold starts OK for MVP | Vercel serverless |
| Azure SQL Database | $15+ | PostgreSQL is cheaper/sufficient | PostgreSQL Flexible |
| Azure Cosmos DB | $25+ | Overkill for relational data | PostgreSQL JSONB |

---

## 7. ROI Projections

### Break-even Analysis
| Metric | Value |
|--------|-------|
| Monthly infrastructure cost | ~$40 |
| Average order value | ₹800 (~$10) |
| Gross margin (assumed) | 40% |
| Orders needed to break even | 10 orders/month |
| At 50 orders/day | ROI: ~500x monthly |

### Cost per User
| Phase | Users | Monthly Cost | Cost/User/Month |
|-------|-------|-------------|----------------|
| MVP | 1,000 | $40 | $0.04 |
| Growth | 5,000 | $120 | $0.024 |
| Scale | 20,000 | $300 | $0.015 |
| Enterprise | 50,000 | $500 | $0.01 |

Cost per user **decreases** as you scale (economies of scale with serverless).
