import QRCode from "qrcode";
import { encodeQrContent } from "@/lib/qr-content";
import { isSafeUrl } from "@/lib/url";
import { MSG } from "@/lib/user-messages";

export const STATIC_QR_TYPES = ["URL", "TEXT", "WIFI", "VCARD", "EMAIL", "PHONE", "SMS", "LOCATION"] as const;
export type StaticQrType = typeof STATIC_QR_TYPES[number];
export const STATIC_QR_MAX_BYTES = 2000;

/** This variant is opt-in for NEW records. Legacy server-hosted vCards stay intact. */
export function isDirectStaticVcard(kind: string, type: string, payload: Record<string, unknown>) {
  return kind === "STATIC" && type === "VCARD" && payload.staticDirect === true;
}

export function prepareStaticQr(type: string, raw: Record<string, unknown>):
  { ok: true; payload: Record<string, string | boolean>; data: string } | { ok: false; error: string } {
  if (!STATIC_QR_TYPES.includes(type as StaticQrType)) return { ok: false, error: MSG.INVALID_PAYLOAD };
  const value = (key: string) => typeof raw[key] === "string" ? raw[key].trim() : "";
  const payload: Record<string, string | boolean> = {};
  const fields: Record<StaticQrType, string[]> = {
    URL: ["url"], TEXT: ["text"], WIFI: ["ssid", "password", "encryption"],
    VCARD: ["firstName", "lastName", "organization", "title", "phone", "email", "website", "address"],
    EMAIL: ["email", "subject", "body"], PHONE: ["phone"], SMS: ["phone", "message"], LOCATION: ["latitude", "longitude"],
  };
  for (const key of fields[type as StaticQrType]) {
    // Wi-Fi passwords and SSIDs can intentionally start/end with spaces.
    const text = type === "WIFI" && key !== "encryption" && typeof raw[key] === "string" ? raw[key] as string : value(key);
    if (text.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return { ok: false, error: MSG.INVALID_PAYLOAD };
    payload[key] = text;
  }
  if (type === "URL") {
    const text = value("url");
    const url = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text) ? text : `https://${text}`;
    if (!text || url.length > 2000 || !isSafeUrl(url)) return { ok: false, error: MSG.INVALID_PAYLOAD_URL };
    payload.url = url;
  }
  if (type === "TEXT" && !value("text")) return { ok: false, error: MSG.INVALID_PAYLOAD };
  if ((type === "EMAIL" || (type === "VCARD" && value("email"))) && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value("email"))) return { ok: false, error: MSG.INVALID_PAYLOAD };
  if (["PHONE", "SMS"].includes(type) && !/^\+?[\d ().-]{3,40}$/.test(value("phone"))) return { ok: false, error: MSG.INVALID_PAYLOAD };
  if (type === "WIFI") {
    if (!String(payload.ssid) || /[\r\n]/.test(String(payload.ssid) + String(payload.password))) return { ok: false, error: MSG.INVALID_PAYLOAD };
    payload.encryption = value("encryption") || "WPA";
    if (!["WPA", "WEP", "nopass"].includes(String(payload.encryption))) return { ok: false, error: MSG.INVALID_PAYLOAD };
    if (payload.encryption === "nopass") payload.password = "";
  }
  if (type === "LOCATION") {
    const lat = Number(value("latitude")), lng = Number(value("longitude"));
    if (!value("latitude") || !value("longitude") || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, error: MSG.INVALID_PAYLOAD };
    payload.latitude = String(lat); payload.longitude = String(lng);
  }
  let data: string;
  if (type === "VCARD") {
    if (!["firstName", "lastName", "organization", "phone", "email"].some(key => value(key))) return { ok: false, error: MSG.INVALID_PAYLOAD };
    if (value("website") && !isSafeUrl(value("website"))) return { ok: false, error: MSG.INVALID_PAYLOAD_URL };
    const escape = (key: string) => value(key).replace(/\\/g, "\\\\").replace(/\r?\n|\r/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
    data = ["BEGIN:VCARD", "VERSION:3.0", `N:${escape("lastName")};${escape("firstName")};;;`, `FN:${escape("firstName")} ${escape("lastName")}`.trim(),
      ...[["ORG", "organization"], ["TITLE", "title"], ["TEL", "phone"], ["EMAIL", "email"], ["URL", "website"]].flatMap(([field, key]) => value(key) ? [`${field}:${escape(key)}`] : []),
      ...(value("address") ? [`ADR:;;${escape("address")};;;;`] : []), "END:VCARD"].join("\r\n");
    payload.staticDirect = true;
  } else if (type === "WIFI") {
    const escape = (text: string) => text.replace(/([\\;,:])/g, "\\$1").replace(/\r|\n/g, "");
    data = `WIFI:T:${payload.encryption};S:${escape(String(payload.ssid))};P:${escape(String(payload.password))};;`;
  } else {
    data = encodeQrContent(type as StaticQrType, payload);
  }
  if (!data || new TextEncoder().encode(data).length > STATIC_QR_MAX_BYTES) return { ok: false, error: MSG.COULD_NOT_ENCODE_PAYLOAD };
  try { QRCode.create(data, { errorCorrectionLevel: "M" }); } catch { return { ok: false, error: MSG.COULD_NOT_ENCODE_PAYLOAD }; }
  payload.staticDirect = true;
  return { ok: true, data, payload };
}
