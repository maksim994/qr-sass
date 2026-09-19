"use client";

import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import type { QrStyle } from "@/components/qr-designer";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";
import { workspaceFilePath } from "@/lib/workspace-file-path";

export function useQrStylingPreview(data: string, style: QrStyle, size = 280) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let objectUrl = "";

    async function paint(imageUrl: string) {
      if (cancelled || !container) return;
      container.replaceChildren();
      if (!data) return;
      const qr = new QRCodeStyling(buildQrStylingOptions(data, { ...style, logoUrl: imageUrl }, size));
      qr.append(container);
    }

    async function run() {
      if (!container) return;
      container.replaceChildren();
      if (!data) return;
      if (style.logoFileId && style.logoScale > 0) {
        const response = await fetch(workspaceFilePath(style.logoFileId), { credentials: "same-origin" });
        if (!response.ok || cancelled) return;
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        await paint(objectUrl);
        return;
      }
      await paint(style.logoUrl);
    }

    void run();

    return () => {
      cancelled = true;
      container.replaceChildren();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data, style, size]);

  return containerRef;
}
