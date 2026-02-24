import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { consumeRateLimit, getClientIp, blogLikeRateLimiter } from "@/lib/rate-limit";

const COOKIE_PREFIX = "bl_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getCookieName(slug: string): string {
  return COOKIE_PREFIX + slug.replace(/[^a-zA-Z0-9-]/g, "_");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(req);
  const limit = await consumeRateLimit(blogLikeRateLimiter, ip);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: limit.retryAfterMs ? { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } : undefined }
    );
  }

  const { slug } = await params;
  const db = getDb();
  const post = await db.blogPost.findUnique({
    where: { slug, publishedAt: { not: null } },
    select: { id: true, likes: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieName = getCookieName(slug);
  const cookieStore = await cookies();
  const alreadyLiked = cookieStore.get(cookieName)?.value === "1";
  if (alreadyLiked) {
    return NextResponse.json({ likes: post.likes });
  }

  const updated = await db.blogPost.update({
    where: { id: post.id },
    data: { likes: { increment: 1 } },
    select: { likes: true },
  });

  const res = NextResponse.json({ likes: updated.likes });
  res.cookies.set(cookieName, "1", {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
