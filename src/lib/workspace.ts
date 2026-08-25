import { db } from "./db";

/** Where-clause fragment: workspaces the user owns OR is a member of. */
export function workspaceAccessWhere(userId: string) {
  return {
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

/** The workspace a user (owner or member) has access to. */
export async function getUserWorkspace(userId: string) {
  return db.workspace.findFirst({
    where: workspaceAccessWhere(userId),
    orderBy: { createdAt: "asc" as const },
  });
}
