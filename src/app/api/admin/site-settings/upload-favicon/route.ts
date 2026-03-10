import { getAdminOrNull } from "@/lib/admin-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { validateFileType } from "@/lib/file-validation";
import { uploadFile, getFaviconKey } from "@/lib/s3";
import { nanoid } from "nanoid";

const MAX_SIZE = 1024 * 512; // 512 KB
const ALLOWED_TYPES = new Set([
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/png",
  "image/webp",
]);

const EXT_MAP: Record<string, string> = {
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const admin = await getAdminOrNull();
  if (!admin) return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return apiError("file is required.", "BAD_REQUEST", 400, undefined, requestId);

    if (file.size > MAX_SIZE) {
      return apiError("Файл слишком большой. Максимум 512 КБ.", "VALIDATION_ERROR", 400, undefined, requestId);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError("Поддерживаются только ICO, PNG, WebP.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = await validateFileType(buffer);
    if (!validated || !ALLOWED_TYPES.has(validated.mime)) {
      return apiError("Содержимое файла не совпадает с заявленным типом.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const ext = EXT_MAP[validated.mime] ?? "png";
    const fileId = nanoid(12);
    const key = getFaviconKey(fileId, ext);
    const url = await uploadFile(buffer, key, validated.mime);

    return apiSuccess({ url, key });
  } catch (err) {
    console.error("Favicon upload error:", err);
    return apiError("Не удалось загрузить favicon.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
