import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { getYandexProfile } from "@/lib/yandex-auth";

export type YandexProfile = Awaited<ReturnType<typeof getYandexProfile>>;

/** Найти существующего пользователя по Яндекс ID или email (без создания). */
export async function findExistingYandexUser(profile: YandexProfile) {
  const db = getDb();

  const existingByYandex = await db.user.findUnique({ where: { yandexId: profile.yandexId } });
  if (existingByYandex) {
    return db.user.update({
      where: { id: existingByYandex.id },
      data: {
        name: existingByYandex.name || profile.name,
      },
    });
  }

  const existingByEmail = await db.user.findUnique({ where: { email: profile.email } });
  if (existingByEmail) {
    return db.user.update({
      where: { id: existingByEmail.id },
      data: {
        yandexId: profile.yandexId,
        name: existingByEmail.name || profile.name,
      },
    });
  }

  return null;
}

/** Создать пользователя после явного согласия (Яндекс ID). */
export async function createYandexUser(profile: YandexProfile) {
  const db = getDb();
  const passwordHash = await hashPassword(crypto.randomUUID());
  const workspaceSlug = `yandex-${profile.yandexId}-${nanoid(6)}`;

  return db.user.create({
    data: {
      email: profile.email,
      yandexId: profile.yandexId,
      name: profile.name,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          workspace: {
            create: {
              name: "Моя команда",
              slug: workspaceSlug,
            },
          },
        },
      },
    },
  });
}
