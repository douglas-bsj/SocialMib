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
import { PLATFORM_CONFIGS, getBaseUrl, type PlatformId } from "@/lib/social/config";
import type { Platform } from "@/generated/prisma/client";

// Mensagens amigáveis para os códigos de erro mostrados em /accounts.
const ERROR_MESSAGES: Record<string, string> = {
  invalid_platform: "Plataforma inválida.",
  no_code: "A plataforma não retornou o código de autorização. Tente conectar novamente.",
  invalid_state:
    "A sessão de conexão expirou ou foi perdida (cookies). Tente novamente — se persistir, confira se NEXTAUTH_URL é exatamente o endereço que você usa no navegador.",
  platform_mismatch: "Conexão iniciada em outra plataforma. Tente novamente.",
  no_workspace: "Nenhum workspace encontrado para o seu usuário.",
  access_denied: "Você cancelou a autorização na plataforma.",
};

/** Redireciona para /accounts usando a URL pública (request.url pode ser 0.0.0.0:3000 no container). */
function accountsRedirect(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const response = NextResponse.redirect(`${getBaseUrl()}/accounts?${qs}`);
  clearOAuthCookies(response);
  return response;
}

function errorRedirect(codeOrMessage: string) {
  return accountsRedirect({ error: ERROR_MESSAGES[codeOrMessage] ?? codeOrMessage });
}
import { getPlanConfig } from "@/lib/plans";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${getBaseUrl()}/login?callbackUrl=/accounts`);
  }

  const { platform } = await params;

  if (!PLATFORM_CONFIGS[platform as PlatformId]) {
    return errorRedirect("invalid_platform");
  }

  const platformId = platform as PlatformId;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return errorRedirect(ERROR_MESSAGES[error] ? error : (errorDescription ?? error));
  }

  if (!code) {
    return errorRedirect("no_code");
  }

  const storedState = request.cookies.get("oauth_state")?.value;
  const storedPlatform = request.cookies.get("oauth_platform")?.value;
  const codeVerifier = request.cookies.get("oauth_code_verifier")?.value;

  if (!storedState || storedState !== state) {
    return errorRedirect("invalid_state");
  }

  if (storedPlatform !== platformId) {
    return errorRedirect("platform_mismatch");
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
      return errorRedirect("no_workspace");
    }

    // Enforce social account limit
    const planConfig = getPlanConfig((user?.plan ?? "FREE") as Parameters<typeof getPlanConfig>[0]);
    if (isFinite(planConfig.socialAccountLimit)) {
      const currentCount = await db.socialAccount.count({ where: { workspaceId: workspace.id } });
      if (currentCount >= planConfig.socialAccountLimit) {
        return errorRedirect(
          `Limite de ${planConfig.socialAccountLimit} contas no plano ${planConfig.name}. Faça upgrade para conectar mais.`
        );
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
        platform: config.prismaEnum as Platform,
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

    return accountsRedirect({ success: "connected" });
  } catch (err) {
    console.error(`OAuth callback error for ${platformId}:`, err);
    const msg = err instanceof Error ? err.message : "Erro ao conectar conta.";
    return errorRedirect(msg.slice(0, 400));
  }
}
