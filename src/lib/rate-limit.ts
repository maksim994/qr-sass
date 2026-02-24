import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { getRedis } from "./redis";

type RateLimiter = RateLimiterMemory | RateLimiterRedis;

function createLimiter(keyPrefix: string, points: number, duration: number): RateLimiter {
  const redis = getRedis();
  if (redis) {
    return new RateLimiterRedis({
      storeClient: redis,
      keyPrefix,
      points,
      duration,
    });
  }
  return new RateLimiterMemory({
    keyPrefix,
    points,
    duration,
  });
}

export const loginRateLimiter = createLimiter("rl_login", 5, 60); // 5 attempts per minute
export const registerRateLimiter = createLimiter("rl_register", 3, 60); // 3 per minute
export const blogLikeRateLimiter = createLimiter("rl_blog_like", 10, 60); // 10 per minute per IP

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function consumeRateLimit(
  limiter: RateLimiter,
  key: string
): Promise<{ success: boolean; retryAfterMs?: number }> {
  try {
    await limiter.consume(key);
    return { success: true };
  } catch (rej) {
    const retryAfterMs = rej && typeof rej === "object" && "msBeforeNext" in rej
      ? (rej as { msBeforeNext: number }).msBeforeNext
      : undefined;
    return { success: false, retryAfterMs };
  }
}
