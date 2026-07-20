import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getAccountWithAuth(userId: string, accountId: string) {
  const workspace = await db.workspace.findFirst({
    where: { ownerId: userId },
  });
  if (!workspace) return null;

  return db.socialAccount.findFirst({
    where: { id: accountId, workspaceId: workspace.id },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const account = await getAccountWithAuth(session.user.id, id);
  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updated = await db.socialAccount.update({
    where: { id },
    data: {
      isActive: body.isActive ?? account.isActive,
      accessToken: body.accessToken ?? account.accessToken,
      refreshToken: body.refreshToken ?? account.refreshToken,
    },
  });

  return NextResponse.json({ account: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const account = await getAccountWithAuth(session.user.id, id);
  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.socialAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
