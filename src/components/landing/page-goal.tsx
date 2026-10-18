"use client";
import { useProductPageGoal } from "@/hooks/use-product-page-goal";
import { PRODUCT_GOALS } from "@/lib/product-analytics";
export function PricingPageGoal() { useProductPageGoal(PRODUCT_GOALS.pricing_viewed, "pricing"); return null; }
