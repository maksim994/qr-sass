import { authenticateBlogApi } from "@/lib/blog-api-tokens";
import { apiSuccess, readJsonBody } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { savePendingRevision, getPendingRevision, deletePendingRevision } from "@/lib/blog-pending-revision";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, context: Context) {
  try {
    await authenticateBlogApi(req);
    return privateApi(apiSuccess(await getPendingRevision((await context.params).id)));
  } catch (error) { return blogApiError(error); }
}
export async function PUT(req: Request, context: Context) {
  try {
    const auth = await authenticateBlogApi(req);
    return privateApi(apiSuccess(await savePendingRevision((await context.params).id, await readJsonBody(req), auth.actor, auth.tokenId)));
  } catch (error) { return blogApiError(error); }
}
export async function DELETE(req: Request, context: Context) {
  try {
    const auth = await authenticateBlogApi(req);
    return privateApi(apiSuccess(await deletePendingRevision((await context.params).id, auth.actor, { tokenId: auth.tokenId })));
  } catch (error) { return blogApiError(error); }
}
