/** Client-side product funnel goals for Yandex Metrika reachGoal. */

export const PRODUCT_GOALS = {
  registration_completed: "registration_completed",
  qr_type_selected: "qr_type_selected",
  qr_created: "qr_created",
  dynamic_qr_created: "dynamic_qr_created",
  qr_downloaded: "qr_downloaded",
  pricing_viewed: "pricing_viewed",
  checkout_started: "checkout_started",
  subscription_paid: "subscription_paid",
  member_invited: "member_invited",
  api_key_created: "api_key_created",
} as const;

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

/** Call after Metrika script is initialized (cookie consent accepted). */
export function setMetrikaCounterId(id: string) {
  if (typeof window === "undefined") return;
  (window as YmWindow).__qrsYmId = id;
  document.documentElement.dataset.ymId = id;
}

export function trackGoal(goal: ProductGoal, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const id = getMetrikaId();
  const ym = (window as YmWindow).ym;
  if (!id || typeof ym !== "function") return;
  try {
    if (params && Object.keys(params).length > 0) {
      ym(id, "reachGoal", goal, params);
    } else {
      ym(id, "reachGoal", goal);
    }
  } catch {
    /* ignore analytics failures */
  }
}

export function markOnboardingDownloaded() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_DOWNLOADED_KEY, "1");
  } catch {
    /* ignore */
  }
  trackGoal(PRODUCT_GOALS.qr_downloaded);
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
