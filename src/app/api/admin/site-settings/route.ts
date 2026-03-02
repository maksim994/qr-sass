import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";

export async function GET() {
  const db = getDb();
  const row = await db.siteSettings.findUnique({
    where: { id: "default" },
  });
  return apiSuccess({
    yandexMetrikaId: row?.yandexMetrikaId ?? null,
    customHeadCode: row?.customHeadCode ?? null,
  });
}

export async function PATCH(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{
    yandexMetrikaId?: string | null;
    customHeadCode?: string | null;
  }>(req);
  if (!data) return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);

  // Validate Yandex Metrika ID - should be numeric
  if (
    data.yandexMetrikaId !== undefined &&
    data.yandexMetrikaId !== null &&
    data.yandexMetrikaId !== "" &&
    !/^\d+$/.test(data.yandexMetrikaId)
  ) {
    return apiError("Yandex Metrika ID must be numeric.", "BAD_REQUEST", 400, undefined, requestId);
  }

  const db = getDb();
  const row = await db.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      yandexMetrikaId: data.yandexMetrikaId || null,
      customHeadCode: data.customHeadCode || null,
    },
    update: {
      ...(data.yandexMetrikaId !== undefined && { yandexMetrikaId: data.yandexMetrikaId || null }),
      ...(data.customHeadCode !== undefined && { customHeadCode: data.customHeadCode || null }),
    },
  });

  return apiSuccess({
    yandexMetrikaId: row.yandexMetrikaId,
    customHeadCode: row.customHeadCode,
  });
}
