// Optional manual read-only export. Do not run against production as part of this task.
// node --env-file=/secure/database.env --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/export-internal-links-snapshot.ts /tmp/editorial-snapshot.json
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "@/lib/db";
const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("--")) throw new Error("Supply one private output path; export only, no apply mode.");
const db = getDb();
try {
  const snapshot = await db.$transaction(async tx => {
    // Enforce read-only at PostgreSQL level as well as selecting explicit fields.
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const posts = await tx.blogPost.findMany({ select: {
      id: true, slug: true, content: true, format: true, relatedArticleIds: true, publishedAt: true, updatedAt: true,
    }, orderBy: { slug: "asc" } });
    const redirects = await tx.blogRedirect.findMany({ select: { source: true, target: true } });
    return { capturedAt: new Date().toISOString(), posts, redirects };
  }, { isolationLevel: "RepeatableRead" });
  writeFileSync(resolve(args[0]), JSON.stringify(snapshot, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ mode: "read-only-export", articles: snapshot.posts.length, redirects: snapshot.redirects.length }));
} finally {
  await db.$disconnect();
}
