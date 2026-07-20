import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const workspace = await db.workspace.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!workspace) {
    return NextResponse.json({ count: 0 });
  }

  const count = await db.inboxItem.count({
    where: { workspaceId: workspace.id, isRead: false },
  });

  return NextResponse.json({ count });
}
