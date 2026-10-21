import { authenticateBlogApi } from "@/lib/blog-api-tokens";
import { apiSuccess } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { previewPendingRevision } from "@/lib/blog-pending-revision";
import { publicSiteUrl } from "@/lib/public-url";
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateBlogApi(req);
    const link = await previewPendingRevision((await context.params).id, auth.actor, auth.tokenId);
    return privateApi(apiSuccess({ ...link, url: publicSiteUrl(link.path) }));
  } catch (error) { return blogApiError(error); }
}
