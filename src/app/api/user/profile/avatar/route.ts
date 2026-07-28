import { getSession } from "@/lib/auth";
import { MSG } from "@/lib/user-messages";
import { apiError, apiSuccess, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { validateFileType } from "@/lib/file-validation";
import { uploadFile, getAvatarKey } from "@/lib/s3";
import { nanoid } from "nanoid";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const session = await getSession();
  if (!session?.sub) {
    return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return apiError("Файл не выбран.", "BAD_REQUEST", 400, undefined, requestId);
  }

  if (file.size > MAX_SIZE) {
    return apiError("Аватар слишком большой. Максимум 2 МБ.", "VALIDATION_ERROR", 400, undefined, requestId);
  }

  if (!ALLOWED.has(file.type)) {
    return apiError("Поддерживаются только JPG, PNG, WebP и GIF.", "VALIDATION_ERROR", 400, undefined, requestId);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const validated = await validateFileType(buffer);
    if (!validated || !ALLOWED.has(validated.mime)) {
      return apiError("Некорректный формат изображения.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    const fileId = nanoid(12);
    const key = getAvatarKey(session.sub, fileId, validated.ext);
    const url = await uploadFile(buffer, key, validated.mime);

    const db = getDb();
    const updated = await db.user.update({
      where: { id: session.sub },
      data: { avatarUrl: url },
      select: { avatarUrl: true },
    });

    return apiSuccess({ avatarUrl: updated.avatarUrl }, 200, requestId);
  } catch {
    return apiError("Не удалось загрузить аватар.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}

export async function DELETE(request: Request) {
  const requestId = getRequestId(request);
  const session = await getSession();
  if (!session?.sub) {
    return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
  }

  const db = getDb();
  await db.user.update({
    where: { id: session.sub },
    data: { avatarUrl: null },
  });

  return apiSuccess({ avatarUrl: null }, 200, requestId);
}
