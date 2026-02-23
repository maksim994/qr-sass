import { getDb } from "@/lib/db";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  const data = await readJsonBody<{ isAdmin: boolean }>(req);
  if (!data || typeof data.isAdmin !== "boolean") {
    return apiError("isAdmin boolean required.", "BAD_REQUEST", 400, undefined, requestId);
  }

  try {
    const db = getDb();
    const user = await db.user.update({
      where: { id: userId },
      data: { isAdmin: data.isAdmin },
    });
    return apiSuccess(user);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    if (msg.includes("Record to update not found") || msg.includes("record to update not found")) {
      return apiError("User not found.", "NOT_FOUND", 404, undefined, requestId);
    }
    return apiError(msg, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
