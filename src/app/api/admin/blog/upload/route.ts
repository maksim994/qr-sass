import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { validateFileType } from "@/lib/file-validation";
import { uploadFile, getBlogCoverKey } from "@/lib/s3";
import { optimizeImageForBlog } from "@/lib/image-optimize";
import { nanoid } from "nanoid";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("file is required.", "BAD_REQUEST", 400, undefined, requestId);

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
    const key = getBlogCoverKey(fileId);
    const url = await uploadFile(optimized, key, "image/webp");

    return apiSuccess({ url, key });
  } catch (err) {
    console.error("Blog cover upload error:", err);
    return apiError("Не удалось загрузить изображение.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
