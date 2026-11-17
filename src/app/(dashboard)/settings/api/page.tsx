import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserWorkspace } from "@/lib/workspace";
import { getWorkspaceRole } from "@/lib/api-keys";
import { getBaseUrl } from "@/lib/social/config";
import { ApiClient } from "./api-client";

export default async function ApiSettingsPage() {
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

  const role = await getWorkspaceRole(session.user.id, workspace.id);

  return (
    <ApiClient
      canManage={role === "OWNER" || role === "ADMIN"}
      mcpUrl={`${getBaseUrl()}/api/mcp`}
    />
  );
}
