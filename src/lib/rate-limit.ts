import { Redis } from "ioredis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getRedis() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  try {
    const u = new URL(url);
    return new Redis({
      host: u.hostname,
      port: Number(u.port) || 6379,
      password: u.password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  } catch {
    return new Redis({ host: "localhost", port: 6379, lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  }
}

const globalForRedisRL = globalThis as unknown as { redisRL: Redis | undefined };
const redis = globalForRedisRL.redisRL ?? getRedis();
if (process.env.NODE_ENV !== "production") globalForRedisRL.redisRL = redis;

interface RateLimitConfig {
  limit: number;
  window: number; // seconds
  prefix?: string;
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const { limit, window, prefix = "rl" } = config;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const key = `${prefix}:${ip}:${Math.floor(Date.now() / 1000 / window)}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, window);

    if (current > limit) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente em alguns instantes." },
        {
          status: 429,
          headers: {
            "Retry-After": String(window),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    return null; // allowed
  } catch {
    // Redis unavailable — fail open
    return null;
  }
}
