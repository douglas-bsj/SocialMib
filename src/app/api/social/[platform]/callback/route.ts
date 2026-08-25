import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchProfile,
  clearOAuthCookies,
} from "@/lib/social/oauth";
import { PLATFORM_CONFIGS, type PlatformId } from "@/lib/social/config";
import { getPlanConfig } from "@/lib/plans";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { platform } = await params;

  if (!PLATFORM_CONFIGS[platform as PlatformId]) {
    return NextResponse.redirect(new URL("/accounts?error=invalid_platform", request.url));
  }

  const platformId = platform as PlatformId;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const msg = encodeURIComponent(errorDescription ?? error);
    return NextResponse.redirect(new URL(`/accounts?error=${msg}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/accounts?error=no_code", request.url));
  }

  const storedState = request.cookies.get("oauth_state")?.value;
  const storedPlatform = request.cookies.get("oauth_platform")?.value;
  const codeVerifier = request.cookies.get("oauth_code_verifier")?.value;

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/accounts?error=invalid_state", request.url));
  }

  if (storedPlatform !== platformId) {
    return NextResponse.redirect(new URL("/accounts?error=platform_mismatch", request.url));
  }

  try {
    const shortLivedTokens = await exchangeCodeForToken(platformId, code, codeVerifier);

    // Instagram and Threads return short-lived tokens (~1h). Exchange for long-lived (~60 days).
    let tokens = shortLivedTokens;
    if (platformId === "instagram" || platformId === "threads") {
      try {
        const longLived = await exchangeForLongLivedToken(platformId, shortLivedTokens.access_token);
        tokens = { ...shortLivedTokens, access_token: longLived.access_token, expires_in: longLived.expires_in };
      } catch (e) {
        console.warn(`Long-lived token exchange failed for ${platformId}, using short-lived token:`, e);
      }
    }

    const profile = await fetchProfile(platformId, tokens.access_token);

    const [workspace, user] = await Promise.all([
      getUserWorkspace(session.user.id),
      db.user.findUnique({ where: { id: session.user.id }, select: { plan: true } }),
    ]);

    if (!workspace) {
      return NextResponse.redirect(new URL("/accounts?error=no_workspace", request.url));
    }

    // Enforce social account limit
    const planConfig = getPlanConfig((user?.plan ?? "FREE") as Parameters<typeof getPlanConfig>[0]);
    if (isFinite(planConfig.socialAccountLimit)) {
      const currentCount = await db.socialAccount.count({ where: { workspaceId: workspace.id } });
      if (currentCount >= planConfig.socialAccountLimit) {
        const msg = encodeURIComponent(
          `Limite de ${planConfig.socialAccountLimit} contas no plano ${planConfig.name}. Faça upgrade para conectar mais.`
        );
        const response = NextResponse.redirect(new URL(`/accounts?error=${msg}`, request.url));
        clearOAuthCookies(response);
        return response;
      }
    }

    const config = PLATFORM_CONFIGS[platformId];
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await db.socialAccount.upsert({
      where: {
        id: `${workspace.id}-${platformId}-${profile.username ?? profile.name}`,
      },
      create: {
        id: `${workspace.id}-${platformId}-${profile.username ?? profile.name}`,
        platform: config.prismaEnum as any,
        name: profile.name,
        username: profile.username,
        profileImage: profile.image,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        workspaceId: workspace.id,
      },
      update: {
        name: profile.name,
        username: profile.username,
        profileImage: profile.image,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt,
        isActive: true,
      },
    });

    const response = NextResponse.redirect(new URL("/accounts?success=connected", request.url));
    clearOAuthCookies(response);
    return response;
  } catch (err) {
    console.error(`OAuth callback error for ${platformId}:`, err);
    const msg = encodeURIComponent(
      err instanceof Error ? err.message : "Erro ao conectar conta."
    );
    const response = NextResponse.redirect(
      new URL(`/accounts?error=${msg}`, request.url)
    );
    clearOAuthCookies(response);
    return response;
  }
}
