import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getPlan } from "@/lib/plans";
import { generateApiKey } from "@/lib/api-keys";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const requestId = getRequestId(req);

  const session = await getSession();
  if (!session?.sub) {
    return apiError("Войдите в аккаунт.", "UNAUTHORIZED", 401, undefined, requestId);
  }

  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) {
    return apiError(
      "Только владелец или администратор рабочей области могут просматривать API-ключи.",
      "FORBIDDEN",
      403,
      undefined,
      requestId
    );
  }

  const planInfo = await getPlan(membership.workspace.plan);
  const allowsApi = planInfo.id === "BUSINESS";
  if (!allowsApi) {
    return apiError("API-доступ доступен только на тарифе Бизнес.", "FORBIDDEN", 403, undefined, requestId);
  }

  const keys = await getDb().apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  return apiSuccess({
    items: keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: `${k.keyPrefix}...`,
      createdAt: k.createdAt,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const requestId = getRequestId(req);

  const session = await getSession();
  if (!session?.sub) {
    return apiError("Войдите в аккаунт.", "UNAUTHORIZED", 401, undefined, requestId);
  }

  const membership = await getWorkspaceAdminOrNull(workspaceId);
  if (!membership) {
    return apiError(
      "Только владелец или администратор рабочей области могут создавать API-ключи.",
      "FORBIDDEN",
      403,
      undefined,
      requestId
    );
  }

  const planInfo = await getPlan(membership.workspace.plan);
  const allowsApi = planInfo.id === "BUSINESS";
  if (!allowsApi) {
    return apiError("API-доступ доступен только на тарифе Бизнес.", "FORBIDDEN", 403, undefined, requestId);
  }

  const data = await readJsonBody<{ name: string }>(req);
  const name = data?.name?.trim() || "API Key";
  if (name.length > 64) {
    return apiError("Имя слишком длинное.", "BAD_REQUEST", 400, undefined, requestId);
  }

  const db = getDb();
  const existing = await db.apiKey.findUnique({
    where: { workspaceId_name: { workspaceId, name } },
  });
  if (existing) {
    return apiError("Ключ с таким именем уже существует.", "CONFLICT", 409, undefined, requestId);
  }

  try {
    const { key, prefix, hash } = generateApiKey();
    await db.apiKey.create({
      data: { workspaceId, name, keyPrefix: prefix, keyHash: hash },
    });
    return apiSuccess({ key, name, prefix: `${prefix}...` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка создания ключа";
    return apiError(msg, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
