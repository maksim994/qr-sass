"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    if ((window as any).ym) return; // Already loaded

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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-slate-600">
          Мы используем файлы cookie для улучшения работы сайта и аналитики. Продолжая использовать сайт, вы соглашаетесь с нашей{" "}
          <Link href="/privacy-policy" className="text-blue-600 hover:underline">
            Политикой конфиденциальности
          </Link>.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={handleDecline}
            className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 btn btn-secondary"
          >
            Отклонить
          </button>
          <button
            onClick={handleAccept}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 btn btn-primary"
          >
            Принять
          </button>
        </div>
      </div>
    </div>
  );
}
