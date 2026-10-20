import { z } from "zod";

export const blogFaqSchema = z.array(z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(10000),
}).strict()).max(100);
export type BlogFaq = z.infer<typeof blogFaqSchema>;

export function readBlogFaq(value: unknown): BlogFaq {
  const result = blogFaqSchema.safeParse(value);
  return result.success ? result.data : [];
}

export function extractLegacyFaq(raw: string | null | undefined): BlogFaq {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    function walk(node: unknown): BlogFaq {
      if (Array.isArray(node)) return node.flatMap(walk);
      if (!node || typeof node !== "object") return [];
      const record = node as Record<string, unknown>;
      const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
      if (types.includes("FAQPage") && Array.isArray(record.mainEntity)) {
        return readBlogFaq(record.mainEntity.map((item) => ({
          question: item?.name,
          answer: item?.acceptedAnswer?.text,
        })));
      }
      return Object.values(record).flatMap(walk);
    }
    return walk(parsed);
  } catch { return []; }
}
