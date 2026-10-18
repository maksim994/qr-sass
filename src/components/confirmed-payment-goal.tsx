"use client";
import { useEffect, useRef } from "react";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { readCookieChoice } from "@/lib/cookie-consent";
import { METRIKA_READY_EVENT, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
export function ConfirmedPaymentGoal({paymentId}:{paymentId:string}) {
  const busy=useRef(false);
  useEffect(()=>{
    const send=async()=>{
      if(busy.current || readCookieChoice()!=="accepted" || !document.documentElement.dataset.ymId)return;
      busy.current=true;
      try {const r=await fetchApi("/api/analytics/payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentId})});const p=await parseApiResponse<{payment:Record<string,unknown>|null}>(r);if(p.ok&&p.data?.payment)trackGoal(PRODUCT_GOALS.payment_succeeded,p.data.payment);}catch{/* A goal must not interrupt billing. */}
    };
    void send();window.addEventListener(METRIKA_READY_EVENT,send);return()=>window.removeEventListener(METRIKA_READY_EVENT,send);
  },[paymentId]);return null;
}
