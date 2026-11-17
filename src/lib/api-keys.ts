import crypto from "node:crypto";
import { db } from "./db";

/** Prefixo visível das chaves do Mib Social ("mib social key"). */
const KEY_PREFIX = "msk_";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Gera uma chave nova. A chave completa só é mostrada uma vez; no banco fica o hash. */
export function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const key = KEY_PREFIX + crypto.randomBytes(32).toString("base64url");
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 6), keyHash: hashApiKey(key) };
}

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

/** Papel do usuário no workspace (ou null se não faz parte). */
export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { ownerId: true } });
  if (!ws) return null;
  if (ws.ownerId === userId) return "OWNER";
  const m = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { role: true },
  });
  return m?.role ?? null;
}

export interface ApiKeyContext {
  keyId: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

/** Lê a chave do header Authorization: Bearer, do header X-API-Key ou do parâmetro ?key= */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const header = request.headers.get("x-api-key");
  if (header) return header.trim();
  const fromQuery = new URL(request.url).searchParams.get("key");
  return fromQuery?.trim() || null;
}

/** Valida a chave. Retorna o contexto (usuário + workspace) ou null. */
export async function authenticateApiKey(key: string | null): Promise<ApiKeyContext | null> {
  if (!key || !key.startsWith(KEY_PREFIX)) return null;

  const record = await db.apiKey.findUnique({ where: { keyHash: hashApiKey(key) } });
  if (!record || record.revokedAt) return null;

  // Se a pessoa saiu do workspace, a chave dela deixa de valer.
  const role = await getWorkspaceRole(record.userId, record.workspaceId);
  if (!role) return null;

  // Atualiza "último uso" no máximo uma vez por minuto.
  if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 60_000) {
    db.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }

  return { keyId: record.id, userId: record.userId, workspaceId: record.workspaceId, role };
}
