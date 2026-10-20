import { getDb } from "@/lib/db";
import { recordSave } from "@/lib/blog-versions";

export async function publishDueArticles(now = new Date()) {
  const db = getDb();
  const due = await db.blogPost.findMany({ where: { status: "scheduled", scheduledAt: { lte: now } }, select: { id: true }, take: 100, orderBy: { scheduledAt: "asc" } });
  const published: string[] = [];
  for (const { id } of due) {
    try {
      const post = await db.$transaction(async tx => {
        const before = await tx.blogPost.findUnique({ where: { id } });
        if (!before || before.status !== "scheduled" || !before.scheduledAt || before.scheduledAt > now) return null;
        const firstPublishedAt = before.firstPublishedAt ?? before.scheduledAt;
        const post = await tx.blogPost.update({ where: { id, status: "scheduled", updatedAt: before.updatedAt }, data: { updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)), status: "published", scheduledAt: null, publishedAt: firstPublishedAt, firstPublishedAt, contentUpdatedAt: before.contentUpdatedAt ?? before.updatedAt } });
        return recordSave(tx, before, post, { actorId: null, actorName: "Планировщик публикаций", source: "system" }, "Автоматическая публикация по расписанию");
      });
      if (post) published.push(post.slug);
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "P2025")) throw error;
    }
  }
  return published;
}
