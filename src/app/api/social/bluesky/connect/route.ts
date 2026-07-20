import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  handle: z.string().min(3),
  appPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Handle e app password são obrigatórios." }, { status: 400 });
  }

  const { handle, appPassword } = parsed.data;

  const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

  try {
    const sessionRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cleanHandle, password: appPassword }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.json().catch(() => ({}));
      const msg = (err as any).message ?? "Handle ou app password incorretos.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const bskySession = await sessionRes.json();

    const profileRes = await fetch(
      `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${bskySession.did}`,
      { headers: { Authorization: `Bearer ${bskySession.accessJwt}` } }
    );

    let displayName = cleanHandle;
    let avatar: string | undefined;

    if (profileRes.ok) {
      const profile = await profileRes.json();
      displayName = profile.displayName ?? cleanHandle;
      avatar = profile.avatar;
    }

    const workspace = await db.workspace.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });
    }

    const accountId = `${workspace.id}-bluesky-${cleanHandle}`;

    await db.socialAccount.upsert({
      where: { id: accountId },
      create: {
        id: accountId,
        platform: "BLUESKY",
        name: displayName,
        username: cleanHandle,
        profileImage: avatar,
        accessToken: bskySession.accessJwt,
        refreshToken: bskySession.refreshJwt,
        workspaceId: workspace.id,
      },
      update: {
        name: displayName,
        profileImage: avatar,
        accessToken: bskySession.accessJwt,
        refreshToken: bskySession.refreshJwt,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Bluesky connect error:", err);
    return NextResponse.json({ error: "Erro ao conectar ao Bluesky." }, { status: 500 });
  }
}
