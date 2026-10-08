"use client";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { COOKIE_CHANGE_EVENT, readCookieChoice } from "@/lib/cookie-consent";
import { LEGAL_VERSION } from "@/lib/legal-documents";
import { partnerCodeSchema } from "@/lib/partner-rules";

export function ReferralCapture() {
  const query = useSearchParams();
  const code = query.get("ref");
  const sent = useRef(new Set<string>());
  useEffect(() => {
    const parsed = partnerCodeSchema.safeParse(code);
    if (!parsed.success) return;
    const value = parsed.data;
    async function capture() {
      if (readCookieChoice() !== "accepted" || sent.current.has(value)) return;
      sent.current.add(value);
      try {
        const response = await fetchApi("/api/referrals/visit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: value, consent: true, consentVersion: LEGAL_VERSION }),
        });
        if (!response.ok) sent.current.delete(value);
        if (readCookieChoice() !== "accepted") await fetchApi("/api/analytics/revoke", { method: "POST" });
      } catch { sent.current.delete(value); }
    }
    void capture();
    window.addEventListener(COOKIE_CHANGE_EVENT, capture);
    return () => window.removeEventListener(COOKIE_CHANGE_EVENT, capture);
  }, [code]);
  return null;
}
