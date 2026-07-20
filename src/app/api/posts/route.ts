import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { schedulePost } from "@/lib/queue";
import { getPlanConfig } from "@/lib/plans";
import type { PlanKey } from "@/lib/plans";
import { z } from "zod";

const createPostSchema = z.object({
  content: z.string().min(1),
  selectedAccounts: z.array(z.string()).min(1),
  scheduledAt: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PENDING", "SCHEDULED"]).default("DRAFT"),
  variations: z.record(z.string(), z.string()).optional(),
  images: z.array(z.string().url()).max(4).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await db.workspace.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!workspace) {
    return NextResponse.json({ posts: [] });
  }

  const posts = await db.post.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: {
      socialAccounts: {
        include: { socialAccount: true },
      },
    },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [workspace, user] = await Promise.all([
    db.workspace.findFirst({ where: { ownerId: session.user.id } }),
    db.user.findUnique({ where: { id: session.user.id }, select: { plan: true } }),
  ]);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Enforce monthly post limit
  const planConfig = getPlanConfig((user?.plan ?? "FREE") as PlanKey);
  if (isFinite(planConfig.monthlyPostLimit)) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyCount = await db.post.count({
      where: { workspaceId: workspace.id, createdAt: { gte: startOfMonth } },
    });
    if (monthlyCount >= planConfig.monthlyPostLimit) {
      return NextResponse.json(
        {
          error: `Limite de ${planConfig.monthlyPostLimit} posts/mês atingido no plano ${planConfig.name}. Faça upgrade para continuar.`,
        },
        { status: 403 }
      );
    }
  }

  try {
    const body = await request.json();
    const { content, selectedAccounts, scheduledAt, status, variations, images } =
      createPostSchema.parse(body);

    const accountsExist = await db.socialAccount.findMany({
      where: { id: { in: selectedAccounts }, workspaceId: workspace.id },
    });

    if (accountsExist.length !== selectedAccounts.length) {
      return NextResponse.json(
        { error: "Uma ou mais contas não encontradas." },
        { status: 400 }
      );
    }

    const post = await db.post.create({
      data: {
        content,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        workspaceId: workspace.id,
        images: images ?? [],
        socialAccounts: {
          create: selectedAccounts.map((accountId) => ({
            socialAccountId: accountId,
            status: "PENDING",
          })),
        },
        variations: variations
          ? {
              create: Object.entries(variations).map(([platform, varContent]) => ({
                platform: platform as any,
                content: varContent,
              })),
            }
          : undefined,
      },
      include: {
        socialAccounts: { include: { socialAccount: true } },
      },
    });

    if (status === "SCHEDULED" && scheduledAt) {
      await schedulePost(post.id, new Date(scheduledAt));
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
