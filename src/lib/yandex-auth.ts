import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { MSG } from "@/lib/user-messages";

const YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token";
const YANDEX_INFO_URL = "https://login.yandex.ru/info?format=json";

type YandexTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type YandexProfile = {
  id?: string;
  default_email?: string;
  login?: string;
  real_name?: string;
  display_name?: string;
  emails?: string[];
};

export function getYandexAuthConfig() {
  if (!env.YANDEX_CLIENT_ID || !env.YANDEX_CLIENT_SECRET || !env.YANDEX_REDIRECT_URI) {
    throw new Error(MSG.YANDEX_AUTH_NOT_CONFIGURED);
  }

  return {
    clientId: env.YANDEX_CLIENT_ID,
    clientSecret: env.YANDEX_CLIENT_SECRET,
    redirectUri: env.YANDEX_REDIRECT_URI,
  };
}

export function isYandexAuthConfigured() {
  return !!(env.YANDEX_CLIENT_ID && env.YANDEX_CLIENT_SECRET && env.YANDEX_REDIRECT_URI);
}

export async function exchangeYandexCode(code: string) {
  const config = getYandexAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(YANDEX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await response.json().catch(() => null)) as YandexTokenResponse | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || MSG.YANDEX_AUTH_FAILED);
  }

  return data.access_token;
}

export async function getYandexProfile(accessToken: string) {
  const response = await fetch(YANDEX_INFO_URL, {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  const data = (await response.json().catch(() => null)) as YandexProfile | null;

  if (!response.ok || !data?.id) {
    throw new Error(MSG.YANDEX_AUTH_FAILED);
  }

  const email = data.default_email ?? data.emails?.[0];
  if (!email) {
    throw new Error(MSG.YANDEX_EMAIL_REQUIRED);
  }

  return {
    yandexId: data.id,
    email: email.toLowerCase(),
    name: data.real_name || data.display_name || data.login || email,
  };
}

export async function linkYandexToUser(
  userId: string,
  profile: Awaited<ReturnType<typeof getYandexProfile>>
) {
  const db = getDb();
  const existingByYandex = await db.user.findUnique({ where: { yandexId: profile.yandexId } });
  if (existingByYandex && existingByYandex.id !== userId) {
    throw new Error(MSG.YANDEX_ALREADY_LINKED);
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(MSG.USER_NOT_FOUND);
  }

  return db.user.update({
    where: { id: userId },
    data: {
      yandexId: profile.yandexId,
      name: user.name || profile.name,
    },
  });
}
