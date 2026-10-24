import { trackAdvertisingGoal } from "@/lib/advertising-runtime";
import { isAnalyticsEnabled } from "@/lib/cookie-consent";
/** Client-side product funnel goals for Yandex Metrika reachGoal. */

export const PRODUCT_GOALS = {
  download_upsell_click: "download_upsell_click",
  scan_success: "scan_success",
  hero_cta_click: "hero_cta_click",
  hero_create_qr_click: "hero_create_qr_click",
  upgrade_prompt_click: "upgrade_prompt_click",
  payment_succeeded: "payment_succeeded",
  first_external_open: "first_external_open",
  static_qr_downloaded: "qr_downloaded",
  qr_creation_started: "qr_creation_started",
  trial_started: "trial_started",
  paid_feature_requested: "paid_feature_requested",
  qr_preview_downloaded: "qr_downloaded",
  qr_download_requested: "qr_download_requested",
  registration_completed: "registration_completed",
  qr_type_selected: "qr_type_selected",
  qr_created: "qr_created",
  dynamic_qr_created: "dynamic_enabled",
  qr_downloaded: "qr_downloaded",
  pricing_viewed: "pricing_view",
  checkout_started: "checkout_started",
  /** Do not fire from the widget. Payment is FunnelEvent payment_succeeded after SUCCEEDED. */
  subscription_paid: "subscription_paid",
  member_invited: "member_invited",
  api_key_created: "api_key_created",
} as const;

export const METRIKA_READY_EVENT = "qrs:metrika-ready";

export type ProductGoal = (typeof PRODUCT_GOALS)[keyof typeof PRODUCT_GOALS];

const ONBOARDING_DOWNLOADED_KEY = "qrs_onboarding_downloaded";
const ONBOARDING_DISMISSED_KEY = "qrs_onboarding_dismissed";

type YmWindow = Window & {
  ym?: (id: number | string, method: string, ...args: unknown[]) => void;
  __qrsYmId?: string;
};

function getMetrikaId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as YmWindow;
  return w.__qrsYmId || document.documentElement.dataset.ymId || undefined;
}

/** Call after Metrika script is initialized (analytics enabled). */
export function setMetrikaCounterId(id: string) {
  if (typeof window === "undefined") return;
  (window as YmWindow).__qrsYmId = id;
  document.documentElement.dataset.ymId = id;
}

/** Only fixed product dimensions reach Yandex. Content, URLs and identities are discarded. */
export function goalParams(params: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  const type = params.type ?? params.contentType;
  if (typeof type === "string" && /^[A-Z][A-Z0-9_]{1,23}$/.test(type)) out.type = type;
  const plan = params.plan ?? params.planId;
  if (typeof plan === "string" && /^(free|pro|business)$/i.test(plan)) out.plan = plan.toLowerCase();
  const sources: Record<string,string> = {home:"home",editor:"cabinet",library:"cabinet",billing:"cabinet",scenario:"landing",landing:"landing",pricing:"pricing"};
  const where = params.where ?? sources[String(params.source)];
  if (typeof where === "string" && ["home","hero","cabinet","landing","pricing"].includes(where)) out.where = where;
  if (typeof params.dynamic === "boolean") out.dynamic = params.dynamic;
  else if (params.kind === "DYNAMIC" || params.kind === "STATIC") out.dynamic = params.kind === "DYNAMIC";
  if (typeof params.format === "string" && ["png","svg","jpg","eps","pdf"].includes(params.format.toLowerCase())) {out.format=params.format.toLowerCase();out.frame=params.frame === true;}
  if (typeof params.place === "string" && ["archive_limit","dynamic_limit","static_stats","team","api","billing","after_download"].includes(params.place)) out.place=params.place;
  if (typeof params.method === "string" && ["email","yandex","telegram"].includes(params.method)) out.method=params.method;
  if (typeof params.revenue === "number" && Number.isFinite(params.revenue) && params.revenue>=0) {out.revenue=params.revenue;out.currency="RUB";}
  return out;
}
export function trackGoal(goal: ProductGoal, params?: Record<string, unknown>, providers: { analytics?: boolean; advertising?: boolean } = {}) {
  if (typeof window === "undefined") return false;
  const advertised = providers.advertising !== false && trackAdvertisingGoal(goal, params);
  if (goal === PRODUCT_GOALS.subscription_paid || providers.analytics === false || !isAnalyticsEnabled()) return advertised;
  const id = getMetrikaId();
  const ym = (window as YmWindow).ym;
  if (!id || typeof ym !== "function") return advertised;
  try {
    const safe = goalParams(params);
    if (Object.keys(safe).length > 0) {
      ym(id, "reachGoal", goal, safe);
    } else {
      ym(id, "reachGoal", goal);
    }
    return true;
  } catch {
    return advertised;
  }
}

export function markOnboardingDownloaded(params?: Record<string, unknown>, goal: ProductGoal = PRODUCT_GOALS.qr_downloaded) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_DOWNLOADED_KEY, "1");
  } catch {
    /* ignore */
  }
  trackGoal(goal, params);
}

export function hasOnboardingDownloaded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_DOWNLOADED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissOnboarding() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
