import { auth } from "@/lib/auth";
import Redis from "ioredis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const channel = `notify:${session.user.id}`;
  const encoder = new TextEncoder();

  let subscriber: Redis | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let controllerRef: ReadableStreamDefaultController | null = null;

  function send(controller: ReadableStreamDefaultController, data: string) {
    try {
      controller.enqueue(encoder.encode(data));
    } catch {
      // Controller closed — cleanup is handled in cancel()
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;

      try {
        subscriber = new Redis(parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379"));

        subscriber.on("error", () => {
          // Redis unavailable — keep connection open, just no events
        });

        subscriber.subscribe(channel, (err) => {
          if (err) return;
          // Send initial connected event
          send(controller, `data: ${JSON.stringify({ type: "connected" })}\n\n`);
        });

        subscriber.on("message", (_ch, message) => {
          send(controller, `data: ${message}\n\n`);
        });

        // Heartbeat to prevent proxy/load-balancer timeouts
        heartbeat = setInterval(() => {
          send(controller, ": ping\n\n");
        }, 25000);
      } catch {
        // Redis not available — stream stays open but silent
        send(controller, `data: ${JSON.stringify({ type: "connected" })}\n\n`);
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (subscriber) {
        subscriber.unsubscribe(channel).finally(() => subscriber!.disconnect());
      }
      controllerRef = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
