"use client";

import { withQrFrame, frameEnabled } from "@/lib/qr-frame";
import { downloadQrFile } from "@/lib/download-qr-file";
import QRCodeStyling from "qr-code-styling";
import type { QrStyle } from "@/components/qr-designer";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";

export async function downloadQrPreview(data: string, style: QrStyle, format: "png" | "svg") {
  const qr = new QRCodeStyling(buildQrStylingOptions(data, style, 1200));
  if (!frameEnabled(style)) { await qr.download({ name: "qr-code", extension: format }); return; }
  const raw = await qr.getRawData("svg");
  if (!raw) throw new Error("QR render failed");
  const svg = withQrFrame(await (raw as Blob).text(), style, 1200);
  let blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  if (format === "png") {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1200;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(img, 0, 0);
      blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("PNG failed")),"image/png"));
    } finally { URL.revokeObjectURL(url); }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = `qr-code.${format}`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function downloadSavedQr(qrId: string, format: "png" | "svg") {
  await downloadQrFile(`/api/qr/${encodeURIComponent(qrId)}/download?format=${format}`);
}

/** Reuses the same QR renderer; no file contents or destinations leave the browser. */
export async function downloadQrA6Preview(data:string,style:QrStyle){
  const {qrA6Svg}=await import("@/lib/qr-a6");
  const qr=new QRCodeStyling(buildQrStylingOptions(data,style,1200));
  const raw=await qr.getRawData("svg");
  if(!raw)throw new Error("QR render failed");
  const blob=new Blob([qrA6Svg(await (raw as Blob).text())],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="qr-reviews-a6.svg";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
