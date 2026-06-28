import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { encodeQrContent, needsHostedPage, type QrPayload } from "@/lib/qr-content";

export { encodeQrContent, needsHostedPage, type QrPayload };

export type QrStyleConfig = {
  foreground: string;
  background: string;
  margin: number;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
};

export const defaultStyle: QrStyleConfig = {
  foreground: "#111111",
  background: "#ffffff",
  margin: 2,
  errorCorrectionLevel: "M",
};

/** Maps stored styleConfig (legacy or designer format) to basic render options. */
export function normalizeRenderStyle(
  raw: Record<string, unknown> | null | undefined,
): QrStyleConfig {
  if (!raw) return defaultStyle;

  const foreground =
    typeof raw.foreground === "string"
      ? raw.foreground
      : typeof raw.dotColor === "string"
        ? raw.dotColor
        : defaultStyle.foreground;

  const background =
    typeof raw.background === "string"
      ? raw.background
      : raw.bgTransparent === true
        ? "#ffffff"
        : typeof raw.bgColor === "string"
          ? raw.bgColor
          : defaultStyle.background;

  const margin = typeof raw.margin === "number" ? raw.margin : defaultStyle.margin;

  const ecl = raw.errorCorrectionLevel;
  const errorCorrectionLevel =
    ecl === "L" || ecl === "M" || ecl === "Q" || ecl === "H" ? ecl : defaultStyle.errorCorrectionLevel;

  return { foreground, background, margin, errorCorrectionLevel };
}

export async function renderQrSvg(content: string, style: QrStyleConfig = defaultStyle) {
  return QRCode.toString(content, {
    type: "svg",
    color: {
      dark: style.foreground,
      light: style.background,
    },
    margin: style.margin,
    errorCorrectionLevel: style.errorCorrectionLevel,
  });
}

export async function renderQrPng(content: string, style: QrStyleConfig = defaultStyle) {
  const dataUrl = await QRCode.toDataURL(content, {
    color: {
      dark: style.foreground,
      light: style.background,
    },
    margin: style.margin,
    errorCorrectionLevel: style.errorCorrectionLevel,
    width: 1200,
  });

  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

export async function renderQrJpg(content: string, style: QrStyleConfig = defaultStyle) {
  const png = await renderQrPng(content, style);
  return sharp(png)
    .flatten({ background: style.background || "#ffffff" })
    .jpeg({ quality: 95 })
    .toBuffer();
}

export async function renderQrEps(content: string, style: QrStyleConfig = defaultStyle) {
  const png = await renderQrPng(content, style);
  const metadata = await sharp(png).metadata();
  const w = metadata.width ?? 300;
  const h = metadata.height ?? 300;
  const jpeg = await sharp(png)
    .flatten({ background: style.background || "#ffffff" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const hex = jpeg.toString("hex");
  const hexLines: string[] = [];
  for (let i = 0; i < hex.length; i += 76) {
    hexLines.push(hex.slice(i, i + 76));
  }
  const sizePt = 72;
  const eps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${sizePt} ${sizePt}
%%Creator: qr-s.ru
%%Title: QR Code
gsave
0 0 moveto ${sizePt} 0 lineto ${sizePt} ${sizePt} lineto 0 ${sizePt} lineto closepath clip
<<
  /ImageType 1
  /Width ${w}
  /Height ${h}
  /ImageMatrix [${sizePt} 0 0 -${sizePt} 0 ${sizePt}]
  /DataSource currentfile /HexDecode filter /DCTDecode filter
  /BitsPerComponent 8
  /Decode [0 1 0 1 0 1]
  /ColorSpace /DeviceRGB
>> image
${hexLines.join("\n")}
grestore
showpage
%%EOF`;
  return Buffer.from(eps, "utf-8");
}

export async function renderQrPdf(content: string, style: QrStyleConfig = defaultStyle) {
  const png = await renderQrPng(content, style);
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  const img = await doc.embedPng(png);
  const scale = Math.min(300 / img.width, 300 / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  page.drawImage(img, {
    x: (300 - w) / 2,
    y: (300 - h) / 2,
    width: w,
    height: h,
  });
  return Buffer.from(await doc.save());
}
