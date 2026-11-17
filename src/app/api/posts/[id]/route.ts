import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWorkspace } from "@/lib/workspace";
import { getPost, updatePost, deletePost, PostError } from "@/lib/posts";

type Params = { params: Promise<{ id: string }> };

async function workspaceIdFor(userId: string) {
  const workspace = await getUserWorkspace(userId);
  return workspace?.id ?? null;
}

function errorResponse(error: unknown) {
  if (error instanceof PostError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Post route error:", error);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workspaceId = await workspaceIdFor(session.user.id);
  const post = workspaceId ? await getPost(workspaceId, id) : null;
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ post });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workspaceId = await workspaceIdFor(session.user.id);
  if (!workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  try {
    const post = await updatePost(workspaceId, id, {
      content: typeof body.content === "string" ? body.content : undefined,
      status: ["DRAFT", "PENDING", "SCHEDULED"].includes(body.status) ? body.status : undefined,
      scheduledAt: body.scheduledAt === undefined ? undefined : body.scheduledAt,
      images: Array.isArray(body.images) ? body.images : undefined,
      retry: body.retry === true,
    });
    return NextResponse.json({ post });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workspaceId = await workspaceIdFor(session.user.id);
  if (!workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deletePost(workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
