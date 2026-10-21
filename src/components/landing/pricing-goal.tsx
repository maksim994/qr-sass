"use client";
import { useEffect } from "react";
import { METRIKA_READY_EVENT, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { ADVERTISING_READY_EVENT, advertisingReady } from "@/lib/advertising-runtime";
import { isAnalyticsEnabled } from "@/lib/cookie-consent";
/** A section view is counted only while pricing is actually visible. */
export function PricingGoal() {
  useEffect(() => {
    const section = document.getElementById("pricing");
    if (!section || typeof IntersectionObserver === "undefined") return;
    let visible = false, ymSent = false, vkSent = false;
    const send = () => {
      if (!visible) return;
      if (!ymSent && isAnalyticsEnabled() && document.documentElement.dataset.ymId) ymSent = trackGoal(PRODUCT_GOALS.pricing_viewed, { source: "home" }, { analytics: true, advertising: false });
      if (!vkSent && advertisingReady()) vkSent = trackGoal(PRODUCT_GOALS.pricing_viewed, { source: "home" }, { analytics: false, advertising: true });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; send(); }, { threshold: 0.1 });
    observer.observe(section);
    const events = [METRIKA_READY_EVENT, ADVERTISING_READY_EVENT];
    events.forEach(event => window.addEventListener(event, send));
    return () => { observer.disconnect(); events.forEach(event => window.removeEventListener(event, send)); };
  }, []);
  return null;
}
