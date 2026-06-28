import { QrContentType } from "@prisma/client";

export type QrPayload = Record<string, unknown>;

const HOSTED_CONTENT_TYPES: QrContentType[] = [
  "PDF",
  "IMAGE",
  "VIDEO",
  "MP3",
  "MENU",
  "BUSINESS",
  "LINK_LIST",
  "COUPON",
  "SOCIAL_LINKS",
];

/** Returns true if this content type needs a hosted landing page instead of direct encoding */
export function needsHostedPage(type: QrContentType): boolean {
  return HOSTED_CONTENT_TYPES.includes(type);
}

export function encodeQrContent(type: QrContentType, payload: QrPayload): string {
  const s = (key: string) => (typeof payload[key] === "string" ? (payload[key] as string) : "");

  switch (type) {
    case "URL":
      return s("url");
    case "TEXT":
      return s("text");
    case "EMAIL":
      return `mailto:${s("email")}?subject=${encodeURIComponent(s("subject"))}&body=${encodeURIComponent(s("body"))}`;
    case "PHONE":
      return `tel:${s("phone")}`;
    case "SMS":
      return `smsto:${s("phone")}:${s("message")}`;
    case "WIFI":
      return `WIFI:T:${s("encryption") || "WPA"};S:${s("ssid")};P:${s("password")};;`;
    case "VCARD":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${s("lastName")};${s("firstName")}`,
        `FN:${s("firstName")} ${s("lastName")}`.trim(),
        s("organization") ? `ORG:${s("organization")}` : "",
        s("title") ? `TITLE:${s("title")}` : "",
        s("phone") ? `TEL:${s("phone")}` : "",
        s("email") ? `EMAIL:${s("email")}` : "",
        s("website") ? `URL:${s("website")}` : "",
        s("address") ? `ADR:;;${s("address")};;;;` : "",
        "END:VCARD",
      ].filter(Boolean).join("\n");
    case "LOCATION":
      return `geo:${s("latitude")},${s("longitude")}`;

    case "INSTAGRAM":
      return `https://instagram.com/${s("username").replace(/^@/, "")}`;
    case "FACEBOOK":
      return s("pageUrl") || `https://facebook.com/${s("username")}`;
    case "WHATSAPP": {
      const phone = s("phone").replace(/[^0-9+]/g, "");
      const msg = s("message");
      return `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
    }
    case "APP_STORE": {
      const ios = s("iosUrl");
      const android = s("androidUrl");
      return ios || android || s("url");
    }

    case "PDF":
    case "IMAGE":
    case "VIDEO":
    case "MP3":
    case "MENU":
    case "BUSINESS":
    case "LINK_LIST":
    case "COUPON":
    case "SOCIAL_LINKS":
      return "";

    default:
      return "";
  }
}
