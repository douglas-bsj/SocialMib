import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { getTikTokCreatorInfo, getValidTikTokToken, TikTokApiError } from "@/lib/social/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dados da conta TikTok para a tela de publicação: apelido, opções de
 * privacidade permitidas e o que está desligado (regras do TikTok).
 * GET /api/social/tiktok/creator-info?accountId=...
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountId = request.nextUrl.searchParams.get("accountId");
  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace || !accountId) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const account = await db.socialAccount.findFirst({
    where: { id: accountId, workspaceId: workspace.id, platform: "TIKTOK" },
  });
  if (!account) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  try {
    const token = await getValidTikTokToken(account, (t) =>
      db.socialAccount.update({
        where: { id: account.id },
        data: { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresAt: t.expiresAt },
      })
    );
    const info = await getTikTokCreatorInfo(token);
    return NextResponse.json({ info });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao consultar o TikTok.";
    const status = err instanceof TikTokApiError && err.httpStatus === 429 ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
