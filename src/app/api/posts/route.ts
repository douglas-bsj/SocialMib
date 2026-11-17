import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { createPost, PostError } from "@/lib/posts";
import { z } from "zod";

const createPostSchema = z.object({
  content: z.string().min(1),
  selectedAccounts: z.array(z.string()).min(1),
  scheduledAt: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PENDING", "SCHEDULED"]).default("DRAFT"),
  variations: z.record(z.string(), z.string()).optional(),
  images: z.array(z.string().min(1)).max(10).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getUserWorkspace(session.user.id);
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

  const workspace = await getUserWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = createPostSchema.parse(body);

    const post = await createPost(workspace.id, {
      content: data.content,
      accountIds: data.selectedAccounts,
      status: data.status,
      scheduledAt: data.scheduledAt,
      images: data.images,
      variations: data.variations,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    if (error instanceof PostError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
