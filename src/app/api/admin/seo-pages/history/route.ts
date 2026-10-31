import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { listSeoPageRevisions } from "@/lib/seo-page-admin";
import { MSG } from "@/lib/user-messages";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const admin = await getAdminOrNull();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  const path = new URL(req.url).searchParams.get("path");
  if (!path) return apiError(MSG.SEO_PAGE_PATH_REQUIRED, "BAD_REQUEST", 400, undefined, requestId);

  const revisions = await listSeoPageRevisions(path);
  return apiSuccess({ revisions });
}
