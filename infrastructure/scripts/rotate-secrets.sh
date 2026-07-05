#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Ikonnic - Secret Rotation Script
# Rotates PostgreSQL password and syncs to Key Vault
# Run quarterly or as needed
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

RESOURCE_GROUP="Ikonnic-RG"
KEYVAULT_NAME="ikonnic-kv"
PG_SERVER_NAME="ikonnic-pg-server"
PG_DB_NAME="ikonnic_db"
PG_USER="ikonnic_admin"

echo "═══════════════════════════════════════════════════════"
echo "  Ikonnic Secret Rotation"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "⚠️  WARNING: This will rotate the database password!"
echo "   After rotation, you MUST update Vercel env vars."
echo ""
read -p "Continue? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "► Generating new password..."
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)

echo "► Updating PostgreSQL server password..."
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER_NAME \
  --admin-password "$NEW_PASSWORD" \
  --output none

echo "► Updating Key Vault secrets..."
# Update password
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name pg-admin-password \
  --value "$NEW_PASSWORD" \
  --output none

# Update connection string
CONNECTION_STRING="postgresql://${PG_USER}:${NEW_PASSWORD}@${PG_SERVER_NAME}.postgres.database.azure.com:5432/${PG_DB_NAME}?sslmode=require"
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name pg-connection-string \
  --value "$CONNECTION_STRING" \
  --output none

echo ""
echo "✅ Secrets rotated successfully!"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  IMPORTANT: Update Vercel environment variables NOW!        ║"
echo "║                                                             ║"
echo "║  1. Go to Vercel Dashboard → Project → Settings → Env Vars ║"
echo "║  2. Update DATABASE_URL with the new connection string      ║"
echo "║  3. Redeploy the application                                ║"
echo "║                                                             ║"
echo "║  Or run:                                                    ║"
echo "║  vercel env rm DATABASE_URL production                      ║"
echo "║  echo '$CONNECTION_STRING' | vercel env add DATABASE_URL    ║"
echo "║  vercel --prod                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "New connection string (also stored in Key Vault):"
echo "$CONNECTION_STRING"
