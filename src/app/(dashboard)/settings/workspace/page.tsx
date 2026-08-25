import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserWorkspace } from "@/lib/workspace";
import { WorkspaceClient } from "./workspace-client";

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await getUserWorkspace(session.user.id);

  if (!workspace) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
        Nenhum workspace encontrado.
      </div>
    );
  }

  return (
    <WorkspaceClient
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logo: workspace.logo ?? null,
        createdAt: workspace.createdAt.toISOString(),
      }}
      isOwner={workspace.ownerId === session.user.id}
    />
  );
}
