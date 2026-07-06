import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACCESS_TOKEN_KEY = "ikonnic_access_token";
const REFRESH_TOKEN_KEY = "ikonnic_refresh_token";

function loginRedirect(request: NextRequest, error: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  response.cookies.delete("ms_oauth_state");
  response.cookies.delete("ms_oauth_next");
  return response;
}

/**
 * Azure Entra ID OAuth callback. Exchanges the authorization code for an ID
 * token, hands it to the backend (`/auth/sso/microsoft`) which verifies it
 * against Microsoft's JWKS and issues platform JWTs, then stores those JWTs
 * in the same cookies the SPA auth layer uses.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("error")) {
    // User cancelled or consent denied at Microsoft
    return loginRedirect(request, "sso_cancelled");
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("ms_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return loginRedirect(request, "sso_failed");
  }

  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return loginRedirect(request, "sso_unconfigured");
  }

  try {
    // 1. Exchange the code for an ID token
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/azure-ad`;
    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          scope: "openid profile email",
        }),
      },
    );

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.id_token) {
      console.error("Microsoft token exchange failed:", tokenData.error_description || tokenData.error);
      return loginRedirect(request, "sso_failed");
    }

    // 2. Backend verifies the ID token and issues platform JWTs
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const ssoResponse = await fetch(`${apiBase}/auth/sso/microsoft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: tokenData.id_token }),
    });

    if (!ssoResponse.ok) {
      const body = await ssoResponse.json().catch(() => ({}));
      console.error("Backend SSO login failed:", ssoResponse.status, body?.message);
      return loginRedirect(request, "sso_failed");
    }

    const { accessToken, refreshToken } = await ssoResponse.json();

    // 3. Store tokens in the cookies the SPA already uses (js-cookie reads
    //    them, so they intentionally are not httpOnly — same as password login)
    const nextPath = request.cookies.get("ms_oauth_next")?.value || "/account";
    const response = NextResponse.redirect(new URL(nextPath, request.url));
    const secure = request.nextUrl.protocol === "https:";
    response.cookies.set(ACCESS_TOKEN_KEY, accessToken, {
      httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 15 * 60,
    });
    response.cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
      httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
    });
    response.cookies.delete("ms_oauth_state");
    response.cookies.delete("ms_oauth_next");
    return response;
  } catch (err) {
    console.error("SSO callback error:", err);
    return loginRedirect(request, "sso_failed");
  }
}
