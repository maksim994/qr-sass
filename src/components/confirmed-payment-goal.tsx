"use client";
import { useEffect, useRef } from "react";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { isAnalyticsEnabled, COOKIE_CHANGE_EVENT } from "@/lib/cookie-consent";
import { advertisingReady, ADVERTISING_READY_EVENT } from "@/lib/advertising-runtime";
import { METRIKA_READY_EVENT, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
export function ConfirmedPaymentGoal({ paymentId }: { paymentId: string }) {
  const busy = useRef(false);
  useEffect(() => {
    let retry = false;
    const send = async () => {
      const analytics = isAnalyticsEnabled() && !!document.documentElement.dataset.ymId;
      const advertising = advertisingReady();
      if (busy.current) { retry = true; return; }
      if (!analytics && !advertising) return;
      busy.current = true;
      try {
        const r = await fetchApi("/api/analytics/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId, analytics, advertising }) });
        const p = await parseApiResponse<{ payment: Record<string, unknown> | null; analytics: boolean; advertising: boolean }>(r);
        if (p.ok && p.data?.payment) trackGoal(PRODUCT_GOALS.payment_succeeded, p.data.payment, { analytics: p.data.analytics, advertising: p.data.advertising });
      } catch { /* A goal must not interrupt billing. */ }
      finally { busy.current = false; if (retry) { retry = false; void send(); } }
    };
    void send();
    const events = [METRIKA_READY_EVENT, ADVERTISING_READY_EVENT, COOKIE_CHANGE_EVENT];
    events.forEach(event => window.addEventListener(event, send));
    return () => events.forEach(event => window.removeEventListener(event, send));
  }, [paymentId]);
  return null;
}
