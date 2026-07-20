import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncWorkspaceInbox } from "@/lib/inbox/sync";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!workspace) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

  const result = await syncWorkspaceInbox(workspace.id);
  return NextResponse.json(result);
}
