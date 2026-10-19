import { env } from "@/lib/env";
import { MSG } from "@/lib/user-messages";
import { publicSiteUrl } from "@/lib/public-url";

export function getYandexAuthConfig() {
  if (
    !isYandexAuthConfigured()
  ) {
    throw new Error(MSG.YANDEX_AUTH_NOT_CONFIGURED);
  }

  return {
    clientId: env.YANDEX_CLIENT_ID!,
    clientSecret: env.YANDEX_CLIENT_SECRET!,
    redirectUri: env.YANDEX_REDIRECT_URI!,
  };
}

export function isYandexAuthConfigured() {
  return !!(
    env.YANDEX_AUTH_ENABLED &&
    env.YANDEX_CLIENT_ID?.trim() &&
    env.YANDEX_CLIENT_SECRET?.trim() &&
    env.YANDEX_REDIRECT_URI === publicSiteUrl("/api/auth/yandex/callback")
  );
}
