import { isPublicLinkMaintenance } from "@/lib/blog-public-links";
import { z } from "zod";
import { MSG } from "@/lib/user-messages";
import { blogFaqSchema } from "@/lib/blog-faq";
import { renderArticleBody, sanitizeArticleHtml } from "@/lib/blog-render";
import { normalizeStructuredDataInput } from "@/lib/blog-structured-data";
import { calculateReadingTimeMinutes } from "@/lib/reading-time";
import { applyArticleImageChange, type ArticleImageChange } from "@/lib/blog-image-content";

export const blogEditorSchema = z.object({
  title: z.string().trim().min(1).max(500),
  slug: z.string().trim().min(1).max(200),
  metaTitle: z.string().trim().max(500).nullable(),
  metaDescription: z.string().trim().max(2000).nullable(),
  excerpt: z.string().trim().max(10000).nullable(),
  content: z.string().max(1_000_000),
  format: z.enum(["html", "markdown"]),
  coverImageUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]).nullable(),
  coverImageAlt: z.string().trim().max(1000).nullable(),
  authorName: z.string().trim().max(300).nullable(),
  structuredData: z.unknown(),
  readingTimeMinutes: z.number().int().min(1).max(999).nullable(),
  categoryId: z.string().max(200).nullable(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  published: z.boolean(),
  status: z.enum(["draft", "scheduled", "published"]),
  scheduledAt: z.iso.datetime({ offset: true }).nullable(),
  comment: z.string().trim().max(2000),
  faq: blogFaqSchema,
  showPrintSizeIntro: z.boolean(),
  tags: z.array(z.string().trim().min(1).max(100).transform(value => value.toLocaleLowerCase("ru"))).max(30),
  relatedArticleIds: z.array(z.string().trim().min(1).max(200)).max(20).refine(ids => new Set(ids).size === ids.length, MSG.BLOG_RELATED_INVALID),
  minorEdit: z.boolean(),
  confirmConversion: z.boolean(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
}).partial().strict();
export type BlogEditorInput = z.infer<typeof blogEditorSchema>;

export type EditableArticle = {
  title: string; slug: string; content: string; format: string;
  metaTitle: string | null; metaDescription: string | null; excerpt: string | null;
  coverImageUrl: string | null; coverImageAlt?: string | null; authorName: string | null; structuredData: string | null;
  readingTimeMinutes: number | null; categoryId: string | null;
  publishedAt: Date | null; firstPublishedAt: Date | null;
  status?: "draft" | "scheduled" | "published" | null; scheduledAt?: Date | null;
  updatedAt: Date; contentUpdatedAt: Date | null;
  legacyHtml: string | null; faq: unknown; showPrintSizeIntro: boolean;
  tags?: string[]; relatedArticleIds?: string[];
};

export class BlogEditorError extends Error {
  status: number;
  details?: Record<string, unknown>;
  constructor(message: string, status = 400, details?: Record<string, unknown>) { super(message); this.status = status; this.details = details; }
}

function normalizeSlug(value: string): string {
  const slug = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!slug) throw new BlogEditorError(MSG.INVALID_SLUG);
  return slug;
}

function canonical(value: unknown): string {
  // Whitespace-only edits must not advertise an editorial update.
  // jsonb does not preserve object key order. Keep array order (FAQ order matters),
  // but compare objects structurally rather than comparing their serialization.
  function stable(input: unknown): unknown {
    if (typeof input === "string") return input.replace(/\s+/g, "");
    if (Array.isArray(input)) return input.map(stable);
    if (input && typeof input === "object") {
      const record = input as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort().map(key => [key, stable(record[key])]));
    }
    return input;
  }
  return JSON.stringify(stable(value ?? null));
}
export function hasSubstantiveArticleChange(before: Record<string, unknown>, after: Record<string, unknown>): boolean {
  return ["content", "title", "metaTitle", "metaDescription", "excerpt", "faq", "coverImageUrl", "coverImageAlt"].some(key =>
    canonical(before[key] ?? "") !== canonical(after[key] ?? ""));
}

