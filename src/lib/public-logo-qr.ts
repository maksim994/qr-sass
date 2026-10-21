import { defaultQrStyle } from "@/lib/qr-style-config";
import type { QrStyle } from "@/components/qr-designer";

/** New public logo codes only; saved/printed codes retain their existing styles. */
export function publicLogoQrStyle(logo: string, foreground = "#111111", background = "#ffffff"): QrStyle {
  return {
    ...defaultQrStyle,
    dotColor: foreground, cornerSquareColor: foreground, cornerDotColor: foreground,
    bgColor: background, margin: 4, quietZoneModules: 4,
    // The normalized PNG already includes its white padding. Extra pixel padding
    // would make the logo disproportionately small in the 320px preview.
    errorCorrectionLevel: "H", logoUrl: logo, logoScale: logo ? 0.18 : 0, logoMargin: 0,
  };
}
