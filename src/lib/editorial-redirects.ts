import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { BLOG_REDIRECTS } from "@/lib/blog-redirects";
import { buildIndexableStaticPaths } from "@/lib/seo-hygiene";
import { assertActiveBlogToken } from "@/lib/blog-api-tokens";
import type { BlogActor } from "@/lib/blog-versions";
import { MSG } from "@/lib/user-messages";
import {
  RedirectError,
  normalizeRedirectPath,
  normalizeRedirectTarget,
  isEditorialRedirectPath,
  assertNoRedirectChain,
} from "@/lib/editorial-redirect-input";
export const infrastructureRedirects = [
  {
    id: "system:slash",
    source: "/:path+/",
    target: "/:path+",
    code: 308,
    comment: "Нормализация завершающего слеша",
    actorName: "Система",
    createdAt: null,
    locked: true,
  },
  {
    id: "system:www",
    source: "www.qr-s.ru/:path*",
    target: "https://qr-s.ru/:path*",
    code: 308,
    comment: "Основной домен",
    actorName: "Система",
    createdAt: null,
    locked: true,
  },
];
export async function listEditorialRedirects() {
  const rows = await getDb().blogRedirect.findMany({
    orderBy: { createdAt: "desc" },
  });
  return [
    ...rows.map((r) => ({ ...r, code: 301, locked: false })),
    ...infrastructureRedirects,
  ];
}
export async function lockEditorialRoutes(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(606004)::text`;
}
export async function assertArticleRouteAvailable(
  tx: Prisma.TransactionClient,
  slug: string,
  status: string,
  alreadyPublished = false,
) {
  if (!["published", "scheduled"].includes(status)) return;
  await lockEditorialRoutes(tx);
  const rule = await tx.blogRedirect.findUnique({
    where: { source: `/blog/${slug}` },
  });
  // Grandfather only an already published legacy consolidation, never a newly shadowed page.
  if (
    rule &&
    !(
      alreadyPublished &&
      BLOG_REDIRECTS[slug] &&
      rule.target === `/blog/${BLOG_REDIRECTS[slug]}`
    )
  )
    throw new RedirectError(MSG.BLOG_REDIRECT_PUBLICATION, 409);
}
export async function createEditorialRedirect(
  input: { source: string; target: string; comment?: string },
  actor: BlogActor,
  tokenId?: string,
) {
  const source = normalizeRedirectPath(input.source),
    target = normalizeRedirectTarget(input.target);
  if (
    !isEditorialRedirectPath(source) ||
    source === "/" ||
    buildIndexableStaticPaths().includes(source)
  )
    throw new RedirectError(MSG.BLOG_REDIRECT_PUBLISHED);
  return getDb().$transaction(async (tx) => {
    if (tokenId) await assertActiveBlogToken(tx, tokenId);
    await lockEditorialRoutes(tx);
    const slug = source.startsWith("/blog/")
      ? decodeURI(source.slice(6))
      : null;
    if (
      slug &&
      !(
        actor.source === "admin" &&
        BLOG_REDIRECTS[slug] &&
        target === `/blog/${BLOG_REDIRECTS[slug]}`
      ) &&
      (await tx.blogPost.findFirst({
        where: {
          slug,
          OR: [{ publishedAt: { not: null } }, { status: "scheduled" }],
        },
        select: { id: true },
      }))
    )
      throw new RedirectError(MSG.BLOG_REDIRECT_PUBLISHED);
    const rows = await tx.blogRedirect.findMany({
      select: { source: true, target: true },
    });
    assertNoRedirectChain(source, target, rows);
    const rule = await tx.blogRedirect.create({
      data: {
        source,
        target,
        comment: input.comment,
        actorName: actor.actorName,
      },
    });
    await tx.blogEvent.create({
      data: {
        postId: `redirect:${rule.id}`,
        postTitle: `${source} → ${target}`,
        ...actor,
        type: "redirect_create",
        fields: ["source", "target"],
        comment: input.comment,
      },
    });
    return { ...rule, code: 301, locked: false };
  });
}
export async function deleteEditorialRedirect(id: string, actor: BlogActor) {
  if (id.startsWith("legacy:") || id.startsWith("system:"))
    throw new RedirectError(MSG.BLOG_REDIRECT_LOCKED, 403);
  await getDb().$transaction(async (tx) => {
    await lockEditorialRoutes(tx);
    const rule = await tx.blogRedirect.findUnique({ where: { id } });
    if (!rule) throw new RedirectError(MSG.BLOG_REDIRECT_NOT_FOUND, 404);
    await tx.blogRedirect.delete({ where: { id } });
    await tx.blogEvent.create({
      data: {
        postId: `redirect:${id}`,
        postTitle: `${rule.source} → ${rule.target}`,
        ...actor,
        type: "redirect_delete",
        fields: [],
      },
    });
  });
}
