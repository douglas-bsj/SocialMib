import { db } from "./db";
import { schedulePost, cancelScheduledPost } from "./queue";
import type { Platform, PostStatus } from "@/generated/prisma/client";

/**
 * Regras de posts compartilhadas entre o site (rotas /api/posts) e a integração
 * com IAs (MCP), para os dois se comportarem exatamente igual.
 */

export class PostError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface CreatePostInput {
  content: string;
  accountIds: string[];
  /** DRAFT = rascunho; PENDING = publicar agora; SCHEDULED = agendar */
  status: "DRAFT" | "PENDING" | "SCHEDULED";
  scheduledAt?: string | Date | null;
  images?: string[];
  /** Texto específico por rede, ex.: { INSTAGRAM: "..." } */
  variations?: Record<string, string>;
}

const postInclude = {
  socialAccounts: { include: { socialAccount: true } },
  variations: true,
} as const;

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) throw new PostError("Data de agendamento inválida.");
  return d;
}

/** Coloca o post na fila conforme o status (agora ou na data agendada). */
async function enqueue(postId: string, status: PostStatus, scheduledAt: Date | null) {
  if (status === "PENDING") {
    await schedulePost(postId, new Date());
  } else if (status === "SCHEDULED" && scheduledAt) {
    await schedulePost(postId, scheduledAt);
  }
}

export async function createPost(workspaceId: string, input: CreatePostInput) {
  if (!input.content?.trim()) throw new PostError("O conteúdo do post não pode estar vazio.");
  if (!input.accountIds?.length) throw new PostError("Selecione pelo menos uma conta.");

  const scheduledAt = parseDate(input.scheduledAt);
  if (input.status === "SCHEDULED" && !scheduledAt) {
    throw new PostError("Informe a data e hora do agendamento.");
  }

  const accounts = await db.socialAccount.findMany({
    where: { id: { in: input.accountIds }, workspaceId },
    select: { id: true },
  });
  if (accounts.length !== new Set(input.accountIds).size) {
    throw new PostError("Uma ou mais contas não foram encontradas neste workspace.");
  }

  const post = await db.post.create({
    data: {
      content: input.content,
      status: input.status,
      scheduledAt,
      workspaceId,
      images: input.images ?? [],
      socialAccounts: {
        create: [...new Set(input.accountIds)].map((socialAccountId) => ({
          socialAccountId,
          status: "PENDING" as const,
        })),
      },
      variations: input.variations
        ? {
            create: Object.entries(input.variations)
              .filter(([, text]) => text?.trim())
              .map(([platform, text]) => ({ platform: platform.toUpperCase() as Platform, content: text })),
          }
        : undefined,
    },
    include: postInclude,
  });

  await enqueue(post.id, post.status, scheduledAt);
  return post;
}

export async function getPost(workspaceId: string, postId: string) {
  return db.post.findFirst({ where: { id: postId, workspaceId }, include: postInclude });
}

export interface UpdatePostInput {
  content?: string;
  status?: "DRAFT" | "PENDING" | "SCHEDULED";
  scheduledAt?: string | Date | null;
  images?: string[];
  /** Reenvia um post que falhou. */
  retry?: boolean;
}

export async function updatePost(workspaceId: string, postId: string, input: UpdatePostInput) {
  const post = await getPost(workspaceId, postId);
  if (!post) throw new PostError("Post não encontrado.", 404);
  if (post.status === "PUBLISHED") throw new PostError("Posts já publicados não podem ser editados.");

  const newStatus = input.retry ? "PENDING" : (input.status ?? post.status);
  const newScheduledAt =
    input.scheduledAt !== undefined ? parseDate(input.scheduledAt) : post.scheduledAt;
  if (newStatus === "SCHEDULED" && !newScheduledAt) {
    throw new PostError("Informe a data e hora do agendamento.");
  }

  const updated = await db.post.update({
    where: { id: postId },
    data: {
      content: input.content ?? post.content,
      status: newStatus,
      scheduledAt: newScheduledAt,
      images: input.images ?? post.images,
      ...(input.retry
        ? { failedAt: null, errorMessage: null }
        : {}),
    },
    include: postInclude,
  });

  if (input.retry) {
    await db.postSocialAccount.updateMany({
      where: { postId, status: "FAILED" },
      data: { status: "PENDING", errorMessage: null },
    });
  }

  // Sai da fila antiga e entra de novo com o horário/status atual.
  await cancelScheduledPost(postId).catch(() => {});
  await enqueue(postId, updated.status, updated.scheduledAt);

  return updated;
}

export async function deletePost(workspaceId: string, postId: string) {
  const post = await db.post.findFirst({ where: { id: postId, workspaceId }, select: { id: true } });
  if (!post) throw new PostError("Post não encontrado.", 404);
  await cancelScheduledPost(postId).catch(() => {});
  await db.post.delete({ where: { id: postId } });
}
