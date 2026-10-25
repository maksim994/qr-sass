import { createHmac } from 'node:crypto';
/** Shared analytics/report hash; raw reporter IP is never persisted. */
export function hashClientIp(ip: string): string | undefined {
  const secret = process.env.ANALYTICS_HASH_SECRET || process.env.JWT_SECRET;
  return secret ? createHmac('sha256', secret).update(ip).digest('hex') : undefined;
}
