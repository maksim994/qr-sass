import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "qr-s.ru — Генератор QR-кодов",
    template: "%s | qr-s.ru",
  },
  description: "Создавайте статические и динамические QR-коды с аналитикой, кастомизацией и мгновенным скачиванием.",
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
