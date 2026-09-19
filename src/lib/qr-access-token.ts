import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const QR_ACCESS_COOKIE_PREFIX = "qr_access_";
export const QR_ACCESS_MAX_AGE_SEC = 60 * 60 * 8;
const AUDIENCE = "qr-access";

type QrAccessClaims = {
  qrId: string;
  pwdV: string;
};

function key() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export function qrAccessCookieName(shortCode: string) {
  return `${QR_ACCESS_COOKIE_PREFIX}${shortCode}`;
}

/** Version tied to the current password hash so rotation/removal invalidates old cookies. */
export function passwordVersion(passwordHash: string) {
  return passwordHash.slice(0, 16);
}

export async function createQrAccessToken(qrId: string, passwordHash: string) {
  return new SignJWT({ qrId, pwdV: passwordVersion(passwordHash) } satisfies QrAccessClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${QR_ACCESS_MAX_AGE_SEC}s`)
    .sign(key());
}

export async function verifyQrAccessToken(
  token: string | undefined,
  qrId: string,
  passwordHash: string,
): Promise<boolean> {
  if (!token || !qrId || !passwordHash) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: AUDIENCE });
    const claims = payload as unknown as QrAccessClaims;
    return claims.qrId === qrId && claims.pwdV === passwordVersion(passwordHash);
  } catch {
    return false;
  }
}
