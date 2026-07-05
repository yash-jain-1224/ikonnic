#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Ikonnic - Database Migration Script
# Run this script to apply schema migrations to Azure PostgreSQL
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

# Configuration
KEYVAULT_NAME="ikonnic-kv"
DB_CONNECTION=$(az keyvault secret show --vault-name $KEYVAULT_NAME --name pg-connection-string --query value -o tsv 2>/dev/null || echo "")

if [ -z "$DB_CONNECTION" ]; then
  echo "⚠️  Could not fetch connection string from Key Vault."
  echo "   Using DATABASE_URL from environment..."
  DB_CONNECTION="${DATABASE_URL:-}"
fi

if [ -z "$DB_CONNECTION" ]; then
  echo "❌ No database connection string available."
  echo "   Set DATABASE_URL or ensure Azure CLI is logged in."
  exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo "  Ikonnic Database Migration"
echo "═══════════════════════════════════════════════════════"
echo ""

# Apply migrations
echo "► Applying schema migrations..."
psql "$DB_CONNECTION" << 'EOF'

-- ─── Extensions ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Schemas ──────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS auth;

-- ─── Migration Tracking ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Migration: 001_initial_schema ────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.migrations WHERE name = '001_initial_schema') THEN
    
    -- Users table
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      avatar_url TEXT,
      phone VARCHAR(20),
      provider VARCHAR(50) NOT NULL DEFAULT 'email',
      provider_id VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'customer',
      email_verified BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS app.products (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      slug VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      short_description VARCHAR(500),
      price DECIMAL(10,2) NOT NULL CHECK (price > 0),
      compare_price DECIMAL(10,2),
      cost_price DECIMAL(10,2),
      category VARCHAR(100) NOT NULL,
      subcategory VARCHAR(100),
      images TEXT[] DEFAULT '{}',
      thumbnail_url TEXT,
      variants JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      is_featured BOOLEAN DEFAULT FALSE,
      stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
      low_stock_threshold INTEGER DEFAULT 5,
      weight_grams INTEGER,
      sku VARCHAR(100) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Addresses table
    CREATE TABLE IF NOT EXISTS app.addresses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      label VARCHAR(50) DEFAULT 'home',
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address_line1 VARCHAR(255) NOT NULL,
      address_line2 VARCHAR(255),
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      postal_code VARCHAR(10) NOT NULL,
      country VARCHAR(50) DEFAULT 'India',
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS app.orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id),
      order_number VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
      items JSONB NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0,
      shipping_cost DECIMAL(10,2) DEFAULT 0,
      tax DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      shipping_address JSONB NOT NULL,
      billing_address JSONB,
      payment_method VARCHAR(50),
      payment_id VARCHAR(255),
      payment_status VARCHAR(50) DEFAULT 'pending',
      tracking_number VARCHAR(255),
      tracking_url TEXT,
      notes TEXT,
      cancelled_reason TEXT,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Cart table
    CREATE TABLE IF NOT EXISTS app.carts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      session_id VARCHAR(255),
      items JSONB NOT NULL DEFAULT '[]',
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Wishlist table
    CREATE TABLE IF NOT EXISTS app.wishlists (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );

    -- Reviews table
    CREATE TABLE IF NOT EXISTS app.reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
      order_id UUID REFERENCES app.orders(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title VARCHAR(255),
      body TEXT,
      images TEXT[] DEFAULT '{}',
      is_verified BOOLEAN DEFAULT FALSE,
      is_approved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );

    -- Coupons table
    CREATE TABLE IF NOT EXISTS app.coupons (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
      discount_value DECIMAL(10,2) NOT NULL,
      min_order_amount DECIMAL(10,2) DEFAULT 0,
      max_discount DECIMAL(10,2),
      usage_limit INTEGER,
      used_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      starts_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_users_email ON auth.users(email);
    CREATE INDEX idx_users_provider ON auth.users(provider, provider_id);
    CREATE INDEX idx_products_category ON app.products(category);
    CREATE INDEX idx_products_slug ON app.products(slug);
    CREATE INDEX idx_products_active ON app.products(is_active) WHERE is_active = TRUE;
    CREATE INDEX idx_products_featured ON app.products(is_featured) WHERE is_featured = TRUE;
    CREATE INDEX idx_products_sku ON app.products(sku);
    CREATE INDEX idx_orders_user ON app.orders(user_id);
    CREATE INDEX idx_orders_status ON app.orders(status);
    CREATE INDEX idx_orders_number ON app.orders(order_number);
    CREATE INDEX idx_orders_created ON app.orders(created_at DESC);
    CREATE INDEX idx_carts_user ON app.carts(user_id);
    CREATE INDEX idx_carts_session ON app.carts(session_id);
    CREATE INDEX idx_carts_expires ON app.carts(expires_at);
    CREATE INDEX idx_wishlists_user ON app.wishlists(user_id);
    CREATE INDEX idx_reviews_product ON app.reviews(product_id);
    CREATE INDEX idx_reviews_approved ON app.reviews(is_approved) WHERE is_approved = TRUE;
    CREATE INDEX idx_addresses_user ON app.addresses(user_id);
    CREATE INDEX idx_coupons_code ON app.coupons(code);

    -- Updated_at trigger function
    CREATE OR REPLACE FUNCTION app.update_updated_at()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;

    -- Apply triggers
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
    CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON app.products
      FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
    CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON app.orders
      FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();
    CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON app.carts
      FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

    -- Record migration
    INSERT INTO app.migrations (name) VALUES ('001_initial_schema');
    RAISE NOTICE '✅ Migration 001_initial_schema applied';
    
  ELSE
    RAISE NOTICE '⏭️  Migration 001_initial_schema already applied';
  END IF;
END $$;

-- ─── Migration: 002_order_number_sequence ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.migrations WHERE name = '002_order_number_sequence') THEN
    
    CREATE SEQUENCE IF NOT EXISTS app.order_number_seq START 1000;
    
    CREATE OR REPLACE FUNCTION app.generate_order_number()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.order_number = 'IKN-' || LPAD(nextval('app.order_number_seq')::text, 6, '0');
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_orders_number BEFORE INSERT ON app.orders
      FOR EACH ROW
      WHEN (NEW.order_number IS NULL)
      EXECUTE FUNCTION app.generate_order_number();

    INSERT INTO app.migrations (name) VALUES ('002_order_number_sequence');
    RAISE NOTICE '✅ Migration 002_order_number_sequence applied';
    
  ELSE
    RAISE NOTICE '⏭️  Migration 002_order_number_sequence already applied';
  END IF;
END $$;

-- ─── Summary ──────────────────────────────────────────────────────
SELECT '═══ Applied Migrations ═══' AS status;
SELECT name, applied_at FROM app.migrations ORDER BY id;

EOF

echo ""
echo "✅ All migrations applied successfully!"
echo ""
echo "Database: ikonnic_db"
echo "Schemas: auth, app"
echo "Tables: users, products, orders, carts, wishlists, reviews, addresses, coupons"
