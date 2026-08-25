import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Nenhum workspace encontrado.</p>
      </div>
    );
  }

  const [items, unreadCount, connectedPlatforms] = await Promise.all([
    db.inboxItem.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { receivedAt: "desc" },
      take: 20,
      include: {
        socialAccount: { select: { name: true, username: true, profileImage: true } },
      },
    }),
    db.inboxItem.count({ where: { workspaceId: workspace.id, isRead: false } }),
    db.socialAccount.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: { platform: true },
    }),
  ]);

  const serialized = items.map((item) => ({
    id: item.id,
    type: item.type,
    platform: item.platform,
    externalId: item.externalId,
    authorName: item.authorName,
    authorUsername: item.authorUsername ?? null,
    authorImage: item.authorImage ?? null,
    text: item.text,
    postUrl: item.postUrl ?? null,
    isRead: item.isRead,
    receivedAt: item.receivedAt.toISOString(),
    socialAccount: item.socialAccount,
  }));

  const platforms = [...new Set(connectedPlatforms.map((a) => a.platform))];

  return (
    <InboxClient
      initialItems={serialized}
      initialUnread={unreadCount}
      connectedPlatforms={platforms}
      workspaceId={workspace.id}
    />
  );
}
