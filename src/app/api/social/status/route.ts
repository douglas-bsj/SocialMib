import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  PLATFORM_CONFIGS,
  getCallbackUrl,
  isPlatformConfigured,
  type PlatformId,
} from "@/lib/social/config";

/** Quais plataformas OAuth têm credenciais configuradas no servidor (Bluesky sempre disponível). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platforms: Record<string, { configured: boolean; callbackUrl?: string; envVars?: string[] }> = {
    bluesky: { configured: true },
  };

  for (const id of Object.keys(PLATFORM_CONFIGS) as PlatformId[]) {
    platforms[id] = {
      configured: isPlatformConfigured(id),
      callbackUrl: getCallbackUrl(id),
      envVars: PLATFORM_CONFIGS[id].envVars,
    };
  }

  return NextResponse.json({ platforms });
}
