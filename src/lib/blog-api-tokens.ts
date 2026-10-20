import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";
import type { BlogActor } from "@/lib/blog-versions";

export const BLOG_API_LIMIT = 60;
const PREFIX = "qrs_blog_";
const PREFIX_LENGTH = PREFIX.length + 12;
export class BlogApiAuthError extends Error {
  status: number;
  retryAfter?: number;
  constructor(message: string, status = 401, retryAfter?: number) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
export function hashBlogApiToken(token: string, salt: string) {
  return createHash("sha256").update(salt).update(":").update(token).digest("hex");
}
export function generateBlogApiToken() {
  const token = PREFIX + randomBytes(32).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  return { token, keyPrefix: token.slice(0, PREFIX_LENGTH), keyHash: hashBlogApiToken(token, salt), salt };
}
export const tokenPublicSelect = { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true } as const;
export async function createBlogApiToken(name: string, actor: BlogActor) {
  const generated = generateBlogApiToken();
  const row = await getDb().$transaction(async tx => {
    const created = await tx.blogApiToken.create({ data: { name, keyPrefix: generated.keyPrefix, keyHash: generated.keyHash, salt: generated.salt, createdById: actor.actorId! }, select: tokenPublicSelect });
    await tx.blogEvent.create({ data: { postId: `token:${created.id}`, postTitle: `API-ключ: ${name}`, ...actor, type: "token_create", fields: [] } });
    return created;
  });
  return { ...row, token: generated.token };
}
export async function revokeBlogApiToken(id: string, actor: BlogActor) {
  return getDb().$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string; name: string; revokedAt: Date | null }[]>`SELECT "id", "name", "revokedAt" FROM "BlogApiToken" WHERE "id" = ${id} FOR UPDATE`;
    const row = rows[0];
    if (!row) throw new BlogApiAuthError(MSG.BLOG_API_TOKEN_NOT_FOUND, 404);
    if (!row.revokedAt) {
      await tx.blogApiToken.update({ where: { id }, data: { revokedAt: new Date() } });
      await tx.blogEvent.create({ data: { postId: `token:${id}`, postTitle: `API-ключ: ${row.name}`, ...actor, type: "token_revoke", fields: [] } });
    }
  });
}

// Row locks serialize rate consumption across replicas and revocation with API writes.
export async function assertActiveBlogToken(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "BlogApiToken" WHERE "id" = ${id} AND "revokedAt" IS NULL FOR UPDATE`;
  if (!rows.length) throw new BlogApiAuthError(MSG.BLOG_API_TOKEN_INVALID);
}
export async function authenticateBlogApi(request: Request) {
  const match = /^Bearer (qrs_blog_[A-Za-z0-9_-]{43})$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new BlogApiAuthError(MSG.BLOG_API_TOKEN_INVALID);
  const token = match[1];
  const found = await getDb().blogApiToken.findUnique({ where: { keyPrefix: token.slice(0, PREFIX_LENGTH) } });
  if (!found || found.revokedAt || !timingSafeEqual(Buffer.from(found.keyHash, "hex"), Buffer.from(hashBlogApiToken(token, found.salt), "hex"))) throw new BlogApiAuthError(MSG.BLOG_API_TOKEN_INVALID);
  await getDb().$transaction(async tx => {
    const rows = await tx.$queryRaw<{ revokedAt: Date | null; windowStartedAt: Date | null; requestCount: number }[]>`SELECT "revokedAt", "windowStartedAt", "requestCount" FROM "BlogApiToken" WHERE "id" = ${found.id} FOR UPDATE`;
    const row = rows[0];
    if (!row || row.revokedAt) throw new BlogApiAuthError(MSG.BLOG_API_TOKEN_INVALID);
    const now = new Date();
    const elapsed = now.getTime() - (row.windowStartedAt?.getTime() ?? 0);
    const reset = elapsed >= 60_000;
    if (!reset && row.requestCount >= BLOG_API_LIMIT) throw new BlogApiAuthError(MSG.BLOG_API_LIMIT, 429, Math.max(1, Math.ceil((60_000 - elapsed) / 1000)));
    await tx.blogApiToken.update({ where: { id: found.id }, data: { lastUsedAt: now, windowStartedAt: reset ? now : row.windowStartedAt, requestCount: reset ? 1 : row.requestCount + 1 } });
  });
  return { tokenId: found.id, actor: { actorId: null, actorName: `API: ${found.name}`, source: "api" } as BlogActor };
}
