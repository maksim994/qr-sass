/** Collection policy marker, not evidence of an explicit consent click. */
export const ANALYTICS_POLICY_VERSION = "opt-out:2026-10-21.3";
export const ANALYTICS_OPTOUT_COOKIE = "qrs_analytics_disabled";
export const COOKIE_NOTICE_VERSION = "2026-10-21.3";

/** Hosted customer QR pages retain their own separate pixel/consent system. */
export function isSiteAnalyticsSurface(path: string) {
  if (/^\/dashboard\/api-keys(?:\/|$)/.test(path)) return false;
  return !/^\/(r|p|v|g|preview|mini|admin|api|login|forgot-password|reset-password|verify-email)(\/|$)/.test(path);
}
