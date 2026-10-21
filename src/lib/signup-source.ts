/** First-touch data stays on our origin and is attached only to registration. */
export const FIRST_TOUCH_KEY = "qrs_first_touch";
export const FIRST_TOUCH_TTL = 30 * 86400000;
const LIMIT = 255;
export type SignupSource = {
  utmSource: string | null; utmMedium: string | null; utmCampaign: string | null;
  utmContent: string | null; utmTerm: string | null;
  clickId: string | null; clickIdType: "yclid" | "vkclid" | null;
  referrer: string | null; landingPath: string | null; firstTouchAt: string;
};
const clean = (v: unknown) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, LIMIT) || null : null;
export function sourceCaptureAllowed(path: string) {
  return !/^\/(r|p|v|g|preview|mini|admin|api|dashboard|login|forgot-password|reset-password|verify-email)(\/|$)/.test(path);
}
export function sourceReferrer(value: unknown, ownOrigin: string) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const own = new URL(ownOrigin);
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, "") === own.hostname.replace(/^www\./, "")) return null;
    return clean(`${url.host}${url.pathname}`);
  } catch { return null; }
}
export function normalizeSignupSource(raw: unknown, ownOrigin: string, now = Date.now()): SignupSource | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const at = typeof v.firstTouchAt === "string" ? Date.parse(v.firstTouchAt) : NaN;
  if (!Number.isFinite(at) || at > now || now - at >= FIRST_TOUCH_TTL) return null;
  const landing = clean(v.landingPath);
  const ref = clean(v.referrer);
  const clickIdType = v.clickIdType === "yclid" || v.clickIdType === "vkclid" ? v.clickIdType : null;
  return {
    utmSource: clean(v.utmSource), utmMedium: clean(v.utmMedium), utmCampaign: clean(v.utmCampaign),
    utmContent: clean(v.utmContent), utmTerm: clean(v.utmTerm),
    clickId: clickIdType ? clean(v.clickId) : null, clickIdType,
    referrer: ref ? sourceReferrer(/^https?:\/\//.test(ref) ? ref : `https://${ref}`, ownOrigin) : null,
    landingPath: landing?.startsWith("/") && !landing.startsWith("//") ? landing.split(/[?#]/)[0] : null,
    firstTouchAt: new Date(at).toISOString(),
  };
}
export function registrationSource(raw: unknown, request: Request, now = Date.now()): SignupSource {
  return normalizeSignupSource(raw, request.url, now) ?? {
    utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null,
    clickId: null, clickIdType: null, referrer: sourceReferrer(request.headers.get("referer"), request.url),
    landingPath: null, firstTouchAt: new Date(now).toISOString(),
  };
}
export function captureFirstTouch(now = Date.now()): SignupSource | null {
  if (typeof window === "undefined" || !sourceCaptureAllowed(window.location.pathname)) return null;
  try {
    let saved: unknown = null;
    try { saved = JSON.parse(window.localStorage.getItem(FIRST_TOUCH_KEY) ?? "null"); } catch { /* Replace a corrupted first-touch record. */ }
    const previous = normalizeSignupSource(saved, window.location.origin, now);
    if (previous) return previous;
    const params = new URL(window.location.href).searchParams;
    const clickIdType = params.get("yclid") ? "yclid" : params.get("vkclid") ? "vkclid" : null;
    const source: SignupSource = {
      utmSource: clean(params.get("utm_source")), utmMedium: clean(params.get("utm_medium")),
      utmCampaign: clean(params.get("utm_campaign")), utmContent: clean(params.get("utm_content")), utmTerm: clean(params.get("utm_term")),
      clickId: clickIdType ? clean(params.get(clickIdType)) : null, clickIdType,
      referrer: sourceReferrer(document.referrer, window.location.origin), landingPath: window.location.pathname.slice(0, LIMIT), firstTouchAt: new Date(now).toISOString(),
    };
    window.localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(source));
    return source;
  } catch { return null; }
}
export function readFirstTouch(): SignupSource | null {
  if (typeof window === "undefined") return null;
  try { return normalizeSignupSource(JSON.parse(window.localStorage.getItem(FIRST_TOUCH_KEY) ?? "null"), window.location.origin) ?? captureFirstTouch(); }
  catch { return captureFirstTouch(); }
}
export function signupSourceLabel(source: Pick<SignupSource, "utmSource" | "utmMedium" | "utmCampaign" | "referrer"> | null | undefined) {
  if (!source) return "нет данных";
  if (source.utmSource || source.utmMedium || source.utmCampaign) return [source.utmSource, source.utmMedium, source.utmCampaign].map(v => clean(v) ?? "—").join("/");
  if (source.referrer) return source.referrer.split("/")[0];
  return "прямой заход";
}
