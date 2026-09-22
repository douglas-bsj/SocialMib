import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateState,
  generateCodeVerifier,
  buildAuthUrl,
  setOAuthCookies,
} from "@/lib/social/oauth";
import {
  PLATFORM_CONFIGS,
  getBaseUrl,
  isPlatformConfigured,
  type PlatformId,
} from "@/lib/social/config";

function accountsRedirect(error: string) {
  return NextResponse.redirect(`${getBaseUrl()}/accounts?error=${encodeURIComponent(error)}`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${getBaseUrl()}/login?callbackUrl=/accounts`);
  }

  const { platform } = await params;
  const config = PLATFORM_CONFIGS[platform as PlatformId];

  if (!config) {
    return accountsRedirect(`Plataforma "${platform}" não suportada.`);
  }

  const platformId = platform as PlatformId;

  // Sem client id/secret o provedor mostra um erro genérico ("client_id inválido").
  // Avisa aqui, com a variável exata que falta.
  if (!isPlatformConfigured(platformId)) {
    return accountsRedirect(
      `${config.name} ainda não está configurado no servidor. Defina ${config.envVars.join(" e ")} nas variáveis de ambiente e reinicie o app.`
    );
  }

  const state = generateState();
  const codeVerifier = config.usesPKCE ? generateCodeVerifier() : undefined;
  const authUrl = buildAuthUrl(platformId, state, codeVerifier);

  const response = NextResponse.redirect(authUrl);
  setOAuthCookies(response, state, platformId, codeVerifier);
  return response;
}
