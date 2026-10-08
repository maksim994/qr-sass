"use client";

import { useEffect, useRef } from "react";
import { METRIKA_READY_EVENT, trackGoal, type ProductGoal } from "@/lib/product-analytics";

/** Retry only the current page view on consent/init; never replay past actions. */
export function useProductPageGoal(goal: ProductGoal, source: string, contentType?: string) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const key = `${goal}:${source}:${contentType ?? ""}`;
    const send = () => {
      if (sent.current === key) return;
      if (trackGoal(goal, { source, ...(contentType ? { contentType } : {}) })) sent.current = key;
    };
    send();
    window.addEventListener(METRIKA_READY_EVENT, send);
    return () => window.removeEventListener(METRIKA_READY_EVENT, send);
  }, [goal, source, contentType]);
}
