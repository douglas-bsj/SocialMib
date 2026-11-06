import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string; userId: string }> };

const schema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128),
});

/**
 * Dono ou Admin do workspace define uma nova senha para outra pessoa do mesmo
 * workspace (o dono ou qualquer membro). A própria senha é trocada em Configurações → Perfil.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const requesterId = session.user.id;

  if (userId === requesterId) {
    return NextResponse.json(
      { error: "Para trocar a sua própria senha, use Configurações → Perfil." },
      { status: 400 }
    );
  }

  const workspace = await db.workspace.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });
  }

  // Quem pede precisa ser Dono ou Admin deste workspace.
  const requesterMembership =
    workspace.ownerId === requesterId
      ? { role: "OWNER" as const }
      : await db.workspaceMember.findUnique({
          where: { userId_workspaceId: { userId: requesterId, workspaceId: id } },
          select: { role: true },
        });

  if (!requesterMembership || requesterMembership.role === "MEMBER") {
    return NextResponse.json(
      { error: "Apenas o dono ou um admin pode redefinir senhas." },
      { status: 403 }
    );
  }

  // A pessoa alvo precisa fazer parte deste workspace (dono ou membro).
  const targetBelongs =
    workspace.ownerId === userId ||
    !!(await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: id } },
      select: { id: true },
    }));
  if (!targetBelongs) {
    return NextResponse.json({ error: "Usuário não faz parte deste workspace." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Senha inválida." },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { password: hashed } }),
    // Links de recuperação pendentes deixam de valer.
    db.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
