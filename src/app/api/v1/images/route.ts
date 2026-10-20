import { authenticateBlogApi, assertActiveBlogToken } from "@/lib/blog-api-tokens";
import { apiSuccess } from "@/lib/api-response";
import { blogApiError, privateApi } from "@/lib/blog-api";
import { readBlogImageForm, storeBlogImage, discardBlogImage } from "@/lib/blog-image-upload";
import { getDb } from "@/lib/db";
import { BlogEditorError } from "@/lib/blog-editor";
import { MSG } from "@/lib/user-messages";

export async function POST(req: Request) {
  try {
    const auth = await authenticateBlogApi(req);
    const form = await readBlogImageForm(req);
    const kind = form.get("kind") ?? "content";
    if (kind !== "content" && kind !== "cover") throw new BlogEditorError(MSG.BLOG_IMAGE_INPUT);
    const image = await storeBlogImage(form, kind, auth.actor);
    try {
      await getDb().$transaction(async tx => {
        await assertActiveBlogToken(tx, auth.tokenId);
        await tx.blogEvent.create({ data: {
          postId: `image:${image.id}`, postTitle: `Изображение: ${image.alt}`,
          ...auth.actor, type: "image_upload", fields: [],
        } });
      });
    } catch (error) {
      await discardBlogImage(image);
      throw error;
    }
    return privateApi(apiSuccess(image, 201));
  } catch (error) {
    return blogApiError(error);
  }
}
