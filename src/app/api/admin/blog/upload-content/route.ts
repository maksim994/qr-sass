import { getAdminOrNullFromSessionOrApiKey } from "@/lib/admin-auth";
import { MSG } from "@/lib/user-messages";
import { apiError, getRequestId } from "@/lib/api-response";
import { handleBlogImageUpload } from "@/lib/blog-image-upload";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const admin = await getAdminOrNullFromSessionOrApiKey();
  if (!admin) return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);

  return handleBlogImageUpload(request, "content");
}
