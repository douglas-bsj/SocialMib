import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({ where: { id, ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "Apenas o dono pode alterar funções." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = z.object({ role: z.enum(["ADMIN", "MEMBER"]) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Role inválido." }, { status: 400 });

  const member = await db.workspaceMember.update({
    where: { userId_workspaceId: { userId, workspaceId: id } },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ member });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({ where: { id, ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "Apenas o dono pode remover membros." }, { status: 403 });

  await db.workspaceMember.delete({
    where: { userId_workspaceId: { userId, workspaceId: id } },
  });

  return NextResponse.json({ ok: true });
}
