import { PrismaClient } from "@prisma/client";
import { sanitizeBlogFields } from "@/lib/blog-sanitize";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const db = new PrismaClient();
  const posts = await db.blogPost.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
      content: true,
      structuredData: true,
    },
  });

  let changed = 0;
  for (const post of posts) {
    const next = sanitizeBlogFields(post);
    const patch = {
      title: next.title ?? post.title,
      excerpt: next.excerpt ?? null,
      metaTitle: next.metaTitle ?? null,
      metaDescription: next.metaDescription ?? null,
      content: next.content ?? post.content,
      structuredData: next.structuredData ?? null,
    };
    const same =
      patch.title === post.title &&
      patch.excerpt === post.excerpt &&
      patch.metaTitle === post.metaTitle &&
      patch.metaDescription === post.metaDescription &&
      patch.content === post.content &&
      patch.structuredData === post.structuredData;
    if (same) continue;
    changed += 1;
    console.log(`${dryRun ? "dry" : "update"} ${post.slug}`);
    if (!dryRun) {
      await db.blogPost.update({ where: { id: post.id }, data: patch });
    }
  }

  console.log(`${dryRun ? "Would update" : "Updated"} ${changed} of ${posts.length} posts`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
