"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { readCookieChoice } from "@/lib/cookie-consent";
import { METRIKA_READY_EVENT, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
export function OwnerOpenGoals(){
  const path=usePathname(),busy=useRef(false);
  useEffect(()=>{const send=async()=>{
    if(busy.current || readCookieChoice()!=="accepted" || !document.documentElement.dataset.ymId)return;
    busy.current=true;
    try{const r=await fetchApi("/api/analytics/owner-open",{method:"POST"});const p=await parseApiResponse<{events:{type:string}[]}>(r);if(p.ok)for(const event of p.data?.events??[])trackGoal(PRODUCT_GOALS.first_external_open,event);}catch{/* Optional analytics. */}finally{busy.current=false;}
  };void send();window.addEventListener(METRIKA_READY_EVENT,send);return()=>window.removeEventListener(METRIKA_READY_EVENT,send);},[path]);return null;
}
