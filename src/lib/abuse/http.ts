import { apiError } from '@/lib/api-response';
import { AbuseError } from '@/lib/abuse/rate';
export function abuseErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AbuseError)) return null;
  const res = apiError(error.message, error.status === 429 ? 'RATE_LIMITED' : 'FORBIDDEN', error.status);
  if (error.status === 429) res.headers.set('Retry-After', String(Math.max(1, Math.ceil((error.retryAfterMs ?? 3600000) / 1000))));
  return res;
}
