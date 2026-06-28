import QRCodeStyling from "qr-code-styling";
import { JSDOM } from "jsdom";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";
import { parseStyleConfig } from "@/lib/qr-style-config";

function resolveLogoUrl(logoUrl: string): string {
  if (!logoUrl) return "";
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://") || logoUrl.startsWith("data:")) {
    return logoUrl;
  }
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
}

function createStyledQr(content: string, styleRaw: Record<string, unknown>, size: number) {
  const style = parseStyleConfig(styleRaw);
  const logoUrl = resolveLogoUrl(style.logoUrl);
  const opts = buildQrStylingOptions(content, { ...style, logoUrl }, size);
  return new QRCodeStyling({
    ...opts,
    jsdom: JSDOM,
    type: "svg",
  });
}

async function styledSvgBuffer(content: string, styleRaw: Record<string, unknown>, size: number) {
  const qr = createStyledQr(content, styleRaw, size);
  const raw = await qr.getRawData("svg");
  if (!raw) throw new Error("Could not render styled QR SVG");
  if (Buffer.isBuffer(raw)) return raw;
  if (typeof Blob !== "undefined" && raw instanceof Blob) {
    return Buffer.from(await raw.arrayBuffer());
  }
  return Buffer.from(String(raw));
}

export async function renderStyledQrSvg(
  content: string,
  styleRaw: Record<string, unknown>,
  size = 1200,
) {
  const svg = await styledSvgBuffer(content, styleRaw, size);
  return svg.toString("utf8");
}

export async function renderStyledQrPng(
  content: string,
  styleRaw: Record<string, unknown>,
  size = 1200,
) {
  const svg = await styledSvgBuffer(content, styleRaw, size);
  return sharp(svg).png().toBuffer();
}

export async function renderStyledQrJpg(
  content: string,
  styleRaw: Record<string, unknown>,
  size = 1200,
) {
  const style = parseStyleConfig(styleRaw);
  const png = await renderStyledQrPng(content, styleRaw, size);
  return sharp(png)
    .flatten({ background: style.bgTransparent ? "#ffffff" : style.bgColor || "#ffffff" })
    .jpeg({ quality: 95 })
    .toBuffer();
}

export async function renderStyledQrPdf(
  content: string,
  styleRaw: Record<string, unknown>,
  size = 1200,
) {
  const png = await renderStyledQrPng(content, styleRaw, size);
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

export async function renderStyledQrEps(
  content: string,
  styleRaw: Record<string, unknown>,
  size = 1200,
) {
  const png = await renderStyledQrPng(content, styleRaw, size);
  const metadata = await sharp(png).metadata();
  const w = metadata.width ?? 300;
  const h = metadata.height ?? 300;
  const jpeg = await sharp(png)
    .flatten({ background: parseStyleConfig(styleRaw).bgColor || "#ffffff" })
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
%%Creator: QR-S.ru
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
