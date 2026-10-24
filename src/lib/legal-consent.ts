import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";

/** Версия текста согласия (/personal-data-consent + оферта). При изменении — re-consent. */
export const LEGAL_CONSENT_VERSION = "2026-10-24";

export type LegalConsentSource = "REGISTER" | "YANDEX_REGISTER" | "RENEWAL";

const PENDING_YANDEX_COOKIE = "yandex_pending_registration";

type YandexPendingPayload = {
  purpose: "yandex_register";
  yandexId: string;
  email: string;
  name: string;
};

function jwtKey() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function recordUserLegalConsent(params: {
  userId: string;
  ipAddress: string | null;
  source: LegalConsentSource;
  newsletterOptIn?: boolean;
}) {
  const db = getDb();
  await db.userLegalConsent.create({
    data: {
      userId: params.userId,
      consentVersion: LEGAL_CONSENT_VERSION,
      ipAddress: params.ipAddress,
      source: params.source,
      newsletterOptIn: params.newsletterOptIn ?? false,
    },
  });
}

export async function getLatestUserLegalConsent(userId: string) {
  const db = getDb();
  return db.userLegalConsent.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function userNeedsConsentRenewal(userId: string): Promise<boolean> {
  const latest = await getLatestUserLegalConsent(userId);
  if (!latest) return true;
  return latest.consentVersion !== LEGAL_CONSENT_VERSION;
}

export function postLoginRedirect(needsRenewal: boolean): string {
  return needsRenewal ? "/consent/renew" : "/dashboard";
}

export async function createYandexPendingToken(profile: {
  yandexId: string;
  email: string;
  name: string;
}) {
  return new SignJWT({
    purpose: "yandex_register",
    yandexId: profile.yandexId,
    email: profile.email,
    name: profile.name,
  } satisfies YandexPendingPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(jwtKey());
}

export async function verifyYandexPendingToken(token: string): Promise<YandexPendingPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey());
    const data = payload as unknown as YandexPendingPayload;
    if (data.purpose !== "yandex_register" || !data.yandexId || !data.email) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function setYandexPendingCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_YANDEX_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
}

export async function clearYandexPendingCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_YANDEX_COOKIE);
}

export async function readYandexPendingFromCookie(): Promise<YandexPendingPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_YANDEX_COOKIE)?.value;
  if (!token) return null;
  return verifyYandexPendingToken(token);
}
