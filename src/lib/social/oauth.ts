import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  type PlatformId,
  PLATFORM_CONFIGS,
  getBaseUrl,
  getCallbackUrl,
  getClientId,
  getClientSecret,
} from "./config";

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
    [config.clientIdParam ?? "client_id"]: clientId,
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
    body.set(config.clientIdParam ?? "client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
    ...config.extraHeaders,
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

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    // resposta não-JSON: tratada abaixo
  }

  if (!res.ok || data.error) {
    throw new Error(
      `${config.name}: falha ao trocar o código pelo token (${res.status}). ${describeApiError(data, text)}`
    );
  }

  // Instagram (Login do Instagram) pode responder { data: [{ access_token, user_id }] }
  const first = Array.isArray(data.data) ? (data.data[0] as Record<string, unknown>) : undefined;
  // TikTok v2 pode aninhar em { data: { access_token } }
  const nested =
    data.data && !Array.isArray(data.data) && typeof data.data === "object"
      ? (data.data as Record<string, unknown>)
      : undefined;
  const tokens = (data.access_token ? data : first ?? nested ?? data) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  if (!tokens.access_token) {
    throw new Error(`${config.name}: a resposta não trouxe access_token. ${describeApiError(data, text)}`);
  }

  return tokens as { access_token: string; refresh_token?: string; expires_in?: number; token_type?: string };
}

/** Extrai uma mensagem de erro legível das respostas das APIs sociais. */
export function describeApiError(data: Record<string, unknown>, raw = ""): string {
  const err = data.error as unknown;
  const msg =
    (typeof err === "object" && err && ((err as Record<string, unknown>).message as string)) ||
    (data.error_description as string) ||
    (data.error_message as string) ||
    (data.message as string) ||
    (typeof err === "string" ? err : "") ||
    raw.slice(0, 200);
  return String(msg ?? "").trim();
}

export async function fetchProfile(
  platform: PlatformId,
  accessToken: string
): Promise<{ name: string; username?: string; image?: string }> {
  const config = PLATFORM_CONFIGS[platform];

  const res = await fetch(config.profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, ...config.extraHeaders },
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    // ignora
  }

  if (!res.ok) {
    throw new Error(
      `${config.name}: não foi possível ler o perfil (${res.status}). ${describeApiError(data, text)}`
    );
  }

  return parseProfile(platform, data);
}

function parseProfile(
  platform: PlatformId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        name: data.name || data.username || "Instagram User",
        username: data.username ?? (data.user_id ? String(data.user_id) : data.id),
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
  // "secure" segue o protocolo da URL pública. Com NODE_ENV=production servido por
  // http (ex.: stack de teste em http://IP:porta) o navegador descartava os cookies
  // e o callback sempre falhava com "invalid_state".
  const opts = {
    httpOnly: true,
    secure: getBaseUrl().startsWith("https://"),
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
