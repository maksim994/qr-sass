import { getWorkspaceAdminOrNull } from "@/lib/workspace-auth";
import { getDb } from "@/lib/db";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { MSG } from "@/lib/user-messages";
import { qrApiPrivate } from "@/lib/qr-api-auth";
import { generateQrApiKey, qrApiKeySchema } from "@/lib/qr-api-input";

export async function manageQrApiKeys(request: Request, workspaceId: string, keyId?: string) {
  try {
    const membership = await getWorkspaceAdminOrNull(workspaceId);
    if (!membership) return qrApiPrivate(apiError(MSG.QR_API_KEYS_ADMIN, "FORBIDDEN", 403));
    const db = getDb();
    if (request.method === "DELETE" && keyId) {
      const result = await db.qrApiKey.updateMany({ where: { id: keyId, workspaceId, revokedAt: null }, data: { revokedAt: new Date() } });
      return qrApiPrivate(result.count ? apiSuccess({ revoked: true }) : apiError(MSG.NOT_FOUND, "NOT_FOUND", 404));
    }
    if (request.method === "GET") {
      const items = await db.qrApiKey.findMany({
        where: { workspaceId, revokedAt: null }, orderBy: { createdAt: "desc" },
        select: { id: true, name: true, keyPrefix: true, scopes: true, rateLimit: true, createdAt: true, lastUsedAt: true },
      });
      return qrApiPrivate(apiSuccess({ items: items.map(({ keyPrefix, ...item }) => ({ ...item, prefix: `${keyPrefix}…` })) }));
    }
    const parsed = qrApiKeySchema.safeParse(await readJsonBody(request));
    if (!parsed.success) return qrApiPrivate(apiError(MSG.INVALID_PAYLOAD, "VALIDATION_ERROR", 400));
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
      if (await tx.qrApiKey.count({ where: { workspaceId, revokedAt: null } }) >= 20) return null;
      const { key, keyHash, keyPrefix } = generateQrApiKey();
      const item = await tx.qrApiKey.create({ data: { workspaceId, createdById: membership.userId, ...parsed.data, keyHash, keyPrefix } });
      return { key, id: item.id, name: item.name, scopes: item.scopes, rateLimit: item.rateLimit, prefix: `${keyPrefix}…` };
    });
    return qrApiPrivate(result ? apiSuccess(result, 201) : apiError(MSG.QR_API_KEY_LIMIT, "FORBIDDEN", 403));
  } catch {
    return qrApiPrivate(apiError(MSG.QR_API_FAILED, "INTERNAL_ERROR", 500));
  }
}
