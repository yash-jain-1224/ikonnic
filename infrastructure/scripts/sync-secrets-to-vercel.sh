#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Ikonnic - Sync Key Vault Secrets to Vercel
# Pulls secrets from Azure Key Vault and sets them in Vercel
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

KEYVAULT_NAME="ikonnic-kv"

echo "═══════════════════════════════════════════════════════"
echo "  Ikonnic - Sync Secrets to Vercel"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check prerequisites
if ! command -v az &> /dev/null; then
  echo "❌ Azure CLI not found. Install: brew install azure-cli"
  exit 1
fi

if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found. Install: npm i -g vercel"
  exit 1
fi

echo "► Pulling secrets from Azure Key Vault..."
echo ""

# Function to sync a secret
sync_secret() {
  local kv_name=$1
  local vercel_name=$2
  local env=${3:-"production"}
  
  local value=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "$kv_name" --query value -o tsv 2>/dev/null || echo "")
  
  if [ -z "$value" ]; then
    echo "  ⚠️  ${kv_name} not found in Key Vault, skipping..."
    return
  fi
  
  # Remove existing and add new
  echo "$value" | vercel env add "$vercel_name" "$env" --force 2>/dev/null || \
  echo "$value" | vercel env add "$vercel_name" "$env" 2>/dev/null || true
  
  echo "  ✅ ${vercel_name} synced (${env})"
}

# Sync all secrets
sync_secret "pg-connection-string" "DATABASE_URL" "production"
sync_secret "storage-connection-string" "AZURE_STORAGE_CONNECTION_STRING" "production"
sync_secret "azure-ad-client-secret" "AZURE_AD_CLIENT_SECRET" "production"
sync_secret "sendgrid-api-key" "SENDGRID_API_KEY" "production"
sync_secret "phonepe-merchant-id" "PHONEPE_MERCHANT_ID" "production"
sync_secret "phonepe-salt-key" "PHONEPE_SALT_KEY" "production"
sync_secret "nextauth-secret" "NEXTAUTH_SECRET" "production"
sync_secret "google-client-secret" "GOOGLE_CLIENT_SECRET" "production"
sync_secret "appinsights-connection-string" "APPLICATIONINSIGHTS_CONNECTION_STRING" "production"

echo ""
echo "► Setting non-secret Azure Storage config vars..."

# Extract account name from connection string and set supplementary env vars
STORAGE_CONN=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name "storage-connection-string" --query value -o tsv 2>/dev/null || echo "")
if [ -n "$STORAGE_CONN" ]; then
  # Parse account name and key from connection string (macOS-compatible)
  ACCOUNT_NAME=$(echo "$STORAGE_CONN" | sed -n 's/.*AccountName=\([^;]*\).*/\1/p')
  ACCOUNT_KEY=$(echo "$STORAGE_CONN" | sed -n 's/.*AccountKey=\([^;]*\).*/\1/p')
  [ -z "$ACCOUNT_NAME" ] && ACCOUNT_NAME="ikonnicstorage"

  echo "$ACCOUNT_NAME" | vercel env add "AZURE_STORAGE_ACCOUNT_NAME" "production" --force 2>/dev/null || true
  echo "  ✅ AZURE_STORAGE_ACCOUNT_NAME = ${ACCOUNT_NAME}"

  if [ -n "$ACCOUNT_KEY" ]; then
    echo "$ACCOUNT_KEY" | vercel env add "AZURE_STORAGE_ACCOUNT_KEY" "production" --force 2>/dev/null || true
    echo "  ✅ AZURE_STORAGE_ACCOUNT_KEY synced"
  fi

  echo "uploads" | vercel env add "AZURE_STORAGE_CONTAINER" "production" --force 2>/dev/null || true
  echo "  ✅ AZURE_STORAGE_CONTAINER = uploads"

  CDN_URL="https://${ACCOUNT_NAME}.blob.core.windows.net/uploads"
  echo "$CDN_URL" | vercel env add "CDN_URL" "production" --force 2>/dev/null || true
  echo "  ✅ CDN_URL = ${CDN_URL}"
else
  echo "  ⚠️  storage-connection-string not found in Key Vault, skipping storage config..."
fi

# PhonePe non-secret config
echo "" 
echo "► Setting PhonePe config vars..."
echo "1" | vercel env add "PHONEPE_SALT_INDEX" "production" --force 2>/dev/null || true
echo "https://api.phonepe.com/apis/hermes" | vercel env add "PHONEPE_BASE_URL" "production" --force 2>/dev/null || true
echo "https://backend-xi-one-34.vercel.app/api/v1/payments/webhook/phonepe" | vercel env add "PHONEPE_CALLBACK_URL" "production" --force 2>/dev/null || true
echo "https://www.ikonnic.com/checkout/verify" | vercel env add "PHONEPE_REDIRECT_URL" "production" --force 2>/dev/null || true
echo "  ✅ PhonePe config vars set"

echo ""
echo "✅ All secrets synced to Vercel!"
echo ""
echo "Note: You may need to redeploy for changes to take effect:"
echo "  vercel --prod"
