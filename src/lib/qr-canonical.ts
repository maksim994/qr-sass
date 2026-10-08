import { QrContentType } from "@prisma/client";
import { encodeQrContent, needsHostedPage, type QrPayload } from "@/lib/qr-content";
import { prepareStaticQr } from "@/lib/static-qr";

export function canonicalQrData(input: {
  contentType: QrContentType;
  payload: QrPayload;
  kind: "STATIC" | "DYNAMIC";
  shortCode?: string | null;
  appUrl: string;
}): { data: string; ready: boolean; isDynamic: boolean } {
  if (input.kind === "STATIC" && input.payload.staticDirect === true) {
    const qr = prepareStaticQr(input.contentType, input.payload);
    return { data: qr.ok ? qr.data : "", ready: qr.ok, isDynamic: false };
  }
  const hosted = needsHostedPage(input.contentType);
  const vcardHosted = input.contentType === "VCARD";
  const isDynamic = input.kind === "DYNAMIC" || hosted || vcardHosted;
  const origin = input.appUrl.replace(/\/$/, "");

  if (isDynamic) {
    if (!input.shortCode) return { data: "", ready: false, isDynamic: true };
    if (vcardHosted) return { data: `${origin}/v/${input.shortCode}`, ready: true, isDynamic: true };
    if (hosted) return { data: `${origin}/p/${input.shortCode}`, ready: true, isDynamic: true };
    return { data: `${origin}/r/${input.shortCode}`, ready: true, isDynamic: true };
  }

  const data = encodeQrContent(input.contentType, input.payload);
  return { data, ready: Boolean(data), isDynamic: false };
}
