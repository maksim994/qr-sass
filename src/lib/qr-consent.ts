export const QR_CONSENT_COOKIE_PREFIX = "gdpr_qr_";

export function qrConsentCookieName(slug: string): string {
  return `${QR_CONSENT_COOKIE_PREFIX}${slug}`;
}

export function trackingConsentVersion(payload: Record<string, unknown>): number {
  return typeof payload.trackingConsentVersion === "number" && Number.isFinite(payload.trackingConsentVersion)
    ? payload.trackingConsentVersion
    : 0;
}

export function requiredConsentVersion(payload: Record<string, unknown>): number {
  const version = trackingConsentVersion(payload);
  if (payload.gdprRequired === true) return Math.max(version, 1);
  if (payload.trackingPixels && typeof payload.trackingPixels === "object") return Math.max(version, 1);
  return version;
}

export function hasQrConsent(cookieValue: string | undefined, version: number): boolean {
  if (version <= 0) return true;
  return cookieValue === String(version);
}

export function stampTrackingConsentVersion(
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const prevPixels = JSON.stringify(previous.trackingPixels ?? null);
  const nextPixels = JSON.stringify(next.trackingPixels ?? null);
  if (prevPixels === nextPixels) return next;
  const prevVersion = trackingConsentVersion(previous);
  return { ...next, trackingConsentVersion: prevVersion + 1 };
}
