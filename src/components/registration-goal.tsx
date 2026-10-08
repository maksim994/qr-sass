"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { readCookieChoice } from "@/lib/cookie-consent";
import { METRIKA_READY_EVENT, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

export function RegistrationGoal() {
  const pathname = usePathname();
  const busy = useRef(false);
  useEffect(() => {
    async function send() {
      if (busy.current || readCookieChoice() !== "accepted" || !document.documentElement.dataset.ymId) return;
      busy.current = true;
      try {
        const response = await fetchApi("/api/analytics/registration", { method: "POST" });
        const parsed = await parseApiResponse<{ registration: boolean }>(response);
        if (parsed.ok && parsed.data?.registration) trackGoal(PRODUCT_GOALS.registration_completed, { source: "yandex" });
      } catch { /* Analytics must never interrupt navigation. */ }
      finally { busy.current = false; }
    }
    void send();
    window.addEventListener(METRIKA_READY_EVENT, send);
    return () => window.removeEventListener(METRIKA_READY_EVENT, send);
  }, [pathname]);
  return null;
}
