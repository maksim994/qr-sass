"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { setMetrikaCounterId } from "@/lib/product-analytics";

const listeners = new Set<() => void>();

function emitConsent() {
  listeners.forEach((listener) => listener());
}

function subscribeConsent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readConsent(): string {
  if (typeof window === "undefined") return "ssr";
  return localStorage.getItem("cookie_consent") ?? "none";
}

function loadYandexMetrika(id: string) {
  setMetrikaCounterId(id);
  if ((window as Window & { ym?: unknown }).ym) return;

  const code = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${id},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.innerHTML = code;
  document.head.appendChild(script);
}

export function CookieBanner({ yandexMetrikaId }: { yandexMetrikaId?: string }) {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => "ssr");
  const showBanner = consent === "none";

  useEffect(() => {
    document.documentElement.classList.toggle("has-cookie-banner", showBanner);
    return () => document.documentElement.classList.remove("has-cookie-banner");
  }, [showBanner]);

  useEffect(() => {
    if (consent !== "accepted" || !yandexMetrikaId) return;
    loadYandexMetrika(yandexMetrikaId);
  }, [consent, yandexMetrikaId]);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    emitConsent();
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "declined");
    emitConsent();
  };

  if (!showBanner) return null;

  return (
    <div
      className="qrs-cookie-banner"
      role="dialog"
      aria-label="Согласие на cookie"
    >
      <div className="fk-container py-3 sm:py-4">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm qrs-text-default">
            Мы используем файлы cookie для улучшения работы сайта и аналитики. Продолжая использовать сайт, вы соглашаетесь с нашей{" "}
            <Link href="/privacy-policy" className="hover:underline" style={{ color: "var(--color-primary)" }}>
              Политикой конфиденциальности
            </Link>
            .
          </p>
          <div className="flex shrink-0 gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={handleDecline}>
              Отклонить
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleAccept}>
              Принять
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
