import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { verifySessionJwt } from "@/lib/session-jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";

export const AUTH_COOKIE = "qr_saas_session";

type SessionPayload = {
  sub: string;
  email: string;
  sv: number;
};

function jwtKey() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload, options?: { remember?: boolean }) {
  return new SignJWT({ sub: payload.sub, email: payload.email, sv: payload.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(options?.remember ? "30d" : "7d")
    .sign(jwtKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await verifySessionJwt(token, {
    secret: env.JWT_SECRET, previousSecret: env.JWT_PREVIOUS_SECRET, rotatedAt: env.JWT_ROTATED_AT,
  });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const sv = typeof payload.sv === "number" && Number.isInteger(payload.sv) ? payload.sv : 0;
  return { sub, email, sv } satisfies SessionPayload;
}

export async function setAuthCookie(token: string, options?: { remember?: boolean }) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: options?.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    if (!payload.sub) return null;
    const user = await getDb().user.findUnique({
      where: { id: payload.sub },
      select: { sessionVersion: true },
    });
    if (!user) return null;
    if (payload.sv !== user.sessionVersion) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const db = getDb();
  const session = await getSession();
  if (!session?.sub) {
    redirect("/login");
  }
  const user = await db.user.findUnique({
    where: { id: session.sub },
    include: {
      memberships: {
        include: {
          workspace: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
  if (!user) {
    redirect("/login");
  }
  return user;
}
