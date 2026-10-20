import { nanoid } from "nanoid";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { validateFileType } from "@/lib/file-validation";
import { uploadFile, getBlogCoverKey, getBlogContentImageKey } from "@/lib/s3";
import { optimizeBlogImageVariants } from "@/lib/image-optimize";
import { imageAltSchema } from "@/lib/blog-image-input";
export { imageAltSchema } from "@/lib/blog-image-input";
import { getDb } from "@/lib/db";
import { deleteFile } from "@/lib/s3";
import { blogImageFigure, type ImageVariant } from "@/lib/blog-image-markup";
import type { BlogActor } from "@/lib/blog-versions";
import { BlogEditorError } from "@/lib/blog-editor";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export type BlogImageKind = "cover" | "content";

export async function readBlogImageForm(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new BlogEditorError(MSG.BLOG_IMAGE_INPUT);
  const reader = request.body?.getReader();
  if (!reader) throw new BlogEditorError(MSG.FILE_REQUIRED);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 11 * 1024 * 1024) {
      await reader.cancel();
      throw new BlogEditorError(MSG.BLOG_IMAGE_SIZE);
    }
    chunks.push(value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new BlogEditorError(MSG.BLOG_IMAGE_INPUT);
  }
}
export async function storeBlogImage(
  form: FormData,
  kind: BlogImageKind,
  actor: BlogActor,
) {
  const alt = imageAltSchema.safeParse(form.get("alt"));
  if (!alt.success) throw new BlogEditorError(MSG.BLOG_IMAGE_ALT);
  const file = form.get("file");
  if (!(file instanceof File)) throw new BlogEditorError(MSG.FILE_REQUIRED);
  if (file.size > MAX_SIZE) throw new BlogEditorError(MSG.BLOG_IMAGE_SIZE);
  if (!ALLOWED_TYPES.has(file.type))
    throw new BlogEditorError(MSG.BLOG_IMAGE_TYPE);
  const buffer = Buffer.from(await file.arrayBuffer()),
    detected = await validateFileType(buffer);
  if (
    !detected ||
    detected.mime !== file.type ||
    !ALLOWED_TYPES.has(detected.mime)
  )
    throw new BlogEditorError(MSG.BLOG_IMAGE_TYPE);
  let optimized: Awaited<ReturnType<typeof optimizeBlogImageVariants>>;
  try {
    optimized = await optimizeBlogImageVariants(buffer);
  } catch {
    throw new BlogEditorError(MSG.BLOG_IMAGE_SIZE);
  }
  const id = nanoid(16),
    variants: ImageVariant[] = [];
  try {
    for (const image of optimized) {
      const key =
        kind === "cover"
          ? getBlogCoverKey(`${id}-${image.width}`)
          : getBlogContentImageKey(`${id}-${image.width}`);
      const entry = { key, url: "", width: image.width, height: image.height };
      variants.push(entry);
      entry.url = await uploadFile(image.buffer, key, "image/webp", "public");
    }
    const largest = variants.at(-1)!;
    const row = await getDb().blogImage.create({
      data: {
        id,
        url: largest.url,
        kind,
        alt: alt.data,
        width: largest.width,
        height: largest.height,
        variants,
        actorName: actor.actorName,
      },
    });
    return {
      ...row,
      variants,
      figure: blogImageFigure({ ...row, variants }),
      srcset: variants.map((v) => `${v.url} ${v.width}w`).join(", "),
    };
  } catch (error) {
    await Promise.allSettled(variants.map((v) => deleteFile(v.key)));
    throw error;
  }
}
export async function discardBlogImage(image: {
  id: string;
  variants: ImageVariant[];
}) {
  await getDb().blogImage.deleteMany({ where: { id: image.id } });
  await Promise.allSettled(image.variants.map((v) => deleteFile(v.key)));
}

export async function handleBlogImageUpload(
  request: Request,
  kind: BlogImageKind,
  actor: BlogActor,
) {
  const requestId = getRequestId(request);

  try {
    const formData = await readBlogImageForm(request);
    const image = await storeBlogImage(formData, kind, actor);
    await getDb().blogEvent.create({
      data: {
        postId: `image:${image.id}`,
        postTitle: `Изображение: ${image.alt}`,
        ...actor,
        type: "image_upload",
        fields: [],
      },
    });
    return apiSuccess(image, 201);
  } catch (err) {
    if (err instanceof BlogEditorError)
      return apiError(
        err.message,
        "VALIDATION_ERROR",
        err.status,
        undefined,
        requestId,
      );
    return apiError(
      MSG.BLOG_IMAGE_FAILED,
      "INTERNAL_ERROR",
      500,
      undefined,
      requestId,
    );
  }
}
