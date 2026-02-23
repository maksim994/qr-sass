import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { WorkspacePlan } from "@prisma/client";

const PLAN_IDS = ["FREE", "PRO", "BUSINESS"] as const;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  if (!PLAN_IDS.includes(planId as (typeof PLAN_IDS)[number])) {
    return apiError("Invalid plan.", "BAD_REQUEST", 400, undefined, requestId);
  }

  const data = await readJsonBody<{
    maxQrCodes?: number | null;
    maxUsers?: number | null;
    priceRub?: number | null;
    allowsDynamic?: boolean | null;
    allowsAnalytics?: boolean | null;
    exportFormats?: string | null;
  }>(req);
  if (!data) return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
  const db = getDb();

  const exportFormatsJson = data.exportFormats != null
    ? JSON.stringify(Array.isArray(data.exportFormats) ? data.exportFormats : String(data.exportFormats))
    : undefined;

  const override = await db.planOverride.upsert({
    where: { planId: planId as WorkspacePlan },
    create: {
      planId: planId as WorkspacePlan,
      maxQrCodes: data.maxQrCodes ?? undefined,
      maxUsers: data.maxUsers ?? undefined,
      priceRub: data.priceRub ?? undefined,
      allowsDynamic: data.allowsDynamic ?? undefined,
      allowsAnalytics: data.allowsAnalytics ?? undefined,
      exportFormats: exportFormatsJson,
    },
    update: {
      ...(data.maxQrCodes !== undefined && { maxQrCodes: data.maxQrCodes }),
      ...(data.maxUsers !== undefined && { maxUsers: data.maxUsers }),
      ...(data.priceRub !== undefined && { priceRub: data.priceRub }),
      ...(data.allowsDynamic !== undefined && { allowsDynamic: data.allowsDynamic }),
      ...(data.allowsAnalytics !== undefined && { allowsAnalytics: data.allowsAnalytics }),
      ...(data.exportFormats !== undefined && { exportFormats: exportFormatsJson }),
    },
  });

  return apiSuccess(override);
}
