import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await db.workspace.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      owner: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!workspace) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
        Nenhum workspace encontrado.
      </div>
    );
  }

  const members = workspace.members.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? "",
    email: m.user.email ?? "",
    image: m.user.image ?? null,
    role: m.role as "ADMIN" | "MEMBER",
    joinedAt: m.createdAt.toISOString(),
  }));

  return (
    <MembersClient
      workspaceId={workspace.id}
      isOwner={workspace.ownerId === session.user.id}
      owner={{
        id: workspace.owner.id,
        name: workspace.owner.name ?? "",
        email: workspace.owner.email ?? "",
        image: workspace.owner.image ?? null,
      }}
      initialMembers={members}
    />
  );
}
