"use client";

import { downloadQrFile } from "@/lib/download-qr-file";
import QRCodeStyling from "qr-code-styling";
import type { QrStyle } from "@/components/qr-designer";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";

export async function downloadQrPreview(data: string, style: QrStyle, format: "png" | "svg") {
  const qr = new QRCodeStyling(buildQrStylingOptions(data, style, 1200));
  await qr.download({ name: "qr-code", extension: format });
}

export async function downloadSavedQr(qrId: string, format: "png" | "svg") {
  await downloadQrFile(`/api/qr/${encodeURIComponent(qrId)}/download?format=${format}`);
}
