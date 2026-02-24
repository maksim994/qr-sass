import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { QrContentType } from "@prisma/client";

export type QrPayload = Record<string, unknown>;

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

export function encodeQrContent(type: QrContentType, payload: QrPayload): string {
  const s = (key: string) => (typeof payload[key] === "string" ? (payload[key] as string) : "");

  switch (type) {
    case "URL":
      return s("url");
    case "TEXT":
      return s("text");
    case "EMAIL":
      return `mailto:${s("email")}?subject=${encodeURIComponent(s("subject"))}&body=${encodeURIComponent(s("body"))}`;
    case "PHONE":
      return `tel:${s("phone")}`;
    case "SMS":
      return `smsto:${s("phone")}:${s("message")}`;
    case "WIFI":
      return `WIFI:T:${s("encryption") || "WPA"};S:${s("ssid")};P:${s("password")};;`;
    case "VCARD":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${s("lastName")};${s("firstName")}`,
        `FN:${s("firstName")} ${s("lastName")}`.trim(),
        s("organization") ? `ORG:${s("organization")}` : "",
        s("title") ? `TITLE:${s("title")}` : "",
        s("phone") ? `TEL:${s("phone")}` : "",
        s("email") ? `EMAIL:${s("email")}` : "",
        s("website") ? `URL:${s("website")}` : "",
        s("address") ? `ADR:;;${s("address")};;;;` : "",
        "END:VCARD",
      ].filter(Boolean).join("\n");
    case "LOCATION":
      return `geo:${s("latitude")},${s("longitude")}`;

    case "INSTAGRAM":
      return `https://instagram.com/${s("username").replace(/^@/, "")}`;
    case "FACEBOOK":
      return s("pageUrl") || `https://facebook.com/${s("username")}`;
    case "WHATSAPP": {
      const phone = s("phone").replace(/[^0-9+]/g, "");
      const msg = s("message");
      return `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
    }
    case "APP_STORE": {
      const ios = s("iosUrl");
      const android = s("androidUrl");
      return ios || android || s("url");
    }

    // Types that need a hosted landing page
    case "PDF":
    case "IMAGE":
    case "VIDEO":
    case "MP3":
    case "MENU":
    case "BUSINESS":
    case "LINK_LIST":
    case "COUPON":
    case "SOCIAL_LINKS":
      return "";

    default:
      return "";
  }
}

/** Returns true if this content type needs a hosted landing page instead of direct encoding */
export function needsHostedPage(type: QrContentType): boolean {
  return [
    "PDF", "IMAGE", "VIDEO", "MP3",
    "MENU", "BUSINESS", "LINK_LIST", "COUPON", "SOCIAL_LINKS",
  ].includes(type);
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
