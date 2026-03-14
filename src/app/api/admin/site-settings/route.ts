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
    robotsTxtContent: row?.robotsTxtContent ?? null,
    faviconUrl: row?.faviconUrl ?? null,
    indexNowKey: row?.indexNowKey ?? null,
  });
}

export async function PATCH(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{
    yandexMetrikaId?: string | null;
    customHeadCode?: string | null;
    robotsTxtContent?: string | null;
    faviconUrl?: string | null;
    indexNowKey?: string | null;
  }>(req);
  if (!data) return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);

  // IndexNow key: 8–128 chars, a-z A-Z 0-9 -
  if (
    data.indexNowKey !== undefined &&
    data.indexNowKey !== null &&
    data.indexNowKey !== "" &&
    !/^[a-zA-Z0-9-]{8,128}$/.test(data.indexNowKey)
  ) {
    return apiError(
      "IndexNow key: 8–128 символов, только a-z, A-Z, 0-9, дефис.",
      "BAD_REQUEST",
      400,
      undefined,
      requestId,
    );
  }

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
      robotsTxtContent: data.robotsTxtContent ?? null,
      faviconUrl: data.faviconUrl ?? null,
      indexNowKey: data.indexNowKey?.trim() || null,
    },
    update: {
      ...(data.yandexMetrikaId !== undefined && { yandexMetrikaId: data.yandexMetrikaId || null }),
      ...(data.customHeadCode !== undefined && { customHeadCode: data.customHeadCode || null }),
      ...(data.robotsTxtContent !== undefined && { robotsTxtContent: data.robotsTxtContent ?? null }),
      ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl ?? null }),
      ...(data.indexNowKey !== undefined && { indexNowKey: data.indexNowKey?.trim() || null }),
    },
  });

  return apiSuccess({
    yandexMetrikaId: row.yandexMetrikaId,
    customHeadCode: row.customHeadCode,
    robotsTxtContent: row.robotsTxtContent,
    faviconUrl: row.faviconUrl,
    indexNowKey: row.indexNowKey,
  });
}
