"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { setMetrikaCounterId } from "@/lib/product-analytics";

export function CookieBanner({ yandexMetrikaId }: { yandexMetrikaId?: string }) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShowBanner(true);
    } else if (consent === "accepted" && yandexMetrikaId) {
      loadYandexMetrika(yandexMetrikaId);
    }
  }, [yandexMetrikaId]);

  const loadYandexMetrika = (id: string) => {
    setMetrikaCounterId(id);
    if ((window as Window & { ym?: unknown }).ym) return;

    const code = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${id},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.innerHTML = code;
    document.head.appendChild(script);
  };

  const handleAccept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShowBanner(false);
    if (yandexMetrikaId) {
      loadYandexMetrika(yandexMetrikaId);
    }
  };

  const handleDecline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--surface-page)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="fk-container py-4 sm:py-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
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
