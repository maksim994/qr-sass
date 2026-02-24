import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { validateFileType } from "@/lib/file-validation";
import { logger } from "@/lib/logger";
import { uploadFile, getS3Key } from "@/lib/s3";
import { nanoid } from "nanoid";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/mp3",
  "video/mp4",
  "video/webm",
]);

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const route = "/api/upload";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = formData.get("workspaceId") as string | null;

    if (!file || !workspaceId) {
      return apiError("file and workspaceId are required.", "BAD_REQUEST", 400, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === workspaceId);
    if (!isMember) return unauthorized();

    if (file.size > MAX_SIZE) {
      return apiError("Файл слишком большой. Максимум 10 МБ.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return apiError("Неподдерживаемый формат файла.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = await validateFileType(buffer);
    if (!validated || validated.mime !== file.type) {
      return apiError("Содержимое файла не совпадает с заявленным типом.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const fileId = nanoid(12);
    const ext = validated.ext;
    const key = getS3Key(workspaceId, fileId, ext);
    const url = await uploadFile(buffer, key, validated.mime);

    const db = getDb();
    const record = await db.uploadedFile.create({
      data: {
        workspaceId,
        key,
        filename: file.name,
        mimeType: validated.mime,
        sizeBytes: file.size,
        url,
      },
    });

    logger.info({
      area: "api",
      route,
      requestId,
      message: "File uploaded",
      status: 200,
      details: { fileId: record.id, key, mimeType: validated.mime, sizeBytes: file.size },
    });

    return apiSuccess({ fileId: record.id, url, key, filename: file.name }, 200, requestId);
  } catch (error) {
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Upload failed",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message } : error,
    });
    return apiError("Не удалось загрузить файл.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
