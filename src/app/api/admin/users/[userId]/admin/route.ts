import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import {
  adminRoleSchema,
  changeAdminRole,
  AdminOperationError,
} from "@/lib/admin-operations";
import { MSG } from "@/lib/user-messages";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const actor = await getAdminOrNull();
  if (!actor) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
  const input = adminRoleSchema.safeParse(await readJsonBody(req));
  if (!input.success)
    return apiError(MSG.ADMIN_CHANGE_INVALID, "VALIDATION_ERROR", 400);
  try {
    return apiSuccess(
      await changeAdminRole(actor, (await params).userId, input.data),
    );
  } catch (error) {
    return apiError(
      error instanceof AdminOperationError
        ? error.message
        : MSG.ADMIN_CHANGE_FAILED,
      error instanceof AdminOperationError
        ? error.status === 409
          ? "CONFLICT"
          : error.status === 404
            ? "NOT_FOUND"
            : error.status === 403
              ? "FORBIDDEN"
              : "BAD_REQUEST"
        : "INTERNAL_ERROR",
      error instanceof AdminOperationError ? error.status : 500,
    );
  }
}
