import { z } from "zod";
import { getAdminOrNull } from "@/lib/admin-auth";
import { apiSuccess, apiError, readJsonBody } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { publishPendingRevision, deletePendingRevision } from "@/lib/blog-pending-revision";
import { notifyArticleIndexNow } from "@/lib/blog-indexnow";
import { MSG } from "@/lib/user-messages";
const schema = z.object({ id: z.string().min(1), updatedAt: z.iso.datetime({ offset: true }) }).strict();
type Context = { params: Promise<{ id: string }> };
async function change(req: Request, context: Context, publish: boolean) {
  try {
    const admin = await getAdminOrNull();
    if (!admin) return privateApi(apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401));
    const parsed = schema.safeParse(await readJsonBody(req));
    if (!parsed.success) return privateApi(apiError(MSG.BLOG_INPUT_INVALID, "VALIDATION_ERROR", 400));
    const actor = { actorId: admin.id, actorName: admin.email, source: "admin" as const };
    const { id } = await context.params;
    if (publish) {
      const post = await publishPendingRevision(id, parsed.data, actor);
      await notifyArticleIndexNow(post.slug);
    } else await deletePendingRevision(id, actor, { expected: parsed.data });
    return privateApi(apiSuccess({ id }));
  } catch (error) { return blogApiError(error); }
}
export async function POST(req: Request, context: Context) { return change(req, context, true); }
export async function DELETE(req: Request, context: Context) { return change(req, context, false); }
