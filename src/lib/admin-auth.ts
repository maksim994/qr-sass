import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getApiUser } from "@/lib/api-auth";

/** Для страниц — редирект при отсутствии прав */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.sub) redirect("/login");

  const db = getDb();
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user?.isAdmin) redirect("/dashboard");
  return user;
}

/** Для API — возвращает user или null, без редиректа */
export async function getAdminOrNull() {
  const session = await getSession();
  if (!session?.sub) return null;

  const db = getDb();
  const user = await db.user.findUnique({ where: { id: session.sub } });
  return user?.isAdmin ? user : null;
}

/** Возвращает admin если: сессия admin ИЛИ API key принадлежит admin */
export async function getAdminOrNullFromSessionOrApiKey() {
  const apiUser = await getApiUser();
  if (!apiUser) return null;
  const db = getDb();
  const user = await db.user.findUnique({ where: { id: apiUser.id } });
  return user?.isAdmin ? user : null;
}
