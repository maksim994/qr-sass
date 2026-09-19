import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { getRedis } from "./redis";

export { getClientIp } from "./client-ip";

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
export const forgotPasswordRateLimiter = createLimiter("rl_forgot", 5, 3600); // 5 per hour per IP
export const resetPasswordRateLimiter = createLimiter("rl_reset", 8, 3600);
export const blogLikeRateLimiter = createLimiter("rl_blog_like", 10, 60); // 10 per minute per IP
/** Public QR redirects — generous but protects against scrape/abuse. */
export const redirectRateLimiter = createLimiter("rl_redirect", 120, 60); // 120 / minute / IP
/** Password gate for protected QR — per IP+code. */
export const qrPasswordRateLimiter = createLimiter("rl_qr_pwd", 10, 600);

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
