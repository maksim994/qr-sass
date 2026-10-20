import { authenticateBlogApi } from "@/lib/blog-api-tokens";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import {
  createEditorialRedirect,
  listEditorialRedirects,
} from "@/lib/editorial-redirects";
import { redirectInput } from "@/lib/editorial-redirect-input";
import { MSG } from "@/lib/user-messages";
export async function GET(req: Request) {
  try {
    await authenticateBlogApi(req);
    return privateApi(apiSuccess(await listEditorialRedirects()));
  } catch (error) {
    return blogApiError(error);
  }
}
export async function POST(req: Request) {
  try {
    const auth = await authenticateBlogApi(req),
      parsed = redirectInput.safeParse(await readJsonBody(req));
    if (!parsed.success)
      return privateApi(
        apiError(MSG.BLOG_REDIRECT_PATH, "VALIDATION_ERROR", 400),
      );
    return privateApi(
      apiSuccess(
        await createEditorialRedirect(parsed.data, auth.actor, auth.tokenId),
        201,
      ),
    );
  } catch (error) {
    return blogApiError(error);
  }
}
