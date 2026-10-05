"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { setMetrikaCounterId } from "@/lib/product-analytics";
import { COOKIE_CHANGE_EVENT, COOKIE_SETTINGS_EVENT, readCookieChoice, saveCookieChoice } from "@/lib/cookie-consent";

type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
type AnalyticsWindow = Window & { ym?: Ym; __qrsYmId?: string };
function subscribe(listener: () => void) {
  window.addEventListener(COOKIE_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(COOKIE_CHANGE_EVENT, listener); window.removeEventListener("storage", listener); };
}
function startMetrika(id: string) {
  if (!/^\d+$/.test(id)) return;
  const w = window as AnalyticsWindow;
  if (w.__qrsYmId === id) return;
  if (!w.ym) {
    const queue: Ym = (...args) => { (queue.a ??= []).push(args); };
    queue.l = Date.now(); w.ym = queue;
  }
  setMetrikaCounterId(id);
  const script = document.createElement("script");
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  script.async = true; script.dataset.qrsAnalytics = "true";
  document.head.appendChild(script);
  w.ym(id, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
}
function stopMetrika() {
  const w = window as AnalyticsWindow;
  if (!w.__qrsYmId) return false;
  try { w.ym?.(w.__qrsYmId, "destruct"); } catch { /* Reload below ends the third-party runtime. */ }
  delete w.__qrsYmId; delete document.documentElement.dataset.ymId;
  document.querySelectorAll("script[data-qrs-analytics]").forEach(s => s.remove());
  // Delete only analytics cookies accessible to this origin; never session/CSRF cookies.
  const domains = ["", window.location.hostname, `.${window.location.hostname}`];
  for (const pair of document.cookie.split(";")) {
    const name = pair.trim().split("=")[0];
    if (!name.startsWith("_ym_")) continue;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
  }
  return true;
}
export function CookieBanner({ yandexMetrikaId }: { yandexMetrikaId?: string }) {
  const consent = useSyncExternalStore(subscribe, readCookieChoice, () => "ssr" as const);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const visible = consent === "none" || open;
  useEffect(() => {
    const show = () => { setOpen(true); };
    window.addEventListener(COOKIE_SETTINGS_EVENT, show);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, show);
  }, []);
  useEffect(() => { if (open) dialog.current?.focus(); }, [open]);
  useEffect(() => {
    document.documentElement.classList.toggle("has-cookie-banner", visible);
    return () => document.documentElement.classList.remove("has-cookie-banner");
  }, [visible]);
  useEffect(() => {
    if (consent === "accepted" && yandexMetrikaId) startMetrika(yandexMetrikaId);
    else if (consent !== "ssr" && stopMetrika()) window.location.reload();
  }, [consent, yandexMetrikaId]);
  function choose(choice: "accepted" | "declined") { saveCookieChoice(choice); setOpen(false); }
  if (!visible) return null;
  return <div ref={dialog} tabIndex={-1} className="qrs-cookie-banner" role="region" aria-label="Настройки cookie">
    <div className="fk-container py-3 sm:py-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm qrs-text-default">
          Технические cookie нужны для входа и безопасности. Яндекс Метрика включается только с вашего разрешения, без записи сеансов Вебвизором. Выбор можно изменить в <Link href="/privacy-policy#cookie-settings" className="underline">настройках cookie</Link>.
        </p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => choose("declined")}>Только необходимые</Button>
          <Button type="button" variant="primary" size="sm" onClick={() => choose("accepted")}>Разрешить аналитику</Button>
          {open && consent !== "none" && <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Закрыть</Button>}
        </div>
      </div>
    </div>
  </div>;
}
