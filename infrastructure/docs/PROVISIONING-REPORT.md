# Ikonnic Azure Infrastructure - Provisioning Report
## Date: 5 July 2026

---

## ✅ ALL RESOURCES PROVISIONED SUCCESSFULLY

### Resource Group: `Ikonnic-RG` (Central India)

---

## Resources Created

| # | Resource | Type | Name | SKU/Tier |
|---|----------|------|------|----------|
| 1 | Log Analytics Workspace | `Microsoft.OperationalInsights/workspaces` | `ikonnic-logs` | PerGB2018 |
| 2 | Application Insights | `Microsoft.Insights/components` | `ikonnic-insights` | Pay-per-use |
| 3 | PostgreSQL Flexible Server | `Microsoft.DBforPostgreSQL/flexibleServers` | `ikonnic-pg-server` | B_Standard_B1ms (Burstable) |
| 4 | Storage Account | `Microsoft.Storage/storageAccounts` | `ikonnicstorage` | Standard_LRS |
| 5 | Key Vault | `Microsoft.KeyVault/vaults` | `ikonnic-kv` | Standard |

---

## Entra ID Resources

| Resource | Details |
|----------|---------|
| App Registration | `Ikonnic E-Commerce` (App ID: `045807c6-f112-4362-b951-ff014feb59f2`) |
| Security Group | `Ikonnic-Admins` |
| Security Group | `Ikonnic-Customers` |
| Security Group | `Ikonnic-Vendors` |
| Security Group | `Ikonnic-Support` |
| Service Principal | `ikonnic-vercel-sp` (for CI/CD access) |

---

## Connection Details

| Service | Endpoint |
|---------|----------|
| PostgreSQL | `ikonnic-pg-server.postgres.database.azure.com:5432` |
| Storage Blob | `https://ikonnicstorage.blob.core.windows.net/` |
| Key Vault | `https://ikonnic-kv.vault.azure.net/` |
| App Insights | Instrumentation Key: `b1330664-23d7-4375-84b4-0322d9381f0f` |

---

## Storage Containers

| Container | Access Level | Purpose |
|-----------|-------------|---------|
| `products` | Private | Product images |
| `user-uploads` | Private | Customer uploads (customizer) |
| `assets` | Private | Static brand assets |
| `invoices` | Private | Generated invoice PDFs |

---

## Key Vault Secrets Stored

| Secret Name | Content |
|-------------|---------|
| `pg-admin-password` | PostgreSQL admin password |
| `pg-connection-string` | Full DATABASE_URL for app |
| `storage-connection-string` | Azure Storage connection string |
| `azure-ad-client-id` | Entra ID App Client ID |
| `azure-ad-tenant-id` | Azure Tenant ID |
| `nextauth-secret` | NextAuth.js session encryption key |
| `appinsights-connection-string` | Application Insights full connection string |

---

## API Permissions (Microsoft Graph)

| Permission | ID | Type |
|-----------|-----|------|
| User.Read | `e1fe6dd8-ba31-4d61-89e7-88639da4683d` | Delegated |
| email | `64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0` | Delegated |
| profile | `14dad69e-099b-42c9-810b-d002981feec1` | Delegated |
| openid | `37f7f235-527c-4136-accd-4a02d197296e` | Delegated |
| offline_access | `7427e0e9-2fba-42fe-b0c0-848c9e6a8182` | Delegated |

---

## Configuration Applied

- [x] PostgreSQL SSL enforcement: ON
- [x] Storage HTTPS-only: ON
- [x] Storage TLS 1.2 minimum: ON
- [x] Storage CORS configured (localhost + production + vercel)
- [x] Key Vault RBAC authorization: ON
- [x] Key Vault Secrets Officer role assigned to current user
- [x] PostgreSQL public access enabled (for Vercel serverless)
- [x] Database `ikonnic_db` created (UTF8)
- [x] App Registration tokens: ID + Access enabled

---

## Estimated Monthly Cost

| Service | Monthly Cost |
|---------|-------------|
| Vercel Pro | $20.00 |
| PostgreSQL B1ms | ~$12.93 |
| Storage (Standard LRS) | ~$1.50 |
| Key Vault | ~$0.50 |
| Application Insights | ~$2.30 |
| Log Analytics | ~$1.15 |
| Entra ID (Free) | $0.00 |
| **TOTAL** | **~$38.38/month** |

---

## Next Steps

1. **Store remaining secrets**: Razorpay keys, Google OAuth, SendGrid API key
2. **Set Vercel environment variables** (use `infrastructure/scripts/sync-secrets-to-vercel.sh`)
3. **Run database migrations** (`infrastructure/scripts/migrate-database.sh`)
4. **Configure Google OAuth** (see `infrastructure/docs/01-entra-id-setup.md`)
5. **Configure SendGrid** (see `infrastructure/docs/02-azure-services-guide.md`)
6. **Deploy to Vercel** and verify all connections

---

## Important Credentials (stored in Key Vault)

To retrieve any secret:
```bash
az keyvault secret show --vault-name ikonnic-kv --name <secret-name> --query value -o tsv
```

**⚠️ SECURITY NOTE**: The service principal credentials for `ikonnic-vercel-sp` were displayed during creation. Store them securely in GitHub Actions secrets:
- `AZURE_CLIENT_ID`: `b90dc93f-f33a-4101-85aa-33c111a003ca`
- `AZURE_TENANT_ID`: `02b70906-c568-452f-85fd-1fbc1f66f2f6`
- `AZURE_CLIENT_SECRET`: (from creation output)
