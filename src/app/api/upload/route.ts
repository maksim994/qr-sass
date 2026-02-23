import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { uploadFile, getS3Key } from "@/lib/s3";
import { nanoid } from "nanoid";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "audio/mpeg",
  "audio/mp3",
  "video/mp4",
  "video/webm",
]);

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return map[mime] || "bin";
}

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

    const fileId = nanoid(12);
    const ext = extFromMime(file.type);
    const key = getS3Key(workspaceId, fileId, ext);
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadFile(buffer, key, file.type);

    const db = getDb();
    const record = await db.uploadedFile.create({
      data: {
        workspaceId,
        key,
        filename: file.name,
        mimeType: file.type,
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
      details: { fileId: record.id, key, mimeType: file.type, sizeBytes: file.size },
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
