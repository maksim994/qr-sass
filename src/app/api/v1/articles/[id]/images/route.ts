import { articleImagePatchSchema } from "@/lib/blog-image-input";
import { getDb } from "@/lib/db";
import { authenticateBlogApi } from "@/lib/blog-api-tokens";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { blogApiError, privateApi, articleApiView } from "@/lib/blog-api";
import {
  readBlogImageForm,
  storeBlogImage,
  discardBlogImage,
} from "@/lib/blog-image-upload";
import { saveArticleApi, saveArticleImage } from "@/lib/blog-workflow";
import { BlogEditorError } from "@/lib/blog-editor";
import { MSG } from "@/lib/user-messages";
import { notifyArticleIndexNow } from "@/lib/blog-indexnow";
type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, context: Context) {
  try {
    const auth = await authenticateBlogApi(req),
      { id } = await context.params;
    const form = await readBlogImageForm(req),
      versionValue = form.get("version"),
      kind = form.get("kind");
    if (
      typeof versionValue !== "string" ||
      !/^\d+$/.test(versionValue) ||
      !Number.isSafeInteger(Number(versionValue)) ||
      !["cover", "content"].includes(String(kind))
    )
      throw new BlogEditorError(MSG.BLOG_IMAGE_INPUT);
    const version = Number(versionValue),
      db = getDb(),
      before = await db.blogPost.findUnique({ where: { id } });
    if (!before) throw new BlogEditorError(MSG.POST_NOT_FOUND, 404);
    const latest = await db.blogRevision.findFirst({
      where: { postId: id },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    if (version !== (latest?.number ?? 0))
      throw new BlogEditorError(MSG.BLOG_SAVE_CONFLICT, 409);
    if (kind === "content" && before.format !== "markdown")
      throw new BlogEditorError(MSG.BLOG_LEGACY_READONLY);
    const image = await storeBlogImage(
      form,
      kind as "cover" | "content",
      auth.actor,
    );
    let saved: Awaited<ReturnType<typeof saveArticleApi>>;
    try {
      saved = await saveArticleApi(
        kind === "cover"
          ? {
              coverImageUrl: image.url,
              coverImageAlt: image.alt,
              comment: "Загружена обложка через API",
            }
          : {
              content: `${before.content}\n\n${image.figure}`,
              comment: "Загружено изображение в текст через API",
            },
        auth.actor,
        auth.tokenId,
        id,
        version,
      );
    } catch (error) {
      await discardBlogImage(image);
      throw error;
    }
    if (saved.post.publishedAt && saved.editorialChanged)
      await notifyArticleIndexNow(saved.post.slug);
    return privateApi(
      apiSuccess(
        { image, article: articleApiView(saved.post, saved.version) },
        201,
      ),
    );
  } catch (error) {
    return blogApiError(error);
  }
}
export async function PATCH(req: Request, context: Context) {
  try {
    const auth = await authenticateBlogApi(req),
      { id } = await context.params;
    const parsed = articleImagePatchSchema.safeParse(await readJsonBody(req));
    if (!parsed.success)
      return privateApi(
        apiError(MSG.BLOG_IMAGE_PATCH_INPUT, "VALIDATION_ERROR", 400),
      );
    const { version, minorEdit, comment, ...change } = parsed.data,
      saved = await saveArticleImage(
        id,
        version,
        change,
        auth.actor,
        auth.tokenId,
        { comment, minorEdit },
      );
    if (saved.post.publishedAt && saved.editorialChanged)
      await notifyArticleIndexNow(saved.post.slug);
    return privateApi(apiSuccess(articleApiView(saved.post, saved.version)));
  } catch (error) {
    return blogApiError(error);
  }
}
