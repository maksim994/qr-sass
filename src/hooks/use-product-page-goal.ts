"use client";
import { useEffect, useRef } from "react";
import { METRIKA_READY_EVENT, trackGoal, type ProductGoal } from "@/lib/product-analytics";
import { ADVERTISING_READY_EVENT, advertisingReady } from "@/lib/advertising-runtime";
import { isAnalyticsEnabled } from "@/lib/cookie-consent";
/** Each destination retries independently; one ready SDK cannot consume the other's view. */
export function useProductPageGoal(goal: ProductGoal, source: string, contentType?: string) {
  const sent = useRef(new Set<string>());
  useEffect(() => {
    const key = `${goal}:${source}:${contentType ?? ""}`;
    const send = () => {
      const params = { source, ...(contentType ? { contentType } : {}) };
      if (!sent.current.has(`${key}:ym`) && isAnalyticsEnabled() && document.documentElement.dataset.ymId && trackGoal(goal, params, { analytics: true, advertising: false })) sent.current.add(`${key}:ym`);
      if (!sent.current.has(`${key}:vk`) && advertisingReady() && trackGoal(goal, params, { analytics: false, advertising: true })) sent.current.add(`${key}:vk`);
    };
    send();
    const events = [METRIKA_READY_EVENT, ADVERTISING_READY_EVENT];
    events.forEach(event => window.addEventListener(event, send));
    return () => events.forEach(event => window.removeEventListener(event, send));
  }, [goal, source, contentType]);
}
