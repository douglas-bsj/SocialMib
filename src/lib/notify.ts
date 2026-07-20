import Redis from "ioredis";

export type NotificationEvent =
  | { type: "post_published"; postId: string; content: string; platforms: string[]; at: string }
  | { type: "post_failed"; postId: string; content: string; platforms: string[]; at: string }
  | { type: "inbox_new"; authorName: string; platform: string; text: string; at: string };

function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port) || 6379,
      password: u.password || undefined,
      maxRetriesPerRequest: null as null,
      lazyConnect: true,
    };
  } catch {
    return { host: "localhost", port: 6379, maxRetriesPerRequest: null as null, lazyConnect: true };
  }
}

const globalForRedis = globalThis as unknown as { _notifyPublisher: Redis | undefined };

function getPublisher(): Redis {
  if (!globalForRedis._notifyPublisher) {
    globalForRedis._notifyPublisher = new Redis(
      parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379")
    );
    globalForRedis._notifyPublisher.on("error", () => {});
  }
  return globalForRedis._notifyPublisher;
}

export async function publishNotification(userId: string, event: NotificationEvent) {
  try {
    await getPublisher().publish(`notify:${userId}`, JSON.stringify(event));
  } catch {
    // Fail silently — notifications are best-effort
  }
}
