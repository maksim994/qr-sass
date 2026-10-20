import { z } from "zod";
export const imageAltSchema = z.string().trim().min(1).max(1000);

const common = {
  version: z.number().int().nonnegative().safe(),
  url: z.string().min(1).max(4000),
  minorEdit: z.boolean().optional(),
  comment: z.string().max(2000).optional(),
};
export const imageRemovalSchema = z.object({
  url: common.url,
  remove: z.literal(true),
  all: z.boolean().optional(),
}).strict();
export const articleImagePatchSchema = z.union([
  z.object({
    ...common,
    alt: imageAltSchema,
    newUrl: z.url({ protocol: /^https?$/ }).max(4000).refine(value => {
      const url = new URL(value);
      return !url.username && !url.password && !/[\s<>]/.test(value);
    }).optional(),
  }).strict(),
  imageRemovalSchema.extend(common).strict(),
]);