export function prepareArticleSave(input: BlogEditorInput, existing: EditableArticle | null, now = new Date(), imageChange?: ArticleImageChange) {
  if (!existing && (!input.title || !input.slug || input.content === undefined)) throw new BlogEditorError(MSG.BLOG_INPUT_INVALID);
  const format = input.format ?? existing?.format ?? "markdown";
  if (existing?.format === "html" && format === "markdown" && !input.confirmConversion) throw new BlogEditorError(MSG.BLOG_CONVERSION_REQUIRED);
  if (existing?.format === "markdown" && format !== "markdown") throw new BlogEditorError(MSG.BLOG_FORMAT_LOCKED);
  if (existing?.format === "html" && format === "html" && input.content !== undefined && input.content !== existing.content && !(input.minorEdit && isPublicLinkMaintenance(existing.content, input.content)) && (!imageChange || input.content !== applyArticleImageChange(existing.content,imageChange).content)) throw new BlogEditorError(MSG.BLOG_LEGACY_READONLY);
  if (existing && input.expectedUpdatedAt && new Date(input.expectedUpdatedAt).getTime() !== existing.updatedAt.getTime()) throw new BlogEditorError(MSG.BLOG_SAVE_CONFLICT, 409);
  const slug = normalizeSlug(input.slug ?? existing?.slug ?? "");
  if (existing && (existing.firstPublishedAt || existing.publishedAt) && slug !== existing.slug) throw new BlogEditorError(MSG.BLOG_SLUG_LOCKED, 403);
  const structured = input.structuredData !== undefined ? normalizeStructuredDataInput(input.structuredData) : null;
  if (structured && !structured.ok) throw new BlogEditorError(MSG.BLOG_STRUCTURED_INVALID);

  const fields = {
    tags: [...new Set(input.tags ?? existing?.tags ?? [])],
    relatedArticleIds: input.relatedArticleIds ?? existing?.relatedArticleIds ?? [],
    title: input.title ?? existing?.title ?? "",
    slug, format,
    metaTitle: input.metaTitle !== undefined ? input.metaTitle || null : existing?.metaTitle ?? null,
    metaDescription: input.metaDescription !== undefined ? input.metaDescription || null : existing?.metaDescription ?? null,
    excerpt: input.excerpt !== undefined ? input.excerpt || null : existing?.excerpt ?? null,
    content: input.content ?? existing?.content ?? "",
    coverImageUrl: input.coverImageUrl !== undefined ? input.coverImageUrl || null : existing?.coverImageUrl ?? null,
    coverImageAlt: input.coverImageAlt !== undefined ? input.coverImageAlt : existing?.coverImageAlt ?? null,
    authorName: input.authorName !== undefined ? input.authorName || null : existing?.authorName ?? null,
    structuredData: structured?.ok ? structured.data || null : existing?.structuredData ?? null,
    categoryId: input.categoryId !== undefined ? input.categoryId || null : existing?.categoryId ?? null,
    faq: input.faq ?? existing?.faq ?? [],
    showPrintSizeIntro: input.showPrintSizeIntro ?? existing?.showPrintSizeIntro ?? true,
  };
  if (!existing && format === "html") fields.content = sanitizeArticleHtml(fields.content);
  // HTML rows keep their original source, including whitespace and attribute order.
  const body = renderArticleBody(fields.content, format as "html" | "markdown", fields.faq);
  const wantsPublication = input.published ?? (input.publishedAt !== undefined ? !!input.publishedAt : !!existing?.publishedAt);
  const status = input.status ?? (input.published !== undefined || input.publishedAt !== undefined ? (wantsPublication ? "published" : "draft") : existing?.status ?? (wantsPublication ? "published" : "draft"));
  const scheduledAt = status === "scheduled" ? (input.scheduledAt ? new Date(input.scheduledAt) : existing?.scheduledAt ?? null) : null;
  if (status === "scheduled" && (!scheduledAt || scheduledAt <= now)) throw new BlogEditorError(MSG.BLOG_SCHEDULE_INVALID);
  const firstPublishedAt = existing?.firstPublishedAt ?? existing?.publishedAt ?? (status === "published" ? now : null);
  const meaningful = !existing || hasSubstantiveArticleChange(existing, fields);
  return {
    ...fields,
    faq: fields.faq as z.infer<typeof blogFaqSchema>,
    renderedHtml: format === "markdown" ? body.html : null,
    legacyHtml: existing?.legacyHtml ?? (existing?.format === "html" && format === "markdown" ? existing.content : null),
    readingTimeMinutes: input.readingTimeMinutes ?? (((input.content === undefined || imageChange) && existing) ? existing.readingTimeMinutes : calculateReadingTimeMinutes(body.html)),
    firstPublishedAt: imageChange && existing ? existing.firstPublishedAt : firstPublishedAt,
    status, scheduledAt: imageChange && existing ? existing.scheduledAt ?? null : scheduledAt,
    publishedAt: imageChange && existing ? existing.publishedAt : status === "published" ? firstPublishedAt : null,
    contentUpdatedAt: meaningful && !input.minorEdit ? now : existing?.contentUpdatedAt ?? existing?.updatedAt ?? now,
  };
}
