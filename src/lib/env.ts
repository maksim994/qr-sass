import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";
const DEV_JWT_FALLBACK = "local-development-jwt-secret";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/qr_saas?schema=public"),
  JWT_SECRET: isProd
    ? z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters in production")
        .refine((value) => value !== DEV_JWT_FALLBACK, "JWT_SECRET must not use the development default")
    : z.string().min(16).default(DEV_JWT_FALLBACK),
  APP_URL: z.string().url().default("http://localhost:3000"),
  JWT_PREVIOUS_SECRET: z.string().min(16).optional(),
  JWT_ROTATED_AT: z.string().datetime({ offset: true }).optional(),
  REDIS_URL: z.string().url().optional(),
  ADMIN_INTEGRATIONS_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  YANDEX_CLIENT_ID: z.string().optional(),
  YANDEX_CLIENT_SECRET: z.string().optional(),
  YANDEX_REDIRECT_URI: z.string().url().optional(),
}).refine(value => Boolean(value.JWT_PREVIOUS_SECRET) === Boolean(value.JWT_ROTATED_AT), {
  message: "JWT_PREVIOUS_SECRET and JWT_ROTATED_AT must be configured together",
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_PREVIOUS_SECRET: process.env.JWT_PREVIOUS_SECRET || undefined,
  JWT_ROTATED_AT: process.env.JWT_ROTATED_AT || undefined,
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  REDIS_URL: process.env.REDIS_URL,
  ADMIN_INTEGRATIONS_KEY: process.env.ADMIN_INTEGRATIONS_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  YANDEX_CLIENT_ID: process.env.YANDEX_CLIENT_ID,
  YANDEX_CLIENT_SECRET: process.env.YANDEX_CLIENT_SECRET,
  YANDEX_REDIRECT_URI: process.env.YANDEX_REDIRECT_URI,
});
