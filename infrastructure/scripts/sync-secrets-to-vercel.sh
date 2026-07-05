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
sync_secret "razorpay-key-secret" "RAZORPAY_KEY_SECRET" "production"
sync_secret "razorpay-webhook-secret" "RAZORPAY_WEBHOOK_SECRET" "production"
sync_secret "nextauth-secret" "NEXTAUTH_SECRET" "production"
sync_secret "google-client-secret" "GOOGLE_CLIENT_SECRET" "production"

echo ""
echo "✅ All secrets synced to Vercel!"
echo ""
echo "Note: You may need to redeploy for changes to take effect:"
echo "  vercel --prod"
