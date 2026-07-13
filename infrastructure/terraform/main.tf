# ─────────────────────────────────────────────────────────────────────
# Ikonnic E-Commerce Platform - Terraform Infrastructure
# Target: ~1,000 users, MVP stage, <$100/month
# ─────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
  }

  backend "azurerm" {
    resource_group_name  = "Ikonnic-RG"
    storage_account_name = "ikonnictfstate"
    container_name       = "tfstate"
    key                  = "ikonnic.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

provider "azuread" {}

# ─── Data Sources ──────────────────────────────────────────────────────
data "azurerm_resource_group" "main" {
  name = "Ikonnic-RG"
}

data "azurerm_client_config" "current" {}
data "azuread_client_config" "current" {}

# ─── Variables ─────────────────────────────────────────────────────────
variable "app_name" {
  default = "ikonnic"
}

variable "location" {
  default = "centralindia"
}

variable "pg_admin_user" {
  default   = "ikonnic_admin"
  sensitive = true
}

variable "pg_admin_password" {
  type      = string
  sensitive = true
}

variable "pg_database_name" {
  default = "ikonnic_db"
}

variable "frontend_domain" {
  default = "ikonnic.com"
}

# ─── Log Analytics Workspace ──────────────────────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.app_name}-logs"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# ─── Application Insights ─────────────────────────────────────────────
resource "azurerm_application_insights" "main" {
  name                = "${var.app_name}-insights"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
}

# ─── PostgreSQL Flexible Server (B1ms - Cheapest Production Tier) ─────
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.app_name}-pg-server"
  resource_group_name    = data.azurerm_resource_group.main.name
  location               = var.location
  version                = "16"
  administrator_login    = var.pg_admin_user
  administrator_password = var.pg_admin_password
  zone                   = "1"

  storage_mb            = 32768 # 32 GB
  sku_name              = "B_Standard_B1ms"
  backup_retention_days = 7

  geo_redundant_backup_enabled = false

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = var.pg_database_name
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow Azure Services
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Allow all IPs (for Vercel serverless - restrict in production)
resource "azurerm_postgresql_flexible_server_firewall_rule" "vercel" {
  name             = "AllowVercel"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}

