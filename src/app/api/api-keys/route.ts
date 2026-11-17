import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { generateApiKey, getWorkspaceRole } from "@/lib/api-keys";
import { z } from "zod";

async function context() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) return { error: NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 }) };
  const role = await getWorkspaceRole(session.user.id, workspace.id);
  if (role !== "OWNER" && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Apenas o dono ou um admin podem gerenciar chaves de API." }, { status: 403 }) };
  }
  return { userId: session.user.id, workspaceId: workspace.id };
}

export async function GET() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  const keys = await db.apiKey.findMany({
    where: { workspaceId: ctx.workspaceId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json({ keys });
}

const schema = z.object({ name: z.string().trim().min(2, "Dê um nome com pelo menos 2 letras.").max(60) });

export async function POST(request: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Nome inválido." }, { status: 400 });
  }

  const active = await db.apiKey.count({ where: { workspaceId: ctx.workspaceId, revokedAt: null } });
  if (active >= 20) {
    return NextResponse.json({ error: "Limite de 20 chaves ativas. Revogue alguma antes." }, { status: 400 });
  }

  const { key, prefix, keyHash } = generateApiKey();
  const record = await db.apiKey.create({
    data: { name: parsed.data.name, prefix, keyHash, userId: ctx.userId, workspaceId: ctx.workspaceId },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  // A chave completa só é devolvida agora.
  return NextResponse.json({ key, apiKey: record }, { status: 201 });
}
