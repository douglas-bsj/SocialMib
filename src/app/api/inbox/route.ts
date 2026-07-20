import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Platform, InboxType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const workspace = await db.workspace.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!workspace) return NextResponse.json({ items: [], total: 0 });

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") as Platform | null;
  const type = searchParams.get("type") as InboxType | null;
  const unreadOnly = searchParams.get("unread") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where = {
    workspaceId: workspace.id,
    ...(platform ? { platform } : {}),
    ...(type ? { type } : {}),
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [items, total, unreadCount] = await Promise.all([
    db.inboxItem.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        socialAccount: { select: { name: true, username: true, profileImage: true } },
      },
    }),
    db.inboxItem.count({ where }),
    db.inboxItem.count({ where: { workspaceId: workspace.id, isRead: false } }),
  ]);

  return NextResponse.json({ items, total, unreadCount, page, limit });
}
