import { BlogEditorError } from "@/lib/blog-editor";
import { removeArticleImage, type ArticleImageRemoval } from "@/lib/blog-image-remove";
import { MSG } from "@/lib/user-messages";
import { sameBlogImageUrl } from "@/lib/blog-media-url";

/** Shared validation for persistence and unsaved previews. */
export function prepareArticleImageRemoval(content: string, change: ArticleImageRemoval, format: "html" | "markdown", coverImageUrl?: string | null) {
  if (sameBlogImageUrl(coverImageUrl, change.url)) throw new BlogEditorError(MSG.BLOG_IMAGE_REMOVE_COVER);
  const result = removeArticleImage(content, change.url, format);
  if (!result.found) throw new BlogEditorError(MSG.BLOG_IMAGE_NOT_FOUND, 404);
  if (result.count > 1 && !change.all)
    throw new BlogEditorError(`${MSG.BLOG_IMAGE_REMOVE_MULTIPLE} Найдено: ${result.count}.`, 409, { count: result.count });
  return result;
}
