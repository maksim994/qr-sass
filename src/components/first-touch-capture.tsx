"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureFirstTouch } from "@/lib/signup-source";
export function FirstTouchCapture() {
  const pathname = usePathname();
  useEffect(() => { captureFirstTouch(); }, [pathname]);
  return null;
}
