import { normalizeDraftUrl } from "@/lib/qr-draft";
export type LandingInputMode = "url" | "telegram" | "whatsapp";

/** Normalize only user-entered destinations; never fetch them or send form contents to analytics. */
export function landingDestination(raw: string, mode: LandingInputMode = "url", message = ""): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (mode === "telegram") {
    const input = value.startsWith("@") ? `https://t.me/${value.slice(1)}` : /^[\w]{5,32}$/.test(value) ? `https://t.me/${value}` : value;
    const url = normalizeDraftUrl(input);
    if (!url) return null;
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ["t.me", "telegram.me"].includes(parsed.hostname) && parsed.pathname !== "/" && !parsed.username && !parsed.password ? url : null;
  }
  if (mode === "whatsapp") {
    if (!/^\+?[\d ()-]+$/.test(value)) return null;
    const phone = value.replace(/\D/g, "");
    if (!/^[1-9]\d{6,14}$/.test(phone)) return null;
    return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  }
  return normalizeDraftUrl(value);
}
