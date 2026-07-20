import "dotenv/config";
import { Worker } from "bullmq";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Redis } from "ioredis";
import { publish } from "../lib/publishers/index";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port) || 6379,
      password: u.password || undefined,
      maxRetriesPerRequest: null as null,
    };
  } catch {
    return { host: "localhost", port: 6379, maxRetriesPerRequest: null as null };
  }
}

const connection = parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379");

// Separate Redis client for pub/sub publishing
const notifyPublisher = new Redis(connection);
notifyPublisher.on("error", () => {});

async function publishNotification(userId: string, event: object) {
  try {
    await notifyPublisher.publish(`notify:${userId}`, JSON.stringify(event));
  } catch {
    // Best-effort — don't let notification failure break publishing
  }
}

const worker = new Worker(
  "post-publisher",
  async (job) => {
    const { postId } = job.data;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        socialAccounts: { include: { socialAccount: true } },
        variations: true,
        workspace: { select: { ownerId: true } },
      },
    });

    if (!post) {
      console.error(`Post ${postId} não encontrado`);
      return;
    }

    if (post.status === "PUBLISHED" || post.status === "FAILED") {
      console.log(`Post ${postId} já processado, ignorando`);
      return;
    }

    console.log(
      `Publicando post ${postId} em ${post.socialAccounts.length} conta(s)...`
    );

    const results = await Promise.allSettled(
      post.socialAccounts.map(async (psa) => {
        const { socialAccount } = psa;
        const variation = post.variations.find((v) => v.platform === socialAccount.platform);
        const content = variation?.content ?? post.content;
        const images: string[] = post.images ?? [];

        console.log(`  → ${socialAccount.platform} (@${socialAccount.username ?? socialAccount.name})`);

        try {
          await publish(
            socialAccount.platform,
            {
              accessToken: socialAccount.accessToken,
              refreshToken: socialAccount.refreshToken,
              username: socialAccount.username,
            },
            content,
            images
          );

          await prisma.postSocialAccount.update({
            where: {
              postId_socialAccountId: { postId, socialAccountId: socialAccount.id },
            },
            data: { status: "PUBLISHED", publishedAt: new Date() },
          });

          console.log(`  ✓ ${socialAccount.platform} publicado`);
          return { success: true, platform: socialAccount.platform };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido";

          console.error(`  ✗ ${socialAccount.platform}: ${errorMessage}`);

          await prisma.postSocialAccount.update({
            where: {
              postId_socialAccountId: { postId, socialAccountId: socialAccount.id },
            },
            data: { status: "FAILED", errorMessage },
          });
          throw error;
        }
      })
    );

    const allSucceeded = results.every((r) => r.status === "fulfilled");
    const anySucceeded = results.some((r) => r.status === "fulfilled");
    const finalStatus = anySucceeded ? "PUBLISHED" : "FAILED";

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: finalStatus,
        publishedAt: anySucceeded ? new Date() : undefined,
        failedAt: !anySucceeded ? new Date() : undefined,
      },
    });

    // Notify the workspace owner in real-time
    const ownerId = post.workspace.ownerId;
    const platforms = post.socialAccounts
      .filter((_, i) => results[i]?.status === (anySucceeded ? "fulfilled" : "rejected"))
      .map((psa) => psa.socialAccount.platform);

    await publishNotification(ownerId, {
      type: finalStatus === "PUBLISHED" ? "post_published" : "post_failed",
      postId,
      content: post.content,
      platforms: post.socialAccounts.map((psa) => psa.socialAccount.platform),
      at: new Date().toISOString(),
    });

    console.log(
      `Post ${postId} concluído. Sucesso: ${allSucceeded ? "todos" : anySucceeded ? "parcial" : "nenhum"}`
    );
  },
  { connection, concurrency: 5 }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} concluído`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} falhou:`, err.message);
});

console.log("Worker de publicação iniciado...");
