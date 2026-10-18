"use client";
import { usePublicOffer } from "@/components/public-offer-provider";
import { useId, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { COMMERCIAL, rubles } from "@/lib/commercial-config";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
export type UpgradePlace = "archive_limit" | "dynamic_limit" | "static_stats" | "team" | "api" | "billing" | "after_download";
export function UpgradePrompt({ place, onClose, trialUsed = false }: { place: UpgradePlace; onClose: () => void; trialUsed?: boolean }) {
  const {proPrice}=usePublicOffer();
  const ref = useRef<HTMLDialogElement>(null), title = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  const business = place === "team" || place === "api";
  const plan = business ? "business" : "pro";
  return <dialog ref={ref} aria-labelledby={title} onCancel={onClose} onClose={onClose} className="qrs-upgrade-dialog">
    <h2 id={title}>{place === "archive_limit" ? `В бесплатном архиве до ${COMMERCIAL.free.archive} кодов` : place === "dynamic_limit" ? "Бесплатные динамические коды уже использованы" : business ? "Эта возможность доступна на Бизнес" : "Сохраните возможности вашего QR"}</h2>
    <p>{business ? "Сравните возможности команды и API." : `На Про архив и динамические коды без лимита — ${rubles(proPrice)}/мес${trialUsed ? "." : ` или ${COMMERCIAL.trialDays} дней бесплатно, без карты.`}`}</p>
    <Button href={`/dashboard/billing?plan=${plan}`} onClick={() => trackGoal(PRODUCT_GOALS.upgrade_prompt_click, { place, plan })}>{business ? "Перейти на Бизнес" : trialUsed ? "Перейти на Про" : `Попробовать Про ${COMMERCIAL.trialDays} дней, без карты`}</Button>
    <Button variant="ghost" onClick={onClose}>Не сейчас</Button>
  </dialog>;
}
