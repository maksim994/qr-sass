import { z } from "zod";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import {
  restoreSeoPageRevision,
  SeoPageConflictError,
  SeoPageNotFoundError,
} from "@/lib/seo-page-admin";
import { MSG } from "@/lib/user-messages";

const restoreSchema = z
  .object({
    path: z.string().min(1).max(200),
    revisionId: z.string().min(1),
    expectedUpdatedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const parsed = restoreSchema.safeParse(await readJsonBody(req));
  if (!parsed.success) return apiError(MSG.SEO_PAGE_INPUT_INVALID, "VALIDATION_ERROR", 400, undefined, requestId);

  try {
    const result = await restoreSeoPageRevision(
      parsed.data.path,
      parsed.data.revisionId,
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
