# Ikonnic Infrastructure — Master Documentation Index

## Quick Start

1. **Provision Azure resources**: Run `scripts/provision-azure.sh`
2. **Apply database schema**: Run `scripts/migrate-database.sh`
3. **Configure Entra ID**: Follow `docs/01-entra-id-setup.md`
4. **Set Vercel env vars**: Follow `docs/03-vercel-deployment.md`
5. **Deploy**: Push to `main` branch

---

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [Entra ID Setup](docs/01-entra-id-setup.md) | Authentication, social login, roles, groups, permissions |
| 02 | [Azure Services Guide](docs/02-azure-services-guide.md) | PostgreSQL, Blob Storage, Key Vault, SendGrid, Monitoring |
| 03 | [Vercel Deployment](docs/03-vercel-deployment.md) | Vercel config, deployment workflow, performance, monitoring |
| 04 | [Environment Variables](docs/04-environment-variables.md) | Complete env var matrix, .env templates, validation |
| 05 | [Architecture Diagram](docs/05-architecture-diagram.md) | System architecture, data flows, component diagram |
| 06 | [Cost Analysis & Scaling](docs/06-cost-analysis-scaling.md) | Cost breakdown, scaling triggers, upgrade paths |
| 07 | [Production Readiness](docs/07-production-readiness-checklist.md) | Pre-launch checklist (security, performance, legal) |

---

## Infrastructure as Code

| Tool | File | Purpose |
|------|------|---------|
| Azure CLI | `scripts/provision-azure.sh` | One-click Azure provisioning |
| Bicep | `bicep/main.bicep` | Declarative Azure resources |
| Terraform | `terraform/main.tf` | Full IaC with state management |

---

## Operational Scripts

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `scripts/provision-azure.sh` | Create all Azure resources | Initial setup |
| `scripts/migrate-database.sh` | Apply database schema migrations | After provisioning & on schema changes |
| `scripts/rotate-secrets.sh` | Rotate database password | Every 90 days |
| `scripts/sync-secrets-to-vercel.sh` | Sync Key Vault → Vercel env vars | After secret rotation |

---

## CI/CD Pipelines

| Pipeline | File | Trigger |
|----------|------|---------|
| Infrastructure | `.github/workflows/infrastructure.yml` | Changes to `/infrastructure/terraform/**` |
| Backend Deploy | `.github/workflows/backend.yml` | Push to `main` |

---

## Architecture Summary

```
Users → Vercel Edge (Next.js) → Azure PostgreSQL (data)
                              → Azure Blob Storage (files)
                              → Microsoft Entra ID (auth)
                              → SendGrid (email)
                              → Razorpay (payments)
                              → Application Insights (monitoring)
```

**Target**: ~1,000 users | **Budget**: <$100/month | **Actual**: ~$40/month

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Vercel | Built-in CDN, serverless, zero-ops |
| Database | PostgreSQL Flexible | Cheapest managed PG, SSL, backups |
| Auth | Entra ID + NextAuth | Enterprise-ready, social login support |
| Storage | Azure Blob + SAS | Direct upload, no function bandwidth cost |
| Email | SendGrid Free | 100/day free, reliable delivery |
| IaC | Terraform (primary) | State management, plan/apply workflow |
| Region | Central India | Closest to target users |
| **Avoided** | AKS, Redis, App GW, Front Door | Overkill and expensive for MVP |
