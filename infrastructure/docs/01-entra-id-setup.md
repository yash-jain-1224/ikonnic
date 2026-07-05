# Microsoft Entra ID Setup Guide

## Overview
This guide covers the complete setup of Microsoft Entra ID (formerly Azure AD) for the Ikonnic e-commerce platform, including app registration, social login, roles, groups, and permissions.

---

## 1. App Registration (Automated via Terraform/CLI)

The provisioning scripts already create the base app registration. This section covers **manual configuration** needed after initial setup.

### Verify App Registration
```bash
az ad app list --display-name "Ikonnic E-Commerce" --query "[].{appId:appId, displayName:displayName}" -o table
```

### Configure Redirect URIs
Navigate to **Azure Portal → Entra ID → App Registrations → Ikonnic E-Commerce → Authentication**

| Platform | Redirect URI | Environment |
|----------|-------------|-------------|
| SPA | `https://ikonnic.com/api/auth/callback/azure-ad` | Production |
| SPA | `https://ikonnic.com/login` | Production |
| SPA | `http://localhost:3000/api/auth/callback/azure-ad` | Development |
| SPA | `http://localhost:3000/login` | Development |

### Token Configuration
- **ID Token**: ✅ Enable (implicit grant for SPA)
- **Access Token**: ✅ Enable
- **Supported account types**: Accounts in any organizational directory + personal Microsoft accounts

---

## 2. Social Login Providers

### 2.1 Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set authorized redirect URIs:
   - `https://ikonnic.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
4. Note the **Client ID** and **Client Secret**
5. Store in Key Vault:
```bash
az keyvault secret set --vault-name ikonnic-kv --name "google-client-id" --value "<CLIENT_ID>"
az keyvault secret set --vault-name ikonnic-kv --name "google-client-secret" --value "<CLIENT_SECRET>"
```

### 2.2 Facebook OAuth Setup (Optional)
1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create a new app → Consumer → Set up Facebook Login
3. Valid OAuth Redirect URIs:
   - `https://ikonnic.com/api/auth/callback/facebook`
4. Store in Key Vault:
```bash
az keyvault secret set --vault-name ikonnic-kv --name "facebook-client-id" --value "<APP_ID>"
az keyvault secret set --vault-name ikonnic-kv --name "facebook-client-secret" --value "<APP_SECRET>"
```

### 2.3 Apple Sign-In (Optional)
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Register a Services ID
3. Configure Sign In with Apple:
   - Domain: `ikonnic.com`
   - Return URL: `https://ikonnic.com/api/auth/callback/apple`
4. Generate a private key and note the Key ID

---

## 3. App Roles Configuration

### Define Roles in App Manifest
Navigate to **App Registrations → Ikonnic E-Commerce → App roles**

| Role | Value | Description | Allowed Members |
|------|-------|-------------|-----------------|
| Admin | `admin` | Full platform admin access | Users/Groups |
| Manager | `manager` | Order & catalog management | Users/Groups |
| Customer | `customer` | Standard customer access | Users/Groups |
| Support | `support` | Customer support agent | Users/Groups |

### Create via CLI
```bash
APP_OBJECT_ID=$(az ad app show --id <APP_ID> --query id -o tsv)

# Add Admin role
az rest --method PATCH \
  --uri "https://graph.microsoft.com/v1.0/applications/${APP_OBJECT_ID}" \
  --body '{
    "appRoles": [
      {
        "allowedMemberTypes": ["User"],
        "description": "Full platform administrator",
        "displayName": "Admin",
        "id": "'$(uuidgen)'",
        "isEnabled": true,
        "value": "admin"
      },
      {
        "allowedMemberTypes": ["User"],
        "description": "Order and catalog management",
        "displayName": "Manager",
        "id": "'$(uuidgen)'",
        "isEnabled": true,
        "value": "manager"
      },
      {
        "allowedMemberTypes": ["User"],
        "description": "Standard customer",
        "displayName": "Customer",
        "id": "'$(uuidgen)'",
        "isEnabled": true,
        "value": "customer"
      },
      {
        "allowedMemberTypes": ["User"],
        "description": "Customer support agent",
        "displayName": "Support",
        "id": "'$(uuidgen)'",
        "isEnabled": true,
        "value": "support"
      }
    ]
  }'
```

