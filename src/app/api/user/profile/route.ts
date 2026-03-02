import {
  createSessionToken,
  getSession,
  hashPassword,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { apiError, apiSuccess, getRequestId, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const session = await getSession();
  if (!session?.sub) {
    return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);
  }

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return apiError("User not found.", "NOT_FOUND", 404, undefined, requestId);
  }

  return apiSuccess({ user }, 200, requestId);
}

export async function PATCH(req: Request) {
  const requestId = getRequestId(req);
  const session = await getSession();
  if (!session?.sub) {
    return apiError("Unauthorized.", "UNAUTHORIZED", 401, undefined, requestId);
  }

  const raw = await readJsonBody(req);
  if (!raw) {
    return apiError("Invalid JSON body.", "BAD_REQUEST", 400, undefined, requestId);
  }

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(
      "Invalid payload.",
      "VALIDATION_ERROR",
      400,
      parsed.error.flatten(),
      requestId
    );
  }

  const data = parsed.data;
  const db = getDb();
  const existing = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  if (!existing) {
    return apiError("User not found.", "NOT_FOUND", 404, undefined, requestId);
  }

  const updates: { name?: string; email?: string; passwordHash?: string } = {};

  if (data.name !== undefined) {
    updates.name = data.name.trim();
  }
  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    if (email !== existing.email) {
      const conflict = await db.user.findUnique({ where: { email } });
      if (conflict) {
        return apiError("Такой email уже используется.", "CONFLICT", 409, undefined, requestId);
      }
      updates.email = email;
    }
  }

  if (data.newPassword && data.currentPassword) {
    const isTelegramUser = existing.passwordHash === "telegram-auth";
    if (isTelegramUser) {
      return apiError(
        "Смена пароля недоступна для аккаунтов, созданных через Telegram.",
        "FORBIDDEN",
        403,
        undefined,
        requestId
      );
    }

    const valid = await verifyPassword(data.currentPassword, existing.passwordHash);
    if (!valid) {
      return apiError("Неверный текущий пароль.", "VALIDATION_ERROR", 400, undefined, requestId);
    }

    updates.passwordHash = await hashPassword(data.newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return apiSuccess(
      { user: { id: existing.id, email: existing.email, name: existing.name } },
      200,
      requestId
    );
  }

  const updated = await db.user.update({
    where: { id: session.sub },
    data: updates,
    select: { id: true, email: true, name: true },
  });

  if (updates.email) {
    const token = await createSessionToken({ sub: updated.id, email: updated.email });
    await setAuthCookie(token);
  }

  return apiSuccess({ user: updated }, 200, requestId);
}
