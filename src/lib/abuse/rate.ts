import { abuseLimiterPair, consumeRateLimit, getClientIp } from '@/lib/rate-limit';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { getRedis } from '@/lib/redis';
import { env } from '@/lib/env';
import { apiError } from '@/lib/api-response';
import { MSG } from '@/lib/user-messages';
export const qrCreateRateLimiter = abuseLimiterPair('abuse_create', env.QR_CREATE_PER_HOUR);
export const qrCreateIpRateLimiter = abuseLimiterPair('abuse_create_ip', env.QR_CREATE_PER_IP_PER_HOUR);
export const qrUrlChangeRateLimiter = abuseLimiterPair('abuse_url', env.QR_URL_CHANGE_PER_HOUR);
export const qrUrlChangeUserRateLimiter = abuseLimiterPair('abuse_url_user', env.QR_URL_CHANGE_USER_PER_HOUR);
export const qrUrlChangeIpRateLimiter = abuseLimiterPair('abuse_url_ip', env.QR_URL_CHANGE_USER_PER_HOUR);
const redis = getRedis();
const limiter = (keyPrefix: string, points: number, duration: number) => redis ? new RateLimiterRedis({ storeClient: redis, keyPrefix, points, duration }) : new RateLimiterMemory({ keyPrefix, points, duration });
export const reportRateLimiter = limiter('abuse_report', env.ABUSE_REPORTS_PER_IP_PER_HOUR, 3600);
export const registerDailyRateLimiter = limiter('register_daily', env.REGISTER_PER_IP_PER_DAY, 86400);
export class AbuseError extends Error {
  status: number;
  retryAfterMs?: number;
  constructor(message: string, status = 403, retryAfterMs?: number) { super(message); this.status = status; this.retryAfterMs = retryAfterMs; }
}
export function abuseErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AbuseError)) return null;
  const res = apiError(error.message, error.status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN', error.status);
  if (error.status === 429) res.headers.set('Retry-After', String(Math.max(1, Math.ceil((error.retryAfterMs ?? 3600000) / 1000))));
  return res;
}
export async function enforceQrRate(input: { request: Request; key: string; paid: boolean; qrId?: string }) {
  const tier = input.paid ? 'paid' : 'free';
  const limits = input.qrId ? [[qrUrlChangeRateLimiter[tier], input.qrId], [qrUrlChangeUserRateLimiter[tier], input.key], [qrUrlChangeIpRateLimiter[tier], getClientIp(input.request)]] as const : [[qrCreateRateLimiter[tier], input.key], [qrCreateIpRateLimiter[tier], getClientIp(input.request)]] as const;
  for (const [limiter, key] of limits) {
    const result = await consumeRateLimit(limiter, key);
    if (!result.success) throw new AbuseError(MSG.TOO_MANY_REQUESTS, 429, result.retryAfterMs);
  }
}
