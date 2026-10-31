import { z } from "zod";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import {
  listSeoPageAdminRows,
  saveSeoPageOverride,
  SeoPageConflictError,
  SeoPageNotFoundError,
} from "@/lib/seo-page-admin";
import { MSG } from "@/lib/user-messages";

const patchSchema = z
  .object({
    path: z.string().min(1).max(200),
    metaTitle: z.string().max(500).nullable().optional(),
    metaDescription: z.string().max(1000).nullable().optional(),
    heading: z.string().max(500).nullable().optional(),
    noindex: z.boolean().nullable().optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict();

export async function GET() {
  const rows = await listSeoPageAdminRows();
  return apiSuccess({ rows });
}

export async function PATCH(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const parsed = patchSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return apiError(MSG.SEO_PAGE_INPUT_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);

  try {
    const result = await saveSeoPageOverride(
      parsed.data.path,
      {
        metaTitle: parsed.data.metaTitle ?? null,
        metaDescription: parsed.data.metaDescription ?? null,
        heading: parsed.data.heading ?? null,
        noindex: parsed.data.noindex ?? null,
      },
      { actorId: admin.id, actorName: admin.email },
      parsed.data.expectedUpdatedAt ?? null,
    );
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof SeoPageNotFoundError) {
      return apiError(MSG.SEO_PAGE_NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
    }
    if (error instanceof SeoPageConflictError) {
      return apiError(MSG.SEO_PAGE_CONFLICT, "CONFLICT", 409, undefined, requestId);
    }
    throw error;
  }
}
