import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const target = new URL("/dashboard/billing", env.APP_URL);
  const orderId = input.get("Shp_order");
  if (orderId && /^[a-zA-Z0-9_-]{1,64}$/.test(orderId)) target.searchParams.set("paymentId", orderId);
  // ReturnURL is navigation only: it cannot confirm, cancel, or fulfill a payment.
  return NextResponse.redirect(target, 303);
}
