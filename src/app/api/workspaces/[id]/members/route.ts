import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWorkspaceInviteEmail, sendNewMemberAccountEmail } from "@/lib/email";
import { z } from "zod";

function generateTempPassword() {
  return randomBytes(14).toString("base64url").slice(0, 18);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({
    where: {
      id,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });
  if (!workspace) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const owner = await db.user.findUnique({
    where: { id: workspace.ownerId },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ owner, members });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  name: z.string().trim().min(2).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!workspace) return NextResponse.json({ error: "Apenas o dono pode convidar membros." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { email, role, name } = parsed.data;

  if (email === session.user.email) {
    return NextResponse.json({ error: "Você já é o dono do workspace." }, { status: 400 });
  }

  let invitedUser = await db.user.findUnique({ where: { email } });
  let tempPassword: string | null = null;
  let createdAccount = false;

  if (!invitedUser) {
    if (!name) {
      return NextResponse.json(
        { error: "Nenhum usuário com este email encontrado. Informe um nome para criar uma conta nova." },
        { status: 404 }
      );
    }

    tempPassword = generateTempPassword();
    invitedUser = await db.user.create({
      data: { name, email, password: bcrypt.hashSync(tempPassword, 12) },
    });
    createdAccount = true;
  }

  const existing = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: invitedUser.id, workspaceId: id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Este usuário já é membro do workspace." }, { status: 409 });
  }

  const [member, inviter] = await Promise.all([
    db.workspaceMember.create({
      data: { userId: invitedUser.id, workspaceId: id, role },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);

  if (createdAccount) {
    sendNewMemberAccountEmail(email, name!, inviter?.name ?? null, workspace.name).catch((err) =>
      console.error("New member account email failed:", err)
    );
  } else {
    sendWorkspaceInviteEmail(email, inviter?.name ?? null, workspace.name).catch((err) =>
      console.error("Invite email failed:", err)
    );
  }

  return NextResponse.json({ member, tempPassword }, { status: 201 });
}
