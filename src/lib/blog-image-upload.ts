import { nanoid } from "nanoid";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { validateFileType } from "@/lib/file-validation";
import { uploadFile, getBlogCoverKey, getBlogContentImageKey } from "@/lib/s3";
import { optimizeImageForBlog } from "@/lib/image-optimize";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export type BlogImageKind = "cover" | "content";

export async function handleBlogImageUpload(request: Request, kind: BlogImageKind) {
  const requestId = getRequestId(request);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError(MSG.FILE_REQUIRED, "BAD_REQUEST", 400, undefined, requestId);

    if (file.size > MAX_SIZE) {
      return apiError("Файл слишком большой. Максимум 10 МБ.", "VALIDATION_ERROR", 400, undefined, requestId);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError("Поддерживаются только JPEG, PNG, GIF, WebP.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = await validateFileType(buffer);
    if (!validated || !ALLOWED_TYPES.has(validated.mime)) {
      return apiError("Содержимое файла не совпадает с заявленным типом.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const optimized = await optimizeImageForBlog(buffer);
    const fileId = nanoid(12);
    const key = kind === "cover" ? getBlogCoverKey(fileId) : getBlogContentImageKey(fileId);
    const url = await uploadFile(optimized, key, "image/webp");

    return apiSuccess({ url, key });
  } catch (err) {
    console.error(`Blog ${kind} image upload error:`, err);
    return apiError("Не удалось загрузить изображение.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
