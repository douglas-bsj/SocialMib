import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { limit: 10, window: 60, prefix: "rl:register" });
  if (limited) return limited;

  try {
    const body = await request.json();
    const { name, email, password } = registerSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Este email já está cadastrado." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const slug = name.toLowerCase().replace(/\s+/g, "-") + "-" + user.id.slice(-4);
    await db.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        slug,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });

    // Fire-and-forget welcome email
    sendWelcomeEmail(email, name).catch((err) =>
      console.error("Welcome email failed:", err)
    );

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
