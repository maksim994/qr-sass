import type { Metadata } from "next";
import React from "react";
import { Manrope } from "next/font/google";
import parse from "html-react-parser";
import "./globals.css";
import { getSiteSettings } from "@/lib/site-settings";
import { CookieBanner } from "@/components/cookie-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeScript } from "@/components/theme-script";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  const headContent = [
    settings.faviconUrl && (
      <React.Fragment key="favicon">
        <link rel="icon" href={settings.faviconUrl} />
        <link rel="apple-touch-icon" href={settings.faviconUrl} />
      </React.Fragment>
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
    <html lang="ru" className={manrope.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
        {headContent}
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <CookieBanner yandexMetrikaId={settings.yandexMetrikaId || undefined} />
        </ThemeProvider>
      </body>
    </html>
  );
}
