import QRCode from "qrcode";
import type { QrStyle } from "@/components/qr-designer";

type GradientConfig = {
  type: "linear" | "radial";
  colorStops: { offset: number; color: string }[];
  rotation: number;
};

function buildGradient(
  gradient: { type: "linear" | "radial"; colors: [string, string]; rotation?: number },
): GradientConfig {
  return {
    type: gradient.type,
    colorStops: [
      { offset: 0, color: gradient.colors[0] },
      { offset: 1, color: gradient.colors[1] },
    ],
    rotation: gradient.rotation ?? 0,
  };
}

export function buildQrStylingOptions(data: string, style: QrStyle, size = 280) {
  const content = data || "https://example.com";
  // qr-code-styling 1.9.2 bundles qrcode-generator's Latin-1 byte writer.
  // Pass UTF-8 bytes at that boundary; keep stored content and ASCII grids unchanged.
  const unicode = /[^\x00-\x7f]/.test(content);
  const encoded = unicode
    ? Array.from(new TextEncoder().encode(content), (byte) => String.fromCharCode(byte)).join("")
    : content;
  const dotsOptions: {
    type: QrStyle["dotType"];
    color: string;
    gradient?: GradientConfig;
  } = {
    type: style.dotType,
    color: style.dotColor,
  };
  if (style.dotGradient) {
    dotsOptions.gradient = buildGradient(style.dotGradient);
  }

  const cornersSquareOptions: {
    type: QrStyle["cornerSquareType"];
    color: string;
    gradient?: GradientConfig;
  } = {
    type: style.cornerSquareType,
    color: style.cornerSquareColor,
  };

  const cornersDotOptions: {
    type: QrStyle["cornerDotType"];
    color: string;
    gradient?: GradientConfig;
  } = {
    type: style.cornerDotType,
    color: style.cornerDotColor,
  };

  const backgroundOptions: {
    color: string;
    gradient?: GradientConfig;
  } = {
    color: style.bgTransparent ? "transparent" : style.bgColor,
  };
  if (style.bgGradient && !style.bgTransparent) {
    backgroundOptions.gradient = buildGradient(style.bgGradient);
  }

  return {
    width: size,
    height: size,
    type: "svg" as const,
    data: encoded,
    margin: style.quietZoneModules
      ? Math.ceil(size * style.quietZoneModules / (QRCode.create(data || "https://example.com", { errorCorrectionLevel: style.errorCorrectionLevel }).modules.size + 2 * style.quietZoneModules))
      : style.margin,
    dotsOptions,
    cornersSquareOptions,
    cornersDotOptions,
    backgroundOptions,
    qrOptions: { errorCorrectionLevel: style.errorCorrectionLevel, ...(unicode ? { mode: "Byte" as const } : {}) },
    ...(style.logoUrl
      ? {
          image: style.logoUrl,
          imageOptions: {
            hideBackgroundDots: true,
            saveAsBlob: false,
            crossOrigin: "anonymous" as const,
            margin: style.logoMargin,
            imageSize: style.logoScale || 0.2,
          },
        }
      : {}),
  };
}
