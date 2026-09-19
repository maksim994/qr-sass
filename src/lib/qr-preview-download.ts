"use client";

import QRCodeStyling from "qr-code-styling";
import type { QrStyle } from "@/components/qr-designer";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";

export async function downloadQrPreview(data: string, style: QrStyle, format: "png" | "svg") {
  const qr = new QRCodeStyling(buildQrStylingOptions(data, style, 1200));
  await qr.download({ name: "qr-code", extension: format });
}

export async function downloadSavedQr(qrId: string, format: "png" | "svg") {
  const response = await fetch(`/api/qr/${encodeURIComponent(qrId)}/download?format=${format}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error("Не удалось скачать QR.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  link.href = url;
  link.download = match?.[1] ? decodeURIComponent(match[1]).replace(/["']/g, "") : `qr-code.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
