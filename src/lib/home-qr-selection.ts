export const HOME_QR_TYPE_EVENT = "qr-s:select-static-type";
export function staticQrLanding(type: string): string | undefined {
  return ({ URL: "/qr-po-ssylke", WIFI: "/qr-wifi", VCARD: "/qr-dlya-vizitki" } as Record<string, string>)[type];
}
export function selectHomeQrType(type: string) {
  window.dispatchEvent(new CustomEvent(HOME_QR_TYPE_EVENT, { detail: type }));
  document.getElementById("create-qr")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}

/** Existing dedicated SEO pages; creation and learning remain separate actions. */
export function qrTypeLanding(type: string): string | undefined {
  return staticQrLanding(type) ?? ({ PDF: "/qr-na-pdf", MENU: "/qr-menu", WHATSAPP: "/qr-dlya-whatsapp" } as Record<string, string>)[type];
}
