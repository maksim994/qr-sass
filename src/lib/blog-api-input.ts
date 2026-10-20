import { z } from "zod";
import { blogEditorSchema } from "@/lib/blog-editor";

export const articleApiFields = blogEditorSchema.omit({ publishedAt: true, published: true, status: true, scheduledAt: true, expectedUpdatedAt: true });
export const articleCreateSchema = articleApiFields.extend({ title: z.string().trim().min(1).max(500), slug: z.string().trim().min(1).max(200), content: z.string().max(1_000_000), status: z.enum(["draft", "scheduled", "published"]).optional() });
export const articlePatchSchema = articleApiFields.extend({ version: z.number().int().min(0) });
export const articleListSchema = z.object({ status: z.enum(["draft", "scheduled", "published"]).optional(), slug: z.string().max(200).optional(), page: z.coerce.number().int().min(1).max(1_000_000).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
export function forbiddenApiPublication(input: unknown) {
  return input !== null && typeof input === "object" && ["status", "published", "publishedAt", "scheduledAt", "firstPublishedAt"].some(key => Object.hasOwn(input, key));
}
