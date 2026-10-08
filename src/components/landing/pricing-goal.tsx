"use client";

import { useEffect } from "react";
import { METRIKA_READY_EVENT, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

/** A section view is counted only while pricing is actually visible. */
export function PricingGoal() {
  useEffect(() => {
    const section = document.getElementById("pricing");
    if (!section || typeof IntersectionObserver === "undefined") return;
    let visible = false;
    let sent = false;
    const send = () => {
      if (visible && !sent) sent = trackGoal(PRODUCT_GOALS.pricing_viewed, { source: "home" });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      send();
    }, { threshold: 0.1 });
    observer.observe(section);
    window.addEventListener(METRIKA_READY_EVENT, send);
    return () => { observer.disconnect(); window.removeEventListener(METRIKA_READY_EVENT, send); };
  }, []);
  return null;
}
