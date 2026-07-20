import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { type PlatformId, PLATFORM_CONFIGS, getCallbackUrl, getClientId, getClientSecret } from "./config";

export function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function buildAuthUrl(
  platform: PlatformId,
  state: string,
  codeVerifier?: string
): string {
  const config = PLATFORM_CONFIGS[platform];
  const clientId = getClientId(platform);
  const callbackUrl = getCallbackUrl(platform);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: config.scopes.join(config.scopeJoiner),
    state,
    ...config.extraAuthParams,
  });

  if (config.usesPKCE && codeVerifier) {
    params.set("code_challenge", generateCodeChallenge(codeVerifier));
    params.set("code_challenge_method", "S256");
  }

  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  platform: PlatformId,
  code: string,
  codeVerifier?: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}> {
  const config = PLATFORM_CONFIGS[platform];
  const clientId = getClientId(platform);
  const clientSecret = getClientSecret(platform);
  const callbackUrl = getCallbackUrl(platform);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
    ...config.extraTokenParams,
  });

  if (config.usesPKCE && codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  if (!config.usesBasicAuth) {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
  };

  if (config.usesBasicAuth) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed for ${platform}: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchProfile(
  platform: PlatformId,
  accessToken: string
): Promise<{ name: string; username?: string; image?: string }> {
  const config = PLATFORM_CONFIGS[platform];

  const res = await fetch(config.profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Profile fetch failed for ${platform}: ${res.status}`);
  }

  const data = await res.json();
  return parseProfile(platform, data);
}

function parseProfile(
  platform: PlatformId,
  data: any
): { name: string; username?: string; image?: string } {
  switch (platform) {
    case "twitter":
      return {
        name: data.data?.name ?? data.name ?? "Twitter User",
        username: data.data?.username ?? data.username,
        image: data.data?.profile_image_url,
      };

    case "instagram":
      return {
        name: data.name ?? data.username ?? "Instagram User",
        username: data.username,
        image: data.profile_picture_url,
      };

    case "facebook":
      return {
        name: data.name ?? "Facebook User",
        username: data.id,
        image: data.picture?.data?.url,
      };

    case "linkedin":
      return {
        name: [data.given_name, data.family_name].filter(Boolean).join(" ") || "LinkedIn User",
        username: data.sub,
        image: data.picture,
      };

    case "tiktok":
      return {
        name: data.data?.user?.display_name ?? "TikTok User",
        username: data.data?.user?.username,
        image: data.data?.user?.avatar_url,
      };

    case "youtube": {
      const channel = data.items?.[0]?.snippet;
      return {
        name: channel?.title ?? "YouTube Channel",
        username: data.items?.[0]?.id,
        image: channel?.thumbnails?.default?.url,
      };
    }

    case "pinterest":
      return {
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || "Pinterest User",
        username: data.username,
        image: data.profile_image,
      };

    case "threads":
      return {
        name: data.name ?? data.username ?? "Threads User",
        username: data.username,
        image: data.threads_profile_picture_url,
      };

    case "reddit":
      return {
        name: data.name ?? "Reddit User",
        username: data.name,
        image: data.icon_img?.split("?")?.[0],
      };

    default:
      return { name: "Unknown User" };
  }
}

export async function exchangeForLongLivedToken(
  platform: "instagram" | "threads",
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const clientSecret = getClientSecret(platform);
  const baseUrl =
    platform === "instagram"
      ? "https://graph.instagram.com/access_token"
      : "https://graph.threads.net/access_token";
  const grantType = platform === "instagram" ? "ig_exchange_token" : "th_exchange_token";

  const url = new URL(baseUrl);
  url.searchParams.set("grant_type", grantType);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("access_token", shortLivedToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Long-lived token exchange failed for ${platform}: ${res.status} ${text}`);
  }
  return res.json();
}

export function setOAuthCookies(
  response: NextResponse,
  state: string,
  platform: PlatformId,
  codeVerifier?: string
) {
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  response.cookies.set("oauth_state", state, opts);
  response.cookies.set("oauth_platform", platform, opts);
  if (codeVerifier) {
    response.cookies.set("oauth_code_verifier", codeVerifier, opts);
  }
}

export function clearOAuthCookies(response: NextResponse) {
  const opts = { maxAge: 0, path: "/" };
  response.cookies.set("oauth_state", "", opts);
  response.cookies.set("oauth_platform", "", opts);
  response.cookies.set("oauth_code_verifier", "", opts);
}
