import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) {
    return NextResponse.json({ error: "Conta criada via OAuth — sem senha para alterar." }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.current, user.password);
  if (!valid) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });

  const hashed = await bcrypt.hash(parsed.data.next, 12);
  await db.user.update({ where: { id: user.id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
