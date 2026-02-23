import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  const post = await db.blogPost.findUnique({
    where: { slug, publishedAt: { not: null } },
    select: { id: true, likes: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.blogPost.update({
    where: { id: post.id },
    data: { likes: { increment: 1 } },
    select: { likes: true },
  });

  return NextResponse.json({ likes: updated.likes });
}
