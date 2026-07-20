import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { schedulePost } from "@/lib/queue";

async function getPost(userId: string, postId: string) {
  const workspace = await db.workspace.findFirst({ where: { ownerId: userId } });
  if (!workspace) return null;
  return db.post.findFirst({
    where: { id: postId, workspaceId: workspace.id },
    include: {
      socialAccounts: { include: { socialAccount: true } },
      variations: true,
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await getPost(session.user.id, id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ post });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await getPost(session.user.id, id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const newStatus = body.status ?? post.status;

  const updated = await db.post.update({
    where: { id },
    data: {
      content: body.content ?? post.content,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : post.scheduledAt,
      status: newStatus,
      images: body.images ?? post.images,
    },
  });

  // Re-enqueue when retrying a failed post
  if (body.retry && newStatus === "PENDING") {
    schedulePost(id, new Date()).catch((err) =>
      console.error("Failed to re-enqueue post:", err)
    );
  }

  return NextResponse.json({ post: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await getPost(session.user.id, id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
