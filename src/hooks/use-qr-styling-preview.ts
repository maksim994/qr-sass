"use client";

import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import type { QrStyle } from "@/components/qr-designer";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";

export function useQrStylingPreview(data: string, style: QrStyle, size = 280) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    const qr = new QRCodeStyling(buildQrStylingOptions(data, style, size));
    qr.append(container);

    return () => {
      container.replaceChildren();
    };
  }, [data, style, size]);

  return containerRef;
}