# ─── Storage Account ──────────────────────────────────────────────────
resource "azurerm_storage_account" "main" {
  name                     = "${var.app_name}storage"
  resource_group_name      = data.azurerm_resource_group.main.name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = false

  blob_properties {
    cors_rule {
      allowed_origins    = ["http://localhost:3000", "https://${var.frontend_domain}", "https://*.vercel.app"]
      allowed_methods    = ["GET", "PUT", "POST", "DELETE", "OPTIONS", "HEAD"]
      allowed_headers    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
}

resource "azurerm_storage_management_policy" "customiser_pending_cleanup" {
  storage_account_id = azurerm_storage_account.main.id

  rule {
    name    = "delete-abandoned-customiser-uploads"
    enabled = true

    filters {
      blob_types = ["blockBlob"]
      prefix_match = [
        "customisation-uploads/pending-customisations/",
        "uploads/pending-customisations/",
      ]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 1
      }
    }
  }
}

# Storage Containers
resource "azurerm_storage_container" "product_images" {
  name                  = "product-images"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "user_avatars" {
  name                  = "user-avatars"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "invoices" {
  name                  = "invoices"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "order_documents" {
  name                  = "order-documents"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "customisation_uploads" {
  name                  = "customisation-uploads"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# ─── Key Vault ─────────────────────────────────────────────────────────
resource "azurerm_key_vault" "main" {
  name                       = "${var.app_name}-kv"
  location                   = var.location
  resource_group_name        = data.azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  enable_rbac_authorization  = true
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
}

# Secrets
resource "azurerm_key_vault_secret" "database_url" {
  name         = "database-url"
  value        = "postgresql://${var.pg_admin_user}:${var.pg_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.pg_database_name}?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.main.primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
}

# ─── Entra ID App Registration ────────────────────────────────────────
resource "azuread_application" "main" {
  display_name     = "Ikonnic Ecommerce"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"

  web {
    redirect_uris = [
      "http://localhost:3000/auth/callback",
      "https://${var.frontend_domain}/auth/callback",
      "https://ikonnic.vercel.app/auth/callback",
    ]

    implicit_grant {
      id_token_issuance_enabled     = true
      access_token_issuance_enabled = true
    }
  }

  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # Microsoft Graph

    resource_access {
      id   = "e1fe6dd8-ba31-4d61-89e7-88639da4683d" # User.Read
      type = "Scope"
    }
    resource_access {
      id   = "14dad69e-099b-42c9-810b-d002981feec1" # profile
      type = "Scope"
    }
    resource_access {
      id   = "37f7f235-527c-4136-accd-4a02d197296e" # openid
      type = "Scope"
    }
    resource_access {
      id   = "64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0" # email
      type = "Scope"
    }
    resource_access {
      id   = "7427e0e9-2fba-42fe-b0c0-848c9e6a8182" # offline_access
      type = "Scope"
    }
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Super Administrators"
    display_name         = "SuperAdmin"
    enabled              = true
    id                   = "1b4f816e-5eaf-48b9-8613-7923830595ad"
    value                = "SuperAdmin"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Administrators"
    display_name         = "Admin"
    enabled              = true
    id                   = "2b4f816e-5eaf-48b9-8613-7923830595ad"
    value                = "Admin"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Customers"
    display_name         = "Customer"
    enabled              = true
    id                   = "3b4f816e-5eaf-48b9-8613-7923830595ad"
    value                = "Customer"
  }

  app_role {
    allowed_member_types = ["User"]
    description          = "Vendors"
    display_name         = "Vendor"
    enabled              = true
    id                   = "4b4f816e-5eaf-48b9-8613-7923830595ad"
    value                = "Vendor"
  }
}

resource "azuread_application_password" "main" {
  application_id = azuread_application.main.id
  display_name   = "Ikonnic-Backend-Secret"
  end_date       = "2028-07-05T00:00:00Z"
}

resource "azuread_service_principal" "main" {
  client_id = azuread_application.main.client_id
}

# ─── Entra ID Groups ──────────────────────────────────────────────────
resource "azuread_group" "super_admins" {
  display_name     = "Ecommerce-SuperAdmins"
  mail_enabled     = false
  security_enabled = true
}

resource "azuread_group" "admins" {
  display_name     = "Ecommerce-Admins"
  mail_enabled     = false
  security_enabled = true
}

resource "azuread_group" "customers" {
  display_name     = "Ecommerce-Customers"
  mail_enabled     = false
  security_enabled = true
}

resource "azuread_group" "vendors" {
  display_name     = "Ecommerce-Vendors"
  mail_enabled     = false
  security_enabled = true
}

# Store Entra secrets in Key Vault
resource "azurerm_key_vault_secret" "entra_client_id" {
  name         = "entra-client-id"
  value        = azuread_application.main.client_id
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "entra_client_secret" {
  name         = "entra-client-secret"
  value        = azuread_application_password.main.value
  key_vault_id = azurerm_key_vault.main.id
}

# ─── Outputs ──────────────────────────────────────────────────────────
output "pg_server_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_url" {
  value     = "postgresql://${var.pg_admin_user}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.pg_database_name}?sslmode=require"
  sensitive = true
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "storage_primary_key" {
  value     = azurerm_storage_account.main.primary_access_key
  sensitive = true
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "entra_client_id" {
  value = azuread_application.main.client_id
}

output "entra_tenant_id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "app_insights_instrumentation_key" {
  value     = azurerm_application_insights.main.instrumentation_key
  sensitive = true
}

output "app_insights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}

output "monthly_cost_estimate" {
  value = <<-EOT
    ── Estimated Monthly Cost ──────────────────
    PostgreSQL Flexible (B1ms):    ~$13/month
    Storage (LRS, <10GB):          ~$1/month
    Key Vault (standard):          ~$0.50/month
    App Insights (free tier):      ~$0/month
    Log Analytics (30 days):       ~$2/month
    Entra ID (free tier):          $0/month
    ─────────────────────────────────────────────
    TOTAL ESTIMATE:                ~$16-20/month
    + SendGrid (free tier):        $0/month
    + Vercel (Pro):                $20/month
    ─────────────────────────────────────────────
    ALL-IN ESTIMATE:               ~$40-50/month
  EOT
}
