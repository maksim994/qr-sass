import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { partnerCreateSchema } from "@/lib/partner-rules";
import { MSG } from "@/lib/user-messages";

export async function POST(request: Request) {
  if (!await getAdminOrNull()) return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403);
  const parsed = partnerCreateSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError(MSG.PARTNER_INVALID, "VALIDATION_ERROR", 400);
  try { return apiSuccess(await getDb().partner.create({ data: parsed.data }), 201); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(MSG.PARTNER_CODE_TAKEN, "CONFLICT", 409);
    return apiError(MSG.INTERNAL_ERROR, "INTERNAL_ERROR", 500);
  }
}
export async function PATCH(request: Request) {
  if (!await getAdminOrNull()) return apiError(MSG.FORBIDDEN, "FORBIDDEN", 403);
  const parsed = z.object({ id: z.string().min(1).max(100), enabled: z.boolean() }).safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400);
  const result = await getDb().partner.updateMany({ where: { id: parsed.data.id }, data: { enabled: parsed.data.enabled } });
  if (!result.count) return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404);
  return apiSuccess({ updated: true });
}
