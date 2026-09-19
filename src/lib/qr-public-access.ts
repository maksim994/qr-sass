import { qrUnavailablePath } from "@/lib/qr-lifetime-policy";
import { qrAccessCookieName, verifyQrAccessToken } from "@/lib/qr-access-token";
import { verifyQrViewGrant } from "@/lib/qr-view-grant";

export type QrPublicRecord = {
  id: string;
  shortCode?: string | null;
  isArchived: boolean;
  expireAt: Date | null;
  maxScans: number | null;
  passwordHash: string | null;
};

export type QrPublicFailureReason = "missing" | "archived" | "expired" | "limit" | "password";

export type QrPublicDecision =
  | { ok: true }
  | { ok: false; reason: QrPublicFailureReason };

export function qrPublicUnavailablePath(reason: QrPublicFailureReason): string {
  if (reason === "archived") return qrUnavailablePath("archived");
  if (reason === "expired" || reason === "limit") return "/expired";
  return qrUnavailablePath("missing");
}

export async function evaluateQrPublicAccess(input: {
  qr: QrPublicRecord | null | undefined;
  scanCount: number;
  accessToken?: string | null;
  viewGrantToken?: string | null;
  /** Asset/media of an already allowed view; does not open a new scan. */
  requireViewGrant?: boolean;
  bypassPassword?: boolean;
  bypassScanLimit?: boolean;
  now?: Date;
}): Promise<QrPublicDecision> {
  const qr = input.qr;
  if (!qr) return { ok: false, reason: "missing" };
  if (qr.isArchived) return { ok: false, reason: "archived" };
  const now = input.now ?? new Date();
  if (qr.expireAt && now > qr.expireAt) return { ok: false, reason: "expired" };

  const limited = qr.maxScans != null && qr.maxScans > 0;
  if (limited && !input.bypassScanLimit) {
    if (input.requireViewGrant) {
      const granted = await verifyQrViewGrant(input.viewGrantToken ?? undefined, qr.id);
      if (!granted) return { ok: false, reason: "limit" };
    } else if (input.scanCount >= (qr.maxScans ?? 0)) {
      return { ok: false, reason: "limit" };
    }
  }

  if (qr.passwordHash && !input.bypassPassword) {
    const allowed = await verifyQrAccessToken(input.accessToken ?? undefined, qr.id, qr.passwordHash);
    if (!allowed) return { ok: false, reason: "password" };
  }
  return { ok: true };
}

export function accessCookieFor(shortCode: string | null | undefined): string {
  return qrAccessCookieName(shortCode ?? "");
}
