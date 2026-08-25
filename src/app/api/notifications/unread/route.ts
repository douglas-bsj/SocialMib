import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  const workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    return NextResponse.json({ count: 0 });
  }

  const count = await db.inboxItem.count({
    where: { workspaceId: workspace.id, isRead: false },
  });

  return NextResponse.json({ count });
}
