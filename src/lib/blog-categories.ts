import { getDb } from "@/lib/db";

export const DEFAULT_BLOG_CATEGORIES = [
  { slug: "guides", name: "Гайды", sortOrder: 1 },
  { slug: "analytics", name: "Аналитика", sortOrder: 2 },
  { slug: "cases", name: "Кейсы", sortOrder: 3 },
  { slug: "design", name: "Дизайн", sortOrder: 4 },
  { slug: "marketing", name: "Маркетинг", sortOrder: 5 },
] as const;

export type BlogCategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

/** Ensures default categories exist (additive seed, no deletes). */
export async function ensureBlogCategories(): Promise<BlogCategoryRow[]> {
  const db = getDb();

  for (const cat of DEFAULT_BLOG_CATEGORIES) {
    await db.blogCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, sortOrder: cat.sortOrder },
    });
  }

  return db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, sortOrder: true },
  });
}

export async function getBlogCategories(): Promise<BlogCategoryRow[]> {
  const db = getDb();
  const existing = await db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, sortOrder: true },
  });

  if (existing.length === 0) {
    return ensureBlogCategories();
  }

  return existing;
}

export async function getBlogCategoryBySlug(slug: string): Promise<BlogCategoryRow | null> {
  const db = getDb();
  return db.blogCategory.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, sortOrder: true },
  });
}
