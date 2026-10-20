import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import {
  createEditorialRedirect,
  listEditorialRedirects,
} from "@/lib/editorial-redirects";
import { redirectInput } from "@/lib/editorial-redirect-input";
import { MSG } from "@/lib/user-messages";
export async function GET() {
  if (!(await getAdminOrNull()))
    return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
  return privateApi(apiSuccess(await listEditorialRedirects()));
}
export async function POST(req: Request) {
  const admin = await getAdminOrNull();
  if (!admin)
    return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
  const parsed = redirectInput.safeParse(await readJsonBody(req));
  if (!parsed.success)
    return privateApi(
      apiError(MSG.BLOG_REDIRECT_PATH, "VALIDATION_ERROR", 400),
    );
  try {
    return privateApi(
      apiSuccess(
        await createEditorialRedirect(parsed.data, {
          actorId: admin.id,
          actorName: admin.email,
          source: "admin",
        }),
        201,
      ),
    );
  } catch (error) {
    return blogApiError(error);
  }
}