---

## 4. Security Groups

### Create Groups (Already in Terraform)
```bash
# Verify groups exist
az ad group list --display-name "Ikonnic" --query "[].{name:displayName, id:id}" -o table
```

### Assign Users to Groups
```bash
# Add user to admin group
az ad group member add --group "Ikonnic-Admins" --member-id <USER_OBJECT_ID>

# Add user to customers group
az ad group member add --group "Ikonnic-Customers" --member-id <USER_OBJECT_ID>
```

### Group-Role Mapping
| Group | Assigned Role | Permissions |
|-------|--------------|-------------|
| Ikonnic-Admins | Admin | All CRUD, user management, analytics |
| Ikonnic-Managers | Manager | Product/order management |
| Ikonnic-Customers | Customer | Browse, purchase, profile |
| Ikonnic-Support | Support | View orders, manage customer issues |

---

## 5. API Permissions

### Required Microsoft Graph Permissions
| Permission | Type | Purpose |
|-----------|------|---------|
| `User.Read` | Delegated | Sign-in and read user profile |
| `email` | Delegated | Access user email |
| `profile` | Delegated | Access user profile info |
| `openid` | Delegated | OpenID Connect sign-in |

### Grant Admin Consent
```bash
az ad app permission admin-consent --id <APP_ID>
```

---

## 6. Token Claims Configuration

### Optional Claims (ID Token)
Add these claims in **App Registration → Token configuration → Optional claims**:
- `email` - User's email address
- `family_name` - Last name
- `given_name` - First name
- `preferred_username` - Display name

### Custom Claims (via Claims Mapping Policy)
For including role information in tokens:
```bash
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/policies/claimsMappingPolicies" \
  --body '{
    "definition": ["{\"ClaimsMappingPolicy\":{\"Version\":1,\"IncludeBasicClaimSet\":\"true\",\"ClaimsSchema\":[{\"Source\":\"user\",\"ID\":\"assignedroles\",\"JwtClaimType\":\"roles\"}]}}"],
    "displayName": "Ikonnic Claims Policy",
    "isOrganizationDefault": false
  }'
```

---

## 7. NextAuth.js Integration

### Install Dependencies
```bash
npm install next-auth @azure/msal-browser @azure/msal-node
```

### Environment Variables for Auth
```env
# Microsoft Entra ID
AZURE_AD_CLIENT_ID=<from-app-registration>
AZURE_AD_CLIENT_SECRET=<from-key-vault>
AZURE_AD_TENANT_ID=<your-tenant-id>

# Google OAuth
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-key-vault>

# NextAuth
NEXTAUTH_URL=https://ikonnic.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

### Auth Configuration (`/src/lib/auth.ts`)
```typescript
import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.roles = (profile as any)?.roles || ["customer"];
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.roles = token.roles;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
```

---

## 8. Security Best Practices

- [ ] Enable MFA for all admin accounts
- [ ] Rotate client secrets every 90 days
- [ ] Use Conditional Access policies for admin portal
- [ ] Enable sign-in risk policies (if P2 license available)
- [ ] Monitor sign-in logs via Azure Portal
- [ ] Set up alerts for failed authentication attempts
- [ ] Use short-lived tokens (1 hour access, 24 hour refresh)
- [ ] Implement PKCE flow for SPA authentication

---

## 9. Testing Authentication

### Test Login Flow
1. Navigate to `http://localhost:3000/login`
2. Click "Sign in with Microsoft" or "Sign in with Google"
3. Authenticate and consent to permissions
4. Verify redirect back to application with session

### Verify Token Contents
```bash
# Decode JWT token (paste token from browser dev tools)
echo "<JWT_TOKEN>" | cut -d'.' -f2 | base64 -d | jq .
```

### Test Role-Based Access
```typescript
// In API route or server component
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (!session?.user?.roles?.includes("admin")) {
  return new Response("Forbidden", { status: 403 });
}
```
