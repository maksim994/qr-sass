import QRCodeStyling from "qr-code-styling";
import { JSDOM } from "jsdom";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { buildQrStylingOptions } from "@/lib/qr-styling-options";
import { parseStyleConfig } from "@/lib/qr-style-config";
import { getFileObject } from "@/lib/s3";
import { getDb } from "@/lib/db";
import { fetchPinnedHttp } from "@/lib/safe-egress";
import { workspaceFileIdFromPath } from "@/lib/workspace-file-path";

const LOGO_TIMEOUT_MS = 4000;
const LOGO_MAX_BYTES = 1_048_576;
const ERROR_CORRECTION_COVER: Record<string, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

function abortSignal() {
  return AbortSignal.timeout(LOGO_TIMEOUT_MS);
}

async function readLimited(response: Response): Promise<Buffer> {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > LOGO_MAX_BYTES) throw new Error("Логотип слишком большой.");
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > LOGO_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("Логотип слишком большой.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function jsdomWithImageSize(width: number, height: number) {
  return class LogoJSDOM extends JSDOM {
    constructor(html?: ConstructorParameters<typeof JSDOM>[0], options?: ConstructorParameters<typeof JSDOM>[1]) {
      super(html ?? "", options);
      class LogoImage {
        width = width;
        height = height;
        onload: (() => void) | null = null;
        onerror: ((err?: unknown) => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      }
      (this.window as unknown as { Image: typeof LogoImage }).Image = LogoImage;
    }
  };
}

function calculateHiddenImageSize(args: {
  originalHeight: number;
  originalWidth: number;
  maxHiddenDots: number;
  maxHiddenAxisDots: number;
  dotSize: number;
}) {
  const hideDots = { x: 0, y: 0 };
  const imageSize = { x: 0, y: 0 };
  const { originalHeight, originalWidth, maxHiddenDots, maxHiddenAxisDots, dotSize } = args;
  if (originalHeight <= 0 || originalWidth <= 0 || maxHiddenDots <= 0 || dotSize <= 0) {
    return { height: 0, width: 0, hideYDots: 0, hideXDots: 0 };
  }
  const k = originalHeight / originalWidth;
  hideDots.x = Math.floor(Math.sqrt(maxHiddenDots / k));
  if (hideDots.x <= 0) hideDots.x = 1;
  if (maxHiddenAxisDots < hideDots.x) hideDots.x = maxHiddenAxisDots;
  if (hideDots.x % 2 === 0) hideDots.x--;
  imageSize.x = hideDots.x * dotSize;
  hideDots.y = 1 + 2 * Math.ceil((hideDots.x * k - 1) / 2);
  imageSize.y = Math.round(imageSize.x * k);
  if (hideDots.y * hideDots.x > maxHiddenDots || maxHiddenAxisDots < hideDots.y) {
    if (maxHiddenAxisDots < hideDots.y) {
      hideDots.y = maxHiddenAxisDots;
      if (hideDots.y % 2 === 0) hideDots.x--;
    } else {
      hideDots.y -= 2;
    }
    imageSize.y = hideDots.y * dotSize;
    hideDots.x = 1 + 2 * Math.ceil((hideDots.y / k - 1) / 2);
    imageSize.x = Math.round(imageSize.y / k);
  }
  return { height: imageSize.y, width: imageSize.x, hideYDots: hideDots.y, hideXDots: hideDots.x };
}

/** Same placement as qr-code-styling 1.9.2 (module grid, ECC cover, floor rounding). */
export function logoPlacement(
  size: number,
  scale: number,
  margin: number,
  moduleCount = 29,
  options?: {
    imageWidth?: number;
    imageHeight?: number;
    qrMargin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  },
) {
  const qrMargin = options?.qrMargin ?? 0;
  const round = (value: number) => Math.floor(value);
  const minSize = Math.min(size, size) - qrMargin * 2;
  const dotSize = round(minSize / moduleCount);
  const xBeginning = round((size - moduleCount * dotSize) / 2);
  const coverLevel = (scale || 0.2) * (ERROR_CORRECTION_COVER[options?.errorCorrectionLevel ?? "H"] ?? 0.3);
  const maxHiddenDots = Math.floor(coverLevel * moduleCount * moduleCount);
  const drawn = calculateHiddenImageSize({
    originalWidth: options?.imageWidth ?? 8,
    originalHeight: options?.imageHeight ?? 8,
    maxHiddenDots,
    maxHiddenAxisDots: moduleCount - 14,
    dotSize,
  });
  const pad = Math.max(0, Math.round(margin));
  const box = drawn.width;
  const inner = box - pad * 2;
  const x = xBeginning + round(pad + (moduleCount * dotSize - drawn.width) / 2);
  return { box, inner, pad, x, logoX: x, y: xBeginning + round(pad + (moduleCount * dotSize - drawn.height) / 2) };
}

export function svgImageGeometry(svg: string): { x: string; y: string; width: string; height: string } | null {
  const tag = svg.match(/<image\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const attr = (name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1] ?? "";
  return { x: attr("x"), y: attr("y"), width: attr("width"), height: attr("height") };
}

async function loadLogoPng(styleRaw: Record<string, unknown>): Promise<Buffer> {
  const style = parseStyleConfig(styleRaw);
  const fileId = style.logoFileId || workspaceFileIdFromPath(style.logoUrl.trim());
  if (fileId) {
    const file = await getDb().uploadedFile.findFirst({
      where: { id: fileId },
      select: { key: true },
    });
    if (!file) throw new Error("Логотип не найден.");
    const object = await getFileObject(file.key);
    if (!object) throw new Error("Логотип не найден.");
    if (object.body.length > LOGO_MAX_BYTES) throw new Error("Логотип слишком большой.");
    return sharp(object.body).png().toBuffer();
  }

  const value = style.logoUrl.trim();
  if (!value) throw new Error("Логотип не указан.");
  if (/^(javascript|file|data:(?!image\/))/i.test(value)) {
    throw new Error("Недопустимый адрес логотипа.");
  }

  let bytes: Buffer;
  if (value.startsWith("data:image/")) {
    const comma = value.indexOf(",");
    if (comma < 0) throw new Error("Некорректный data URL логотипа.");
    bytes = Buffer.from(value.slice(comma + 1), "base64");
    if (bytes.length > LOGO_MAX_BYTES) throw new Error("Логотип слишком большой.");
  } else if (value.startsWith("http://") || value.startsWith("https://")) {
    const response = await fetchPinnedHttp(value, abortSignal(), LOGO_MAX_BYTES);
    if (!response.ok) throw new Error("Не удалось загрузить логотип.");
    bytes = await readLimited(response);
  } else {
    throw new Error("Логотип должен быть https, data:image или загруженный файл.");
  }

  return sharp(bytes).png().toBuffer();
}

async function createStyledQr(content: string, styleRaw: Record<string, unknown>, size: number) {
  const style = parseStyleConfig(styleRaw);
  let image = "";
  let imageWidth = 1;
  let imageHeight = 1;
  if ((style.logoUrl || style.logoFileId) && (style.logoScale ?? 0) > 0) {
    const png = await loadLogoPng(styleRaw);
    const meta = await sharp(png).metadata();
    imageWidth = meta.width || 1;
    imageHeight = meta.height || 1;
    image = `data:image/png;base64,${png.toString("base64")}`;
  }
  const opts = buildQrStylingOptions(content, { ...style, logoUrl: image }, size);
  return new QRCodeStyling({
    ...opts,
    jsdom: image ? jsdomWithImageSize(imageWidth, imageHeight) : JSDOM,
    type: "svg",
  });
}

async function styledSvgBuffer(content: string, styleRaw: Record<string, unknown>, size: number) {
  const qr = await createStyledQr(content, styleRaw, size);
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
  return (await styledSvgBuffer(content, styleRaw, size)).toString("utf8");
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
