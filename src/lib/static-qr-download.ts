"use client";
import { downloadQrPreview } from "@/lib/qr-preview-download";
import { defaultQrStyle } from "@/lib/qr-style-config";

/** Shared renderer; all generation stays in the browser, including private contact/Wi-Fi data. */
export async function downloadStaticQr(data: string, foreground: string, background: string, format: "png" | "svg") {
  return downloadQrPreview(data, {
    ...defaultQrStyle, dotColor: foreground, cornerSquareColor: foreground,
    cornerDotColor: foreground, bgColor: background, margin: 4, quietZoneModules: 4,
  }, format);
}
