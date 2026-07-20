import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getWorkspace(userId: string) {
  return db.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ accounts: [] });
  }

  const accounts = await db.socialAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ accounts });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await getWorkspace(session.user.id);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const body = await request.json();
  const { platform, name, username, profileImage, accessToken, refreshToken, expiresAt } = body;

  if (!platform || !name || !accessToken) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const account = await db.socialAccount.create({
    data: {
      platform,
      name,
      username,
      profileImage,
      accessToken,
      refreshToken,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      workspaceId: workspace.id,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
