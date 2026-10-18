"use client";
import { downloadQrPreview } from "@/lib/qr-preview-download";
import type { FrameConfig } from "@/lib/qr-frame";
import { defaultQrStyle } from "@/lib/qr-style-config";

/** Shared renderer; all generation stays in the browser, including private contact/Wi-Fi data. */
export async function downloadStaticQr(data: string, foreground: string, background: string, format: "png" | "svg", frame: FrameConfig = {}) {
  return downloadQrPreview(data, {
    ...defaultQrStyle, ...frame, dotColor: foreground, cornerSquareColor: foreground,
    cornerDotColor: foreground, bgColor: background, margin: 4, quietZoneModules: 4,
  }, format);
}
