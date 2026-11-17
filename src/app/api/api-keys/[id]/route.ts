import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { getWorkspaceRole } from "@/lib/api-keys";

/** Revoga uma chave: ela para de funcionar na hora. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

  const role = await getWorkspaceRole(session.user.id, workspace.id);
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas o dono ou um admin podem revogar chaves." }, { status: 403 });
  }

  const { id } = await params;
  const { count } = await db.apiKey.updateMany({
    where: { id, workspaceId: workspace.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return NextResponse.json({ error: "Chave não encontrada." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
