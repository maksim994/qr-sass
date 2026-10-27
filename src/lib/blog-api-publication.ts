import { createHash, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "@/lib/env";
import { BlogApiAuthError } from "@/lib/blog-api-tokens";
import { MSG } from "@/lib/user-messages";

export const ARTICLE_PUBLISH_LIMIT = 10;
const HOUR_MS = 3_600_000;

export function authenticateArticlePublication(request: Request) {
  const expected = env.QRS_ARTICLES_PUBLISH_TOKEN ?? "";
  const supplied = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  // Fixed-size digests avoid both length-dependent comparison and timingSafeEqual throws.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  const matches = timingSafeEqual(digest(supplied), digest(expected));
  if (!expected || !supplied || !matches) throw new BlogApiAuthError(MSG.BLOG_API_PUBLISH_FORBIDDEN, 403);
}

export async function assertArticlePublicationRate(tx: Prisma.TransactionClient) {
  // One durable rolling quota across processes and token rotation, with no new table.
  // Keep this transaction lock until the publication event commits (or rolls back).
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(606005)::text`;
  const now = new Date();
  const recent = await tx.blogEvent.findMany({
    where: { type: "publish", source: "api", createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
    orderBy: { createdAt: "asc" }, select: { createdAt: true },
  });
  if (recent.length >= ARTICLE_PUBLISH_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((recent[recent.length - ARTICLE_PUBLISH_LIMIT].createdAt.getTime() + HOUR_MS - now.getTime()) / 1000));
    throw new BlogApiAuthError(MSG.BLOG_API_PUBLISH_LIMIT, 429, retryAfter);
  }
}
