import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserWorkspace } from "@/lib/workspace";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await getUserWorkspace(session.user.id);

  const inboxUnread = workspace
    ? await db.inboxItem.count({
        where: { workspaceId: workspace.id, isRead: false },
      })
    : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        user={session.user}
        workspace={workspace ?? undefined}
        inboxUnread={inboxUnread}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
