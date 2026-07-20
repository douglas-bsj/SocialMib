import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "node:crypto";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { limit: 5, window: 60, prefix: "rl:forgot" });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const { email } = parsed.data;

  // Always respond OK to avoid user enumeration
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    return NextResponse.json({ ok: true });
  }

  // Invalidate previous tokens
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  });

  try {
    await sendPasswordResetEmail(email, user.name, token);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }

  return NextResponse.json({ ok: true });
}
