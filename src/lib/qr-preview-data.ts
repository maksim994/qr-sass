import { QrContentType } from "@prisma/client";
import { canonicalQrData } from "@/lib/qr-canonical";

export function getQrPreviewData(
  contentType: QrContentType,
  payload: Record<string, unknown>,
  options?: {
    appUrl?: string;
    shortCode?: string | null;
    kind?: "STATIC" | "DYNAMIC";
  },
): string {
  return canonicalQrData({
    contentType,
    payload,
    kind: options?.kind ?? "STATIC",
    shortCode: options?.shortCode,
    appUrl: options?.appUrl ?? "",
  }).data;
}
