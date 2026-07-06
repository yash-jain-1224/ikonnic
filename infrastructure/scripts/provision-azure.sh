#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Ikonnic E-Commerce Platform - Azure Infrastructure Provisioning
# Target: ~1,000 users, MVP stage, <$100/month
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────
RESOURCE_GROUP="Ikonnic-RG"
LOCATION="centralindia"
APP_NAME="ikonnic"
DOMAIN="ikonnic.com"

# Naming Convention
PG_SERVER_NAME="${APP_NAME}-pg-server"
STORAGE_ACCOUNT_NAME="${APP_NAME}storage"
KEYVAULT_NAME="${APP_NAME}-kv"
APP_INSIGHTS_NAME="${APP_NAME}-insights"
LOG_WORKSPACE_NAME="${APP_NAME}-logs"

# Database
PG_ADMIN_USER="ikonnic_admin"
PG_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | head -c 24)
PG_DB_NAME="ikonnic_db"

echo "═══════════════════════════════════════════════════════"
echo "  Ikonnic Azure Infrastructure Provisioning"
echo "  Resource Group: ${RESOURCE_GROUP}"
echo "  Location: ${LOCATION}"
echo "═══════════════════════════════════════════════════════"

# ─── 1. Verify Resource Group ──────────────────────────────────────
echo ""
echo "► Step 1: Verifying Resource Group..."
az group show --name $RESOURCE_GROUP --output table || {
  echo "ERROR: Resource Group '${RESOURCE_GROUP}' not found!"
  echo "Please create it first: az group create --name ${RESOURCE_GROUP} --location ${LOCATION}"
  exit 1
}

# ─── 2. Log Analytics Workspace (Required for App Insights) ───────
echo ""
echo "► Step 2: Creating Log Analytics Workspace..."
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_WORKSPACE_NAME \
  --location $LOCATION \
  --sku PerGB2018 \
  --retention-in-days 30 \
  --output table

LOG_WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LOG_WORKSPACE_NAME \
  --query id -o tsv)

# ─── 3. Application Insights ──────────────────────────────────────
echo ""
echo "► Step 3: Creating Application Insights..."
az monitor app-insights component create \
  --app $APP_INSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --workspace $LOG_WORKSPACE_ID \
  --kind web \
  --application-type web \
  --output table

APP_INSIGHTS_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

APP_INSIGHTS_CONN=$(az monitor app-insights component show \
  --app $APP_INSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

echo "  Instrumentation Key: ${APP_INSIGHTS_KEY}"

# ─── 4. PostgreSQL Flexible Server (Burstable B1ms) ───────────────
echo ""
echo "► Step 4: Creating PostgreSQL Flexible Server (B1ms)..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER_NAME \
  --location $LOCATION \
  --admin-user $PG_ADMIN_USER \
  --admin-password "$PG_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --backup-retention 7 \
  --geo-redundant-backup Disabled \
  --high-availability Disabled \
  --public-access 0.0.0.0 \
  --yes \
  --output table

# Create database
echo "  Creating database '${PG_DB_NAME}'..."
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $PG_SERVER_NAME \
  --database-name $PG_DB_NAME \
  --output table

# Enable pgcrypto extension
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $PG_SERVER_NAME \
  --name azure.extensions \
  --value "PGCRYPTO,UUID-OSSP" \
  --output table

# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER_NAME \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output table

# SSL enforcement
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $PG_SERVER_NAME \
  --name require_secure_transport \
  --value on \
  --output table

PG_HOST="${PG_SERVER_NAME}.postgres.database.azure.com"
DATABASE_URL="postgresql://${PG_ADMIN_USER}:${PG_ADMIN_PASSWORD}@${PG_HOST}:5432/${PG_DB_NAME}?sslmode=require"
echo "  Host: ${PG_HOST}"

# ─── 5. Storage Account ───────────────────────────────────────────
echo ""
echo "► Step 5: Creating Storage Account..."
az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true \
  --output table

STORAGE_CONN_STRING=$(az storage account show-connection-string \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT_NAME \
  --query connectionString -o tsv)

STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT_NAME \
  --query "[0].value" -o tsv)

