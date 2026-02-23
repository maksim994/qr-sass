import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/qr_saas?schema=public"),
  JWT_SECRET: z.string().min(16).default("local-development-jwt-secret"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  REDIS_URL: z.string().url().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  REDIS_URL: process.env.REDIS_URL,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
});
