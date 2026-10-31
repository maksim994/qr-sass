import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
export function warnAbuseConfiguration() {
  const state = globalThis as typeof globalThis & { abuseConfigurationWarned?: boolean };
  if (env.ABUSE_CHECK_ENABLED && !env.YANDEX_SAFE_BROWSING_API_KEY && !(env.GOOGLE_WEB_RISK_ENABLED && env.GOOGLE_WEB_RISK_API_KEY) && !state.abuseConfigurationWarned) {
    state.abuseConfigurationWarned = true;
    logger.warn({ area: 'runtime', message: 'Abuse checks use local rules only; no reputation provider configured' });
  }
}
