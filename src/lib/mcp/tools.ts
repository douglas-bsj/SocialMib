import { z } from "zod";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { db } from "@/lib/db";
import { createPost, getPost, updatePost, deletePost, PostError } from "@/lib/posts";
import { syncWorkspaceInbox } from "@/lib/inbox/sync";
import { uploadFile } from "@/lib/storage";
import { ALLOWED_TYPES, MAX_FILE_SIZE } from "@/lib/storage-constants";
import { getBaseUrl } from "@/lib/social/config";
import type { ApiKeyContext } from "@/lib/api-keys";
import type { Platform, PostStatus, InboxType } from "@/generated/prisma/client";

/**
 * Ferramentas MCP do Mib Social. Cada ferramenta age dentro do workspace da
 * chave de API usada, com as mesmas regras do site.
 */

export class ToolError extends Error {}

/** Bloqueia endereços internos (rede da empresa, localhost, nuvem) para evitar SSRF. */
function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicUrl(u: URL) {
  if (!["http:", "https:"].includes(u.protocol)) throw new ToolError("Use uma URL http(s).");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new ToolError("Não foi possível resolver o endereço da imagem.");
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new ToolError("Endereços internos não são permitidos.");
  }
}

/** fetch que valida cada redirecionamento (até 3). */
async function safeFetch(url: string): Promise<Response> {
  let current = new URL(url);
  for (let i = 0; i < 4; i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    return res;
  }
  throw new ToolError("Redirecionamentos demais ao baixar a imagem.");
}

type JsonSchema = Record<string, unknown>;

interface ToolDef<S extends z.ZodTypeAny> {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
  /** Restringe a ferramenta a Dono/Admin. */
  adminOnly?: boolean;
  args: S;
  run: (args: z.infer<S>, ctx: ApiKeyContext) => Promise<unknown>;
}

function tool<S extends z.ZodTypeAny>(def: ToolDef<S>) {
  return def;
}

const PLATFORMS = [
  "TWITTER", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK",
  "YOUTUBE", "PINTEREST", "REDDIT", "BLUESKY", "THREADS",
] as const;
const POST_STATUSES = ["DRAFT", "PENDING", "SCHEDULED", "PUBLISHED", "FAILED"] as const;

function absoluteUrl(url: string) {
  return url.startsWith("/") ? `${getBaseUrl()}${url}` : url;
}

function serializePost(post: NonNullable<Awaited<ReturnType<typeof getPost>>>) {
  return {
    id: post.id,
    content: post.content,
    status: post.status,
    images: post.images.map(absoluteUrl),
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    errorMessage: post.errorMessage,
    createdAt: post.createdAt.toISOString(),
    accounts: post.socialAccounts.map((psa) => ({
      accountId: psa.socialAccountId,
      platform: psa.socialAccount.platform,
      name: psa.socialAccount.name,
      username: psa.socialAccount.username,
      status: psa.status,
      publishedAt: psa.publishedAt?.toISOString() ?? null,
      errorMessage: psa.errorMessage,
    })),
    variations: Object.fromEntries(post.variations.map((v) => [v.platform, v.content])),
  };
}

async function wrapPostError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof PostError) throw new ToolError(e.message);
    throw e;
  }
}

