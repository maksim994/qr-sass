"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSiteAnalyticsSurface } from "@/lib/analytics-policy";
import { fetchApi } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { startMetrika, stopMetrika, trackMetrikaPageView } from "@/lib/metrika-runtime";
import { COOKIE_CHANGE_EVENT, COOKIE_SETTINGS_EVENT, acknowledgeCookieNotice, isAnalyticsEnabled, readCookieChoice, readCookieNotice, saveCookieChoice, syncAnalyticsOptOut } from "@/lib/cookie-consent";
function subscribe(listener: () => void) {
  window.addEventListener(COOKIE_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(COOKIE_CHANGE_EVENT, listener); window.removeEventListener("storage", listener); };
}
export function CookieBanner({ yandexMetrikaId }: { yandexMetrikaId?: string }) {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribe, readCookieChoice, () => "ssr" as const);
  const noticed = useSyncExternalStore(subscribe, readCookieNotice, () => true);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const banner = useRef<HTMLDivElement>(null);
  const revoking = useRef<Promise<unknown> | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const visible = isSiteAnalyticsSurface(pathname) && !noticed && choice !== "ssr" && choice !== "declined";
  useEffect(() => {
    const show = () => { setAnalytics(isAnalyticsEnabled()); setOpen(true); };
    window.addEventListener(COOKIE_SETTINGS_EVENT, show);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, show);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("has-cookie-banner", visible);
    const measure = () => document.documentElement.style.setProperty("--qrs-cookie-height", `${banner.current?.getBoundingClientRect().height ?? 0}px`);
    const observer = new ResizeObserver(measure);
    if (banner.current && visible) { observer.observe(banner.current); measure(); }
    return () => { observer.disconnect(); document.documentElement.classList.remove("has-cookie-banner"); document.documentElement.style.removeProperty("--qrs-cookie-height"); };
  }, [visible]);
  useEffect(() => {
    if (!isSiteAnalyticsSurface(pathname)) { if (stopMetrika()) window.location.reload(); return; }
    if (isAnalyticsEnabled(choice)) {
      revoking.current = null;
      if (yandexMetrikaId) { startMetrika(yandexMetrikaId); trackMetrikaPageView(yandexMetrikaId); }
      return;
    }
    if (choice === "ssr") return;
    if (choice === "declined") syncAnalyticsOptOut(true);
    const active = stopMetrika();
    if (!revoking.current) revoking.current = fetchApi("/api/analytics/revoke", { method: "POST", keepalive: true, signal: AbortSignal.timeout(1500) }).catch(() => undefined);
    if (active) void revoking.current.finally(() => window.location.reload());
  }, [choice, yandexMetrikaId, pathname]);
  function save() {
    saveCookieChoice(analytics ? "accepted" : "declined");
    acknowledgeCookieNotice();
    close();
  }
  return <>
    {visible && <div ref={banner} className="qrs-cookie-banner qrs-public" role="region" aria-label="Уведомление о cookie">
      <div className="fk-container py-3 sm:py-4"><div className="qrs-cookie-notice">
        <p>Мы используем cookie и Яндекс Метрику с Вебвизором. Аналитику можно отключить в настройках. <Link href="/privacy-policy#section-4" className="underline">Подробнее в политике</Link>.</p>
        <div className="qrs-cookie-actions"><Button type="button" variant="secondary" onClick={() => { setAnalytics(isAnalyticsEnabled()); setOpen(true); }}>Настроить</Button><Button type="button" variant="primary" onClick={acknowledgeCookieNotice}>Понятно</Button></div>
      </div></div>
    </div>}
    <Modal className="qrs-public qrs-cookie-settings" open={open} onClose={close} title="Настройки cookie" size="sm" subtitle="Выберите, разрешать ли аналитику на этом устройстве." footer={<><Button type="button" variant="secondary" onClick={close}>Отмена</Button><Button type="button" variant="primary" onClick={save}>Сохранить</Button></>}>
      <div className="qrs-cookie-category"><div><label htmlFor="cookie-necessary">Необходимые</label><p id="cookie-necessary-hint">Вход, сессия, оплата и сохранение настроек. Всегда включены.</p></div><label className="qrs-cookie-control" htmlFor="cookie-necessary"><input id="cookie-necessary" type="checkbox" role="switch" checked disabled aria-describedby="cookie-necessary-hint" /></label></div>
      <div className="qrs-cookie-category"><div><label htmlFor="cookie-analytics">Аналитика</label><p id="cookie-analytics-hint">Яндекс Метрика, Вебвизор и учёт партнёрских переходов. Можно отключить — сервис продолжит работать.</p></div><label className="qrs-cookie-control" htmlFor="cookie-analytics"><input id="cookie-analytics" type="checkbox" role="switch" checked={analytics} onChange={event => setAnalytics(event.target.checked)} aria-describedby="cookie-analytics-hint" /></label></div>
      {choice === "unavailable" && <p className="qrs-cookie-storage-hint" role="status">Браузер ограничивает доступ к настройкам. Аналитика может оставаться выключенной; сохранение между посещениями может быть недоступно.</p>}
      <p className="qrs-cookie-policy"><Link href="/privacy-policy#section-4" onClick={close}>Что собирает аналитика</Link></p>
    </Modal>
  </>;
}
