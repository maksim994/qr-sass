import type { Metadata } from "next";
import React from "react";
import parse from "html-react-parser";
import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";

const baseUrl = process.env.APP_URL ?? "https://qr-s.ru";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "qr-s.ru — Генератор QR-кодов",
    template: "%s | qr-s.ru",
  },
  description: "Создавайте статические и динамические QR-коды с аналитикой, кастомизацией и мгновенным скачиванием.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: baseUrl,
    siteName: "qr-s.ru",
    title: "qr-s.ru — Генератор QR-кодов",
    description: "Создавайте статические и динамические QR-коды с аналитикой, кастомизацией и мгновенным скачиванием.",
  },
  twitter: {
    card: "summary_large_image",
    title: "qr-s.ru — Генератор QR-кодов",
    description: "Создавайте статические и динамические QR-коды с аналитикой, кастомизацией и мгновенным скачиванием.",
  },
};

function YandexMetrikaScript({ id }: { id: string }) {
  const code = `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${id},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;
  return (
    <>
      <script type="text/javascript" dangerouslySetInnerHTML={{ __html: code }} />
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  const headContent = [
    settings.yandexMetrikaId && (
      <YandexMetrikaScript key="ym" id={settings.yandexMetrikaId} />
    ),
    settings.customHeadCode && (
      <React.Fragment key="custom">
        {parse(
          settings.customHeadCode.replace(/>\s+</g, "><").trim()
        )}
      </React.Fragment>
    ),
  ].filter(Boolean);

  return (
    <html lang="ru">
      <head>{headContent}</head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