export const TOOLS = [
  // ── Workspace ───────────────────────────────────────────────────────────────
  tool({
    name: "get_workspace",
    title: "Ver workspace",
    description:
      "Mostra o workspace conectado: nome, seu papel, membros da equipe e um resumo (contas conectadas, posts agendados, mensagens não lidas). Use primeiro para se situar.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    args: z.object({}).passthrough(),
    run: async (_args, ctx) => {
      const ws = await db.workspace.findUnique({
        where: { id: ctx.workspaceId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      });
      if (!ws) throw new ToolError("Workspace não encontrado.");
      const [accounts, scheduled, unread] = await Promise.all([
        db.socialAccount.count({ where: { workspaceId: ws.id, isActive: true } }),
        db.post.count({ where: { workspaceId: ws.id, status: "SCHEDULED" } }),
        db.inboxItem.count({ where: { workspaceId: ws.id, isRead: false } }),
      ]);
      return {
        id: ws.id,
        name: ws.name,
        yourRole: ctx.role,
        now: new Date().toISOString(),
        owner: ws.owner,
        members: ws.members.map((m) => ({ ...m.user, role: m.role })),
        summary: { activeAccounts: accounts, scheduledPosts: scheduled, unreadInbox: unread },
      };
    },
  }),

  // ── Contas ──────────────────────────────────────────────────────────────────
  tool({
    name: "list_accounts",
    title: "Listar contas sociais",
    description:
      "Lista as contas de redes sociais conectadas ao workspace (id, rede, nome, @usuário, ativa). Use os ids retornados em create_post.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: PLATFORMS, description: "Filtra por rede (opcional)." },
        activeOnly: { type: "boolean", description: "Só contas ativas. Padrão: false." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    args: z.object({ platform: z.enum(PLATFORMS).optional(), activeOnly: z.boolean().optional() }),
    run: async (args, ctx) => {
      const accounts = await db.socialAccount.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(args.platform ? { platform: args.platform as Platform } : {}),
          ...(args.activeOnly ? { isActive: true } : {}),
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, platform: true, name: true, username: true, isActive: true, expiresAt: true, createdAt: true },
      });
      return { accounts };
    },
  }),

  tool({
    name: "set_account_active",
    title: "Ativar/desativar conta",
    description: "Ativa ou desativa uma conta social. Contas inativas não recebem publicações.",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        active: { type: "boolean" },
      },
      required: ["accountId", "active"],
      additionalProperties: false,
    },
    annotations: { idempotentHint: true },
    args: z.object({ accountId: z.string(), active: z.boolean() }),
    run: async (args, ctx) => {
      const acc = await db.socialAccount.findFirst({ where: { id: args.accountId, workspaceId: ctx.workspaceId } });
      if (!acc) throw new ToolError("Conta não encontrada.");
      await db.socialAccount.update({ where: { id: acc.id }, data: { isActive: args.active } });
      return { accountId: acc.id, isActive: args.active };
    },
  }),

  // ── Posts ───────────────────────────────────────────────────────────────────
  tool({
    name: "list_posts",
    title: "Listar posts",
    description:
      "Lista posts do workspace, do mais recente para o mais antigo. Filtre por status (DRAFT, PENDING, SCHEDULED, PUBLISHED, FAILED) e/ou período.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: POST_STATUSES },
        from: { type: "string", description: "Data inicial ISO 8601 (opcional)." },
        to: { type: "string", description: "Data final ISO 8601 (opcional)." },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Padrão: 20." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    args: z.object({
      status: z.enum(POST_STATUSES).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    run: async (args, ctx) => {
      const range =
        args.from || args.to
          ? { createdAt: { ...(args.from ? { gte: new Date(args.from) } : {}), ...(args.to ? { lte: new Date(args.to) } : {}) } }
          : {};
      const posts = await db.post.findMany({
        where: { workspaceId: ctx.workspaceId, ...(args.status ? { status: args.status as PostStatus } : {}), ...range },
        orderBy: { createdAt: "desc" },
        take: args.limit ?? 20,
        include: { socialAccounts: { include: { socialAccount: true } }, variations: true },
      });
      return { posts: posts.map(serializePost) };
    },
  }),

  tool({
    name: "get_post",
    title: "Ver post",
    description: "Detalhes de um post: texto, imagens, status geral e status em cada conta (com erro, se houver).",
    inputSchema: {
      type: "object",
      properties: { postId: { type: "string" } },
      required: ["postId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    args: z.object({ postId: z.string() }),
    run: async (args, ctx) => {
      const post = await getPost(ctx.workspaceId, args.postId);
      if (!post) throw new ToolError("Post não encontrado.");
      return serializePost(post);
    },
  }),

  tool({
    name: "create_post",
    title: "Criar post",
    description:
      "Cria um post em uma ou mais contas. mode: 'draft' (rascunho), 'now' (publica agora) ou 'schedule' (agenda; exige scheduledAt em ISO 8601 com fuso, ex.: 2026-12-01T09:00:00-03:00). Instagram exige pelo menos uma imagem; use upload_image_from_url para obter URLs de imagens.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Texto principal do post." },
        accountIds: { type: "array", items: { type: "string" }, minItems: 1, description: "Ids de list_accounts." },
        mode: { type: "string", enum: ["draft", "now", "schedule"] },
        scheduledAt: { type: "string", description: "Obrigatório quando mode = 'schedule'." },
        images: { type: "array", items: { type: "string" }, maxItems: 10, description: "URLs públicas das imagens." },
        variations: {
          type: "object",
          description: "Texto específico por rede. Chaves: TWITTER, INSTAGRAM, FACEBOOK, LINKEDIN, THREADS, BLUESKY...",
          additionalProperties: { type: "string" },
        },
      },
      required: ["content", "accountIds", "mode"],
      additionalProperties: false,
    },
    args: z.object({
      content: z.string().min(1),
      accountIds: z.array(z.string()).min(1),
      mode: z.enum(["draft", "now", "schedule"]),
      scheduledAt: z.string().optional(),
      images: z.array(z.string()).max(10).optional(),
      variations: z.record(z.string(), z.string()).optional(),
    }),
    run: async (args, ctx) =>
      wrapPostError(async () => {
        const status = args.mode === "draft" ? "DRAFT" : args.mode === "now" ? "PENDING" : "SCHEDULED";
        const post = await createPost(ctx.workspaceId, {
          content: args.content,
          accountIds: args.accountIds,
          status,
          scheduledAt: args.scheduledAt ?? null,
          images: args.images,
          variations: args.variations,
        });
        return serializePost(post);
      }),
  }),

  tool({
    name: "update_post",
    title: "Editar post",
    description:
      "Edita um post ainda não publicado: texto, imagens, data de agendamento ou modo (draft/now/schedule). O agendamento é atualizado automaticamente.",
    inputSchema: {
      type: "object",
      properties: {
        postId: { type: "string" },
        content: { type: "string" },
        mode: { type: "string", enum: ["draft", "now", "schedule"] },
        scheduledAt: { type: "string", description: "ISO 8601 com fuso." },
        images: { type: "array", items: { type: "string" }, maxItems: 10 },
      },
      required: ["postId"],
      additionalProperties: false,
    },
    args: z.object({
      postId: z.string(),
      content: z.string().min(1).optional(),
      mode: z.enum(["draft", "now", "schedule"]).optional(),
      scheduledAt: z.string().optional(),
      images: z.array(z.string()).max(10).optional(),
    }),
    run: async (args, ctx) =>
      wrapPostError(async () => {
        const status =
          args.mode === "draft" ? "DRAFT" : args.mode === "now" ? "PENDING" : args.mode === "schedule" ? "SCHEDULED" : undefined;
        const post = await updatePost(ctx.workspaceId, args.postId, {
          content: args.content,
          status,
          scheduledAt: args.scheduledAt,
          images: args.images,
        });
        return serializePost(post);
      }),
  }),

  tool({
    name: "retry_post",
    title: "Reenviar post com falha",
    description: "Tenta publicar de novo um post com status FAILED (só nas contas que falharam).",
    inputSchema: {
      type: "object",
      properties: { postId: { type: "string" } },
      required: ["postId"],
      additionalProperties: false,
    },
    args: z.object({ postId: z.string() }),
    run: async (args, ctx) =>
      wrapPostError(async () => serializePost(await updatePost(ctx.workspaceId, args.postId, { retry: true }))),
  }),

  tool({
    name: "delete_post",
    title: "Excluir post",
    description: "Exclui um post e cancela o agendamento. Não apaga o que já foi publicado nas redes.",
    inputSchema: {
      type: "object",
      properties: { postId: { type: "string" } },
      required: ["postId"],
      additionalProperties: false,
    },
    annotations: { destructiveHint: true },
    args: z.object({ postId: z.string() }),
    run: async (args, ctx) =>
      wrapPostError(async () => {
        await deletePost(ctx.workspaceId, args.postId);
        return { deleted: args.postId };
      }),
  }),

  tool({
    name: "upload_image_from_url",
    title: "Enviar imagem por URL",
    description:
      "Baixa uma imagem (JPG, PNG, GIF ou WEBP, até 10 MB) de uma URL e guarda no Mib Social. Retorna a URL para usar em create_post.images.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "URL http(s) da imagem." } },
      required: ["url"],
      additionalProperties: false,
    },
    args: z.object({ url: z.string().url() }),
    run: async (args) => {
      const res = await safeFetch(args.url);
      if (!res.ok) throw new ToolError(`Não foi possível baixar a imagem (${res.status}).`);
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!ALLOWED_TYPES[type]) throw new ToolError(`Tipo de arquivo não suportado: ${type || "desconhecido"}.`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > MAX_FILE_SIZE) throw new ToolError("Imagem maior que o limite permitido.");
      const url = await uploadFile(buffer, type);
      return { url: absoluteUrl(url) };
    },
  }),

  // ── Inbox ───────────────────────────────────────────────────────────────────
  tool({
    name: "list_inbox",
    title: "Ler Inbox",
    description: "Lista comentários, menções e mensagens recebidos nas contas conectadas, do mais recente para o mais antigo.",
    inputSchema: {
      type: "object",
      properties: {
        unreadOnly: { type: "boolean", description: "Só não lidas. Padrão: false." },
        platform: { type: "string", enum: PLATFORMS },
        type: { type: "string", enum: ["COMMENT", "MENTION", "MESSAGE"] },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Padrão: 30." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    args: z.object({
      unreadOnly: z.boolean().optional(),
      platform: z.enum(PLATFORMS).optional(),
      type: z.enum(["COMMENT", "MENTION", "MESSAGE"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    run: async (args, ctx) => {
      const items = await db.inboxItem.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          ...(args.unreadOnly ? { isRead: false } : {}),
          ...(args.platform ? { platform: args.platform as Platform } : {}),
          ...(args.type ? { type: args.type as InboxType } : {}),
        },
        orderBy: { receivedAt: "desc" },
        take: args.limit ?? 30,
        include: { socialAccount: { select: { name: true, username: true } } },
      });
      return {
        items: items.map((i) => ({
          id: i.id,
          type: i.type,
          platform: i.platform,
          account: i.socialAccount.username ?? i.socialAccount.name,
          author: i.authorUsername ?? i.authorName,
          text: i.text,
          postUrl: i.postUrl,
          isRead: i.isRead,
          receivedAt: i.receivedAt.toISOString(),
        })),
      };
    },
  }),

  tool({
    name: "mark_inbox_read",
    title: "Marcar Inbox como lida",
    description: "Marca itens da Inbox como lidos. Passe ids específicos ou all=true para marcar tudo.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
        all: { type: "boolean" },
      },
      additionalProperties: false,
    },
    annotations: { idempotentHint: true },
    args: z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() }),
    run: async (args, ctx) => {
      if (!args.all && !args.ids?.length) throw new ToolError("Informe ids ou all=true.");
      const { count } = await db.inboxItem.updateMany({
        where: { workspaceId: ctx.workspaceId, isRead: false, ...(args.all ? {} : { id: { in: args.ids } }) },
        data: { isRead: true },
      });
      return { markedAsRead: count };
    },
  }),

  tool({
    name: "sync_inbox",
    title: "Atualizar Inbox",
    description: "Busca agora novos comentários e menções nas redes conectadas.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    args: z.object({}).passthrough(),
    run: async (_args, ctx) => syncWorkspaceInbox(ctx.workspaceId),
  }),

  // ── Analytics ───────────────────────────────────────────────────────────────
  tool({
    name: "get_analytics",
    title: "Ver Analytics",
    description: "Resumo de desempenho: totais de posts publicados/falhos/agendados, taxa de sucesso e publicações por rede e por dia no período.",
    inputSchema: {
      type: "object",
      properties: { days: { type: "integer", minimum: 1, maximum: 365, description: "Período em dias. Padrão: 30." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    args: z.object({ days: z.number().int().min(1).max(365).optional() }),
    run: async (args, ctx) => {
      const days = args.days ?? 30;
      const since = new Date(Date.now() - days * 86_400_000);
      const wid = ctx.workspaceId;
      const [published, failed, scheduled, drafts, perAccount, perDay] = await Promise.all([
        db.post.count({ where: { workspaceId: wid, status: "PUBLISHED", publishedAt: { gte: since } } }),
        db.post.count({ where: { workspaceId: wid, status: "FAILED", createdAt: { gte: since } } }),
        db.post.count({ where: { workspaceId: wid, status: "SCHEDULED" } }),
        db.post.count({ where: { workspaceId: wid, status: "DRAFT" } }),
        db.postSocialAccount.findMany({
          where: { post: { workspaceId: wid }, status: { in: ["PUBLISHED", "FAILED"] }, OR: [{ publishedAt: { gte: since } }, { post: { createdAt: { gte: since } } }] },
          select: { status: true, socialAccount: { select: { platform: true } } },
        }),
        db.post.findMany({
          where: { workspaceId: wid, status: "PUBLISHED", publishedAt: { gte: since } },
          select: { publishedAt: true },
        }),
      ]);
      const byPlatform: Record<string, { published: number; failed: number }> = {};
      for (const p of perAccount) {
        const k = p.socialAccount.platform;
        byPlatform[k] ??= { published: 0, failed: 0 };
        if (p.status === "PUBLISHED") byPlatform[k].published++;
        else byPlatform[k].failed++;
      }
      const byDay: Record<string, number> = {};
      for (const p of perDay) {
        const k = p.publishedAt!.toISOString().slice(0, 10);
        byDay[k] = (byDay[k] ?? 0) + 1;
      }
      return {
        periodDays: days,
        published,
        failed,
        scheduledNow: scheduled,
        drafts,
        successRate: published + failed > 0 ? Math.round((published / (published + failed)) * 100) : null,
        byPlatform,
        publishedByDay: byDay,
      };
    },
  }),
];

export type McpTool = (typeof TOOLS)[number];

export async function callTool(name: string, rawArgs: unknown, ctx: ApiKeyContext) {
  const t = TOOLS.find((x) => x.name === name) as ToolDef<z.ZodTypeAny> | undefined;
  if (!t) throw new ToolError(`Ferramenta desconhecida: ${name}`);
  if (t.adminOnly && ctx.role === "MEMBER") throw new ToolError("Apenas dono ou admin podem usar esta ferramenta.");
  const parsed = t.args.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ToolError(`Parâmetros inválidos: ${issue?.path.join(".") || "entrada"} — ${issue?.message}`);
  }
  return t.run(parsed.data, ctx);
}
