import type { QrStyle } from "@/components/qr-designer";

export const defaultQrStyle: QrStyle = {
  dotType: "square",
  dotColor: "#111111",
  bgColor: "#ffffff",
  bgTransparent: false,
  cornerSquareType: "square",
  cornerSquareColor: "#111111",
  cornerDotType: "square",
  cornerDotColor: "#111111",
  frameStyle: "none",
  frameColor: "#111111",
  frameText: "",
  logoUrl: "",
  logoFileId: "",
  logoScale: 0,
  logoMargin: 0,
  margin: 2,
  errorCorrectionLevel: "M",
};

export function parseStyleConfig(raw: Record<string, unknown> | null | undefined): QrStyle {
  if (!raw) return defaultQrStyle;

  const legacyForeground = typeof raw.foreground === "string" ? raw.foreground : undefined;
  const legacyBackground = typeof raw.background === "string" ? raw.background : undefined;

  return {
    dotType: (raw.dotType as QrStyle["dotType"]) ?? defaultQrStyle.dotType,
    dotColor: (raw.dotColor as string) ?? legacyForeground ?? defaultQrStyle.dotColor,
    dotGradient: raw.dotGradient as QrStyle["dotGradient"],
    bgColor: (raw.bgColor as string) ?? legacyBackground ?? defaultQrStyle.bgColor,
    bgTransparent: (raw.bgTransparent as boolean) ?? defaultQrStyle.bgTransparent,
    bgGradient: raw.bgGradient as QrStyle["bgGradient"],
    cornerSquareType:
      (raw.cornerSquareType as QrStyle["cornerSquareType"]) ?? defaultQrStyle.cornerSquareType,
    cornerSquareColor:
      (raw.cornerSquareColor as string) ?? legacyForeground ?? defaultQrStyle.cornerSquareColor,
    cornerDotType: (raw.cornerDotType as QrStyle["cornerDotType"]) ?? defaultQrStyle.cornerDotType,
    cornerDotColor:
      (raw.cornerDotColor as string) ?? legacyForeground ?? defaultQrStyle.cornerDotColor,
    frameStyle: (raw.frameStyle as string) ?? defaultQrStyle.frameStyle,
    frameColor: (raw.frameColor as string) ?? defaultQrStyle.frameColor,
    frameText: (raw.frameText as string) ?? defaultQrStyle.frameText,
    logoUrl: (raw.logoUrl as string) ?? defaultQrStyle.logoUrl,
    logoFileId: (raw.logoFileId as string) ?? defaultQrStyle.logoFileId,
    logoScale: typeof raw.logoScale === "number" ? raw.logoScale : defaultQrStyle.logoScale,
    logoMargin: typeof raw.logoMargin === "number" ? raw.logoMargin : defaultQrStyle.logoMargin,
    margin: typeof raw.margin === "number" ? raw.margin : defaultQrStyle.margin,
    errorCorrectionLevel:
      (raw.errorCorrectionLevel as QrStyle["errorCorrectionLevel"]) ?? defaultQrStyle.errorCorrectionLevel,
  };
}