# Create containers
echo "  Creating storage containers..."
for CONTAINER in "product-images" "user-avatars" "invoices" "order-documents" "customisation-uploads"; do
  az storage container create \
    --name $CONTAINER \
    --account-name $STORAGE_ACCOUNT_NAME \
    --account-key "$STORAGE_KEY" \
    --public-access off \
    --output none
  echo "    ✓ ${CONTAINER}"
done

# Enable CORS for frontend
az storage cors add \
  --account-name $STORAGE_ACCOUNT_NAME \
  --account-key "$STORAGE_KEY" \
  --services b \
  --methods GET PUT POST DELETE OPTIONS HEAD \
  --origins "http://localhost:3000" "https://${DOMAIN}" "https://*.vercel.app" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600

echo "  CORS configured for Blob Storage"

# ─── 6. Azure Key Vault ───────────────────────────────────────────
echo ""
echo "► Step 6: Creating Key Vault..."
az keyvault create \
  --resource-group $RESOURCE_GROUP \
  --name $KEYVAULT_NAME \
  --location $LOCATION \
  --sku standard \
  --enable-rbac-authorization true \
  --output table

# Store secrets
echo "  Storing secrets..."
az keyvault secret set --vault-name $KEYVAULT_NAME --name "pg-admin-user" --value "$PG_ADMIN_USER" --output none
az keyvault secret set --vault-name $KEYVAULT_NAME --name "pg-admin-password" --value "$PG_ADMIN_PASSWORD" --output none
az keyvault secret set --vault-name $KEYVAULT_NAME --name "database-url" --value "$DATABASE_URL" --output none
az keyvault secret set --vault-name $KEYVAULT_NAME --name "storage-connection-string" --value "$STORAGE_CONN_STRING" --output none
az keyvault secret set --vault-name $KEYVAULT_NAME --name "appinsights-connection-string" --value "$APP_INSIGHTS_CONN" --output none
echo "  ✓ Core secrets stored"

# PhonePe secrets (set manually after merchant onboarding)
echo "  ℹ️  PhonePe secrets must be added manually after merchant approval:"
echo "    az keyvault secret set --vault-name $KEYVAULT_NAME --name \"phonepe-merchant-id\" --value \"<YOUR_MERCHANT_ID>\""
echo "    az keyvault secret set --vault-name $KEYVAULT_NAME --name \"phonepe-salt-key\" --value \"<YOUR_SALT_KEY>\""

# ─── 7. Microsoft Entra ID - App Registration ─────────────────────
echo ""
echo "► Step 7: Creating Entra ID App Registration..."
APP_REG_RESULT=$(az ad app create \
  --display-name "Ikonnic Ecommerce" \
  --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
  --web-redirect-uris \
    "http://localhost:3000/auth/callback" \
    "https://${DOMAIN}/auth/callback" \
    "https://ikonnic.vercel.app/auth/callback" \
  --enable-id-token-issuance true \
  --enable-access-token-issuance true \
  --required-resource-accesses '[
    {
      "resourceAppId": "00000003-0000-0000-c000-000000000000",
      "resourceAccess": [
        { "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d", "type": "Scope" },
        { "id": "14dad69e-099b-42c9-810b-d002981feec1", "type": "Scope" },
        { "id": "37f7f235-527c-4136-accd-4a02d197296e", "type": "Scope" },
        { "id": "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0", "type": "Scope" },
        { "id": "7427e0e9-2fba-42fe-b0c0-848c9e6a8182", "type": "Scope" }
      ]
    }
  ]' \
  --output json)

