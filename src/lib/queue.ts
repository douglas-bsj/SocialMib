import { Queue } from "bullmq";

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

let _queue: Queue | null = null;

function getQueue(): Queue {
  if (!_queue) {
    const connection = parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379");
    _queue = new Queue("post-publisher", {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return _queue;
}

export async function schedulePost(postId: string, scheduledAt: Date) {
  const queue = getQueue();
  const delay = scheduledAt.getTime() - Date.now();
  if (delay < 0) {
    await queue.add("publish", { postId }, { jobId: postId });
    return;
  }
  await queue.add("publish", { postId }, { jobId: postId, delay });
}

export async function cancelScheduledPost(postId: string) {
  const queue = getQueue();
  const job = await queue.getJob(postId);
  if (job) await job.remove();
}
