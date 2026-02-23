import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";

export const AUTH_COOKIE = "qr_saas_session";

type SessionPayload = {
  sub: string;
  email: string;
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

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, jwtKey());
  return payload as unknown as SessionPayload;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
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
