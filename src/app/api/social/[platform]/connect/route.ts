import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateState,
  generateCodeVerifier,
  buildAuthUrl,
  setOAuthCookies,
} from "@/lib/social/oauth";
import { PLATFORM_CONFIGS, type PlatformId } from "@/lib/social/config";

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
    return NextResponse.json({ error: `Plataforma "${platform}" não suportada.` }, { status: 400 });
  }

  const platformId = platform as PlatformId;
  const config = PLATFORM_CONFIGS[platformId];
  const state = generateState();

  let codeVerifier: string | undefined;
  if (config.usesPKCE) {
    codeVerifier = generateCodeVerifier();
  }

  const authUrl = buildAuthUrl(platformId, state, codeVerifier);

  const response = NextResponse.redirect(authUrl);
  setOAuthCookies(response, state, platformId, codeVerifier);

  return response;
}
