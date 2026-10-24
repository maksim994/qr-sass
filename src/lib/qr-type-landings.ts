import type { QrContentType } from "@prisma/client";

/** SEO-лендинги для типов QR (slug без ведущего слэша). */
const TYPE_LANDING_SLUG: Partial<Record<QrContentType, string>> = {
  URL: "qr-po-ssylke",
  PDF: "qr-na-pdf",
  MENU: "qr-menu",
  WIFI: "qr-wifi",
  VCARD: "qr-dlya-vizitki",
  WHATSAPP: "qr-dlya-whatsapp",
};

export function getQrTypeLandingPath(type: string): string | null {
  const key = type.toUpperCase() as QrContentType;
  const slug = TYPE_LANDING_SLUG[key];
  return slug ? `/${slug}` : null;
}
