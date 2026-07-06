import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Starts the Azure Entra ID (Microsoft) OAuth 2.0 authorization-code flow.
 * The `common` authority is used because the app registration allows both
 * organizational and personal Microsoft accounts.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=sso_unconfigured", request.url));
  }

  const state = crypto.randomUUID();

  // Only allow same-site relative paths as post-login destination
  const requested = request.nextUrl.searchParams.get("redirect") || "/account";
  const nextPath = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/account";

  const redirectUri = `${request.nextUrl.origin}/api/auth/callback/azure-ad`;

  const authorizeUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_mode", "query");
  authorizeUrl.searchParams.set("scope", "openid profile email");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizeUrl);
  const secure = request.nextUrl.protocol === "https:";
  const cookieOptions = { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set("ms_oauth_state", state, cookieOptions);
  response.cookies.set("ms_oauth_next", nextPath, cookieOptions);
  return response;
}
