"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import type { UpgradePlace } from "./upgrade-prompt";
export function UpgradeLink({place,plan="pro",...props}:ComponentProps<typeof Link>&{place:UpgradePlace;plan?:string}){return <Link {...props} onClick={event=>{trackGoal(PRODUCT_GOALS.upgrade_prompt_click,{place,plan});props.onClick?.(event);}}/>;}
