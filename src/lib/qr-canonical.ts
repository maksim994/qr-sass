import { QrContentType } from "@prisma/client";
import { encodeQrContent, needsHostedPage, type QrPayload } from "@/lib/qr-content";

export function canonicalQrData(input: {
  contentType: QrContentType;
  payload: QrPayload;
  kind: "STATIC" | "DYNAMIC";
  shortCode?: string | null;
  appUrl: string;
}): { data: string; ready: boolean; isDynamic: boolean } {
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
