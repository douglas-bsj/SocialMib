import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens.")
    .optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!workspace) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  if (parsed.data.slug && parsed.data.slug !== workspace.slug) {
    const existing = await db.workspace.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return NextResponse.json({ error: "Este slug já está em uso." }, { status: 409 });
  }

  const updated = await db.workspace.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ workspace: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!workspace) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });

  await db.workspace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
