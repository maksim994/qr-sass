"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSiteAnalyticsSurface } from "@/lib/analytics-policy";
import { fetchApi } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { startAdvertising, stopAdvertising, trackAdvertisingPageView } from "@/lib/advertising-runtime";
import { startMetrika, stopMetrika, trackMetrikaPageView } from "@/lib/metrika-runtime";
import { COOKIE_CHANGE_EVENT, COOKIE_SETTINGS_EVENT, acknowledgeCookieNotice, isAnalyticsEnabled, readCookieChoice, readCookieNotice, saveCookiePreferences, readAdvertisingChoice, isAdvertisingEnabled, syncAnalyticsOptOut } from "@/lib/cookie-consent";
function subscribe(listener: () => void) {
  window.addEventListener(COOKIE_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(COOKIE_CHANGE_EVENT, listener); window.removeEventListener("storage", listener); };
}
export function CookieBanner({ yandexMetrikaId }: { yandexMetrikaId?: string }) {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribe, readCookieChoice, () => "ssr" as const);
  const advertisingChoice = useSyncExternalStore(subscribe, readAdvertisingChoice, () => "ssr" as const);
  const [advertising, setAdvertising] = useState(true);
  const noticed = useSyncExternalStore(subscribe, readCookieNotice, () => true);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const banner = useRef<HTMLDivElement>(null);
  const revoking = useRef<Promise<unknown> | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const visible = isSiteAnalyticsSurface(pathname) && !noticed && choice !== "ssr" && !(choice === "declined" && advertisingChoice === "declined");
  useEffect(() => {
    const show = () => { setAnalytics(isAnalyticsEnabled()); setAdvertising(isAdvertisingEnabled()); setOpen(true); };
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
  useEffect(() => {
    if (advertisingChoice === "ssr") return;
    if (isSiteAnalyticsSurface(pathname) && isAdvertisingEnabled(advertisingChoice)) {
      startAdvertising(); trackAdvertisingPageView();
    } else if (stopAdvertising()) {
      // End SDK timers and event listeners; deleting code.js alone cannot do this.
      window.location.reload();
    }
  }, [advertisingChoice, pathname]);
  function save() {
    saveCookiePreferences(analytics, advertising);
    acknowledgeCookieNotice();
    close();
  }
  return <>
    {visible && <div ref={banner} className="qrs-cookie-banner qrs-public" role="region" aria-label="Уведомление о cookie">
      <div className="qrs-cookie-notice">
        <p>Мы используем cookie, Яндекс Метрику с Вебвизором и пиксель VK Рекламы. Аналитику и рекламу можно отключить в настройках. <Link href="/privacy-policy#section-4" className="underline">Подробнее в политике</Link>.</p>
        <div className="qrs-cookie-actions"><Button type="button" variant="secondary" onClick={() => { setAnalytics(isAnalyticsEnabled()); setAdvertising(isAdvertisingEnabled()); setOpen(true); }}>Настроить</Button><Button type="button" variant="primary" onClick={acknowledgeCookieNotice}>Понятно</Button></div>
      </div>
    </div>}
    <Modal className="qrs-public qrs-cookie-settings" open={open} onClose={close} title="Настройки cookie" size="sm" subtitle="Выберите, разрешать ли аналитику и рекламу на этом устройстве." footer={<><Button type="button" variant="secondary" onClick={close}>Отмена</Button><Button type="button" variant="primary" onClick={save}>Сохранить</Button></>}>
      <div className="qrs-cookie-category"><div><label htmlFor="cookie-necessary">Необходимые</label><p id="cookie-necessary-hint">Вход, сессия, оплата и сохранение настроек. Всегда включены.</p></div><label className="qrs-cookie-control" htmlFor="cookie-necessary"><input id="cookie-necessary" type="checkbox" role="switch" checked disabled aria-describedby="cookie-necessary-hint" /></label></div>
      <div className="qrs-cookie-category"><div><label htmlFor="cookie-analytics">Аналитика</label><p id="cookie-analytics-hint">Яндекс Метрика, Вебвизор и учёт партнёрских переходов. Можно отключить — сервис продолжит работать.</p></div><label className="qrs-cookie-control" htmlFor="cookie-analytics"><input id="cookie-analytics" type="checkbox" role="switch" checked={analytics} onChange={event => setAnalytics(event.target.checked)} aria-describedby="cookie-analytics-hint" /></label></div>
      <div className="qrs-cookie-category"><div><label htmlFor="cookie-advertising">Реклама</label><p id="cookie-advertising-hint">Пиксель VK Рекламы. Помогает оценивать рекламу и показывать её повторно. Отключается независимо от аналитики.</p></div><label className="qrs-cookie-control" htmlFor="cookie-advertising"><input id="cookie-advertising" type="checkbox" role="switch" checked={advertising} onChange={event => setAdvertising(event.target.checked)} aria-describedby="cookie-advertising-hint" /></label></div>
      {choice === "unavailable" && <p className="qrs-cookie-storage-hint" role="status">Браузер ограничивает доступ к настройкам. Аналитика может оставаться выключенной; сохранение между посещениями может быть недоступно.</p>}
      <p className="qrs-cookie-policy"><Link href="/privacy-policy#section-4" onClick={close}>Что собирает аналитика</Link></p>
    </Modal>
  </>;
}