CLIENT_ID=$(echo $APP_REG_RESULT | python3 -c "import sys,json; print(json.load(sys.stdin)['appId'])")
OBJECT_ID=$(echo $APP_REG_RESULT | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "  Client ID: ${CLIENT_ID}"
echo "  Tenant ID: ${TENANT_ID}"

# Create client secret
echo "  Creating client secret..."
CLIENT_SECRET_RESULT=$(az ad app credential reset \
  --id $OBJECT_ID \
  --display-name "Ikonnic-Backend-Secret" \
  --years 2 \
  --output json)

CLIENT_SECRET=$(echo $CLIENT_SECRET_RESULT | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")

# Store Entra secrets in Key Vault
az keyvault secret set --vault-name $KEYVAULT_NAME --name "entra-client-id" --value "$CLIENT_ID" --output none
az keyvault secret set --vault-name $KEYVAULT_NAME --name "entra-client-secret" --value "$CLIENT_SECRET" --output none
az keyvault secret set --vault-name $KEYVAULT_NAME --name "entra-tenant-id" --value "$TENANT_ID" --output none
echo "  ✓ Entra ID secrets stored in Key Vault"

# Create Service Principal
echo "  Creating Service Principal..."
az ad sp create --id $CLIENT_ID --output none 2>/dev/null || true

# ─── 8. Define App Roles ──────────────────────────────────────────
echo ""
echo "► Step 8: Defining Application Roles..."
az ad app update --id $OBJECT_ID --app-roles '[
  {
    "allowedMemberTypes": ["User"],
    "description": "Super Administrators with full access",
    "displayName": "SuperAdmin",
    "isEnabled": true,
    "value": "SuperAdmin",
    "id": "1b4f816e-5eaf-48b9-8613-7923830595ad"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Administrators with management access",
    "displayName": "Admin",
    "isEnabled": true,
    "value": "Admin",
    "id": "2b4f816e-5eaf-48b9-8613-7923830595ad"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Standard customers",
    "displayName": "Customer",
    "isEnabled": true,
    "value": "Customer",
    "id": "3b4f816e-5eaf-48b9-8613-7923830595ad"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Vendor partners",
    "displayName": "Vendor",
    "isEnabled": true,
    "value": "Vendor",
    "id": "4b4f816e-5eaf-48b9-8613-7923830595ad"
  }
]'
echo "  ✓ App Roles: SuperAdmin, Admin, Customer, Vendor"

# ─── 9. Create Entra ID Groups ────────────────────────────────────
echo ""
echo "► Step 9: Creating Entra ID Security Groups..."
for GROUP in "Ecommerce-SuperAdmins" "Ecommerce-Admins" "Ecommerce-Customers" "Ecommerce-Vendors"; do
  az ad group create \
    --display-name $GROUP \
    --mail-nickname $GROUP \
    --output none 2>/dev/null || echo "  Group ${GROUP} may already exist"
  echo "  ✓ ${GROUP}"
done

# ─── 10. Output Summary ───────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ INFRASTRUCTURE PROVISIONED SUCCESSFULLY"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "─── Connection Details ────────────────────────────────"
echo ""
echo "PostgreSQL:"
echo "  Host:     ${PG_HOST}"
echo "  Database: ${PG_DB_NAME}"
echo "  User:     ${PG_ADMIN_USER}"
echo "  Password: ${PG_ADMIN_PASSWORD}"
echo "  URL:      ${DATABASE_URL}"
echo ""
echo "Storage:"
echo "  Account:  ${STORAGE_ACCOUNT_NAME}"
echo ""
echo "Key Vault:"
echo "  Name:     ${KEYVAULT_NAME}"
echo ""
echo "Entra ID:"
echo "  Client ID:  ${CLIENT_ID}"
echo "  Tenant ID:  ${TENANT_ID}"
echo "  Secret:     ${CLIENT_SECRET}"
echo ""
echo "Application Insights:"
echo "  Key:  ${APP_INSIGHTS_KEY}"
echo ""
echo "─── Environment Variables for Vercel ──────────────────"
echo ""
echo "# Frontend (.env.local)"
echo "NEXT_PUBLIC_CLIENT_ID=${CLIENT_ID}"
echo "NEXT_PUBLIC_TENANT_ID=${TENANT_ID}"
echo "NEXT_PUBLIC_API_URL=https://api.${DOMAIN}"
echo ""
echo "# Backend"
echo "DATABASE_URL=${DATABASE_URL}"
echo "AZURE_STORAGE_CONNECTION_STRING=${STORAGE_CONN_STRING}"
echo "ENTRA_CLIENT_ID=${CLIENT_ID}"
echo "ENTRA_CLIENT_SECRET=${CLIENT_SECRET}"
echo "TENANT_ID=${TENANT_ID}"
echo "APPLICATIONINSIGHTS_CONNECTION_STRING=${APP_INSIGHTS_CONN}"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ⚠️  SAVE THESE CREDENTIALS SECURELY!"
echo "  They are stored in Key Vault: ${KEYVAULT_NAME}"
echo "═══════════════════════════════════════════════════════"
