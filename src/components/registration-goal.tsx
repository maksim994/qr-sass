"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { isAnalyticsEnabled, COOKIE_CHANGE_EVENT } from "@/lib/cookie-consent";
import { advertisingReady, ADVERTISING_READY_EVENT } from "@/lib/advertising-runtime";
import { METRIKA_READY_EVENT, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
export function RegistrationGoal() {
  const pathname = usePathname();
  const busy = useRef(false);
  useEffect(() => {
    let retry = false;
    async function send() {
      const analytics = isAnalyticsEnabled() && !!document.documentElement.dataset.ymId;
      const advertising = advertisingReady();
      if (busy.current) { retry = true; return; }
      if (!analytics && !advertising) return;
      busy.current = true;
      try {
        const response = await fetchApi("/api/analytics/registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analytics, advertising }) });
        const parsed = await parseApiResponse<{ registration: boolean; vkRegistration: boolean; method?: string }>(response);
        if (parsed.ok && parsed.data) trackGoal(PRODUCT_GOALS.registration_completed, { method: parsed.data.method ?? "yandex" }, { analytics: parsed.data.registration, advertising: parsed.data.vkRegistration });
      } catch { /* Analytics must never interrupt navigation. */ }
      finally { busy.current = false; if (retry) { retry = false; void send(); } }
    }
    void send();
    const events = [METRIKA_READY_EVENT, ADVERTISING_READY_EVENT, COOKIE_CHANGE_EVENT];
    events.forEach(event => window.addEventListener(event, send));
    return () => events.forEach(event => window.removeEventListener(event, send));
  }, [pathname]);
  return null;
}
