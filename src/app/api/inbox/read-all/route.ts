import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

  const { count } = await db.inboxItem.updateMany({
    where: { workspaceId: workspace.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ count });
}
