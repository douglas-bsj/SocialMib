import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const isRead = typeof body.isRead === "boolean" ? body.isRead : true;

  const item = await db.inboxItem.findUnique({
    where: { id },
    include: { workspace: { select: { ownerId: true } } },
  });
  if (!item || item.workspace.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
  }

  await db.inboxItem.update({ where: { id }, data: { isRead } });
  return NextResponse.json({ ok: true });
}
