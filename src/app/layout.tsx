import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
