import { QrContentType } from "@prisma/client";
import { needsHostedPage } from "@/lib/qr-content";

export function getQrPreviewData(
  contentType: QrContentType,
  payload: Record<string, unknown>,
  options?: {
    appUrl?: string;
    shortCode?: string | null;
    kind?: "STATIC" | "DYNAMIC";
  },
): string {
  const appUrl = options?.appUrl ?? "https://example.com";
  const { shortCode, kind } = options ?? {};

  if (shortCode && contentType === "VCARD") {
    return `${appUrl}/v/${shortCode}`;
  }

  if (shortCode && kind === "DYNAMIC") {
    return needsHostedPage(contentType)
      ? `${appUrl}/p/${shortCode}`
      : `${appUrl}/r/${shortCode}`;
  }

  const type = contentType;
  if (type === "URL") return String(payload.url || "https://example.com");
  if (type === "TEXT") return String(payload.text || "Hello");
  if (type === "PHONE") return `tel:${payload.phone || ""}`;
  if (type === "EMAIL") return `mailto:${payload.email || ""}`;
  if (type === "WIFI") return `WIFI:S:${payload.ssid || ""};T:WPA;P:${payload.password || ""};;`;
  if (type === "INSTAGRAM") {
    return `https://instagram.com/${String(payload.username || "example").replace(/^@/, "")}`;
  }
  if (type === "FACEBOOK") return String(payload.pageUrl || "https://facebook.com");
  if (type === "WHATSAPP") return `https://wa.me/${String(payload.phone || "")}`;
  return "https://example.com";
}
