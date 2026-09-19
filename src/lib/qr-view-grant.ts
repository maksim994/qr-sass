import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const QR_VIEW_MAX_AGE_SEC = 60 * 60;
const AUDIENCE = "qr-view";

function key() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export function viewCookieName(qrId: string) {
  return `qr_view_${qrId}`;
}

export async function createQrViewGrant(qrId: string) {
  return new SignJWT({ qrId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${QR_VIEW_MAX_AGE_SEC}s`)
    .sign(key());
}

export async function verifyQrViewGrant(token: string | undefined, qrId: string): Promise<boolean> {
  if (!token || !qrId) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: AUDIENCE });
    return (payload as { qrId?: unknown }).qrId === qrId;
  } catch {
    return false;
  }
}

export function assetUrlWithViewGrant(qrId: string, grant?: string) {
  const path = `/api/qr/${qrId}/asset`;
  return grant ? `${path}?v=${encodeURIComponent(grant)}` : path;
}
