import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const COOKIE_PREFIX = "bv_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getCookieName(slug: string): string {
  return COOKIE_PREFIX + slug.replace(/[^a-zA-Z0-9-]/g, "_");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  const post = await db.blogPost.findUnique({
    where: { slug, publishedAt: { not: null } },
    select: { id: true, views: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieName = getCookieName(slug);
  const alreadyViewed = req.cookies.get(cookieName)?.value === "1";

  if (alreadyViewed) {
    return NextResponse.json({ views: post.views });
  }

  const updated = await db.blogPost.update({
    where: { id: post.id },
    data: { views: { increment: 1 } },
    select: { views: true },
  });

  const res = NextResponse.json({ views: updated.views });
  res.cookies.set(cookieName, "1", {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  return res;
}
