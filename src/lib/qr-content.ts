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

function escapeWifi(value: string) {
  return value.replace(/([\\;,:])/g, "\\$1");
}

export function encodeQrContent(type: QrContentType, payload: QrPayload): string {
  const s = (key: string) => (typeof payload[key] === "string" ? (payload[key] as string).trim() : "");

  switch (type) {
    case "URL":
      return s("url");
    case "TEXT":
      return s("text");
    case "EMAIL": {
      const email = s("email");
      if (!email) return "";
      const subject = s("subject");
      const body = s("body");
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (body) params.set("body", body);
      const query = params.toString();
      return query ? `mailto:${email}?${query}` : `mailto:${email}`;
    }
    case "PHONE": {
      const phone = s("phone");
      return phone ? `tel:${phone}` : "";
    }
    case "SMS": {
      const phone = s("phone");
      if (!phone) return "";
      const message = s("message");
      return message ? `smsto:${phone}:${message}` : `smsto:${phone}`;
    }
    case "WIFI": {
      const ssid = s("ssid");
      if (!ssid) return "";
      const encryption = s("encryption") || "WPA";
      const password = s("password");
      return `WIFI:T:${escapeWifi(encryption)};S:${escapeWifi(ssid)};P:${escapeWifi(password)};;`;
    }
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

    case "INSTAGRAM": {
      const username = s("username").replace(/^@/, "");
      return username ? `https://instagram.com/${username}` : "";
    }
    case "FACEBOOK":
      return s("pageUrl") || (s("username") ? `https://facebook.com/${s("username")}` : "");
    case "WHATSAPP": {
      const phone = s("phone").replace(/[^0-9+]/g, "");
      if (!phone) return "";
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
