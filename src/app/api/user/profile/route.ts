import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { name, email } = parsed.data;

  if (email !== session.user.email) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Este email já está em uso." }, { status: 409 });
    }
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { name, email },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ user });
}
