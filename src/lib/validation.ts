import { QrContentType, QrKind } from "@prisma/client";
import { MSG } from "@/lib/user-messages";
import { isSafeUrl } from "@/lib/url";
import { z } from "zod";

export const safeUrlSchema = z.string().refine(isSafeUrl, {
  message: MSG.ONLY_HTTPS_HTTP_URL,
});

export const DEFAULT_WORKSPACE_NAME = "Моя команда";

export function getValidationErrorMessage(error: z.ZodError): string | null {
  const flattened = error.flatten();
  const fieldMessages = Object.values(flattened.fieldErrors)
    .flat()
    .filter((msg): msg is string => typeof msg === "string" && msg.length > 0);
  if (fieldMessages.length > 0) return fieldMessages[0];
  if (flattened.formErrors.length > 0) return flattened.formErrors[0];
  return null;
}

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Имя должно содержать минимум 2 символа")
    .max(120, "Имя не должно превышать 120 символов"),
  email: z.string().email("Укажите корректный email"),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .max(128, "Пароль не должен превышать 128 символов"),
  workspaceName: z
    .string()
    .max(120)
    .optional()
    .transform((val) => {
      const trimmed = (val ?? "").trim();
      return trimmed || DEFAULT_WORKSPACE_NAME;
    }),
  consent: z.boolean().refine(val => val === true, {
    message: "Необходимо согласие на обработку персональных данных",
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  consent: z.boolean().refine(val => val === true, {
    message: "Необходимо согласие на обработку персональных данных",
  }).optional(), // Optional for backward compatibility with API, but required on frontend
});

export const profileUpdateSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine(
    (d) => !d.newPassword || (d.currentPassword != null && d.currentPassword.length > 0),
    { message: "Текущий пароль обязателен для смены", path: ["currentPassword"] }
  );

export const styleSchema = z.object({
  dotType: z.enum(["square", "dots", "rounded", "classy", "classy-rounded", "extra-rounded"]).default("square"),
  dotColor: z.string().default("#111111"),
  dotGradient: z.object({
    type: z.enum(["linear", "radial"]),
    colors: z.tuple([z.string(), z.string()]),
    rotation: z.number().optional(),
  }).optional(),

  bgColor: z.string().default("#ffffff"),
  bgTransparent: z.boolean().default(false),
  bgGradient: z.object({
    type: z.enum(["linear", "radial"]),
    colors: z.tuple([z.string(), z.string()]),
    rotation: z.number().optional(),
  }).optional(),

  cornerSquareType: z.enum(["square", "dot", "extra-rounded"]).default("square"),
  cornerSquareColor: z.string().default("#111111"),

  cornerDotType: z.enum(["square", "dot"]).default("square"),
  cornerDotColor: z.string().default("#111111"),

  frameStyle: z.string().optional(),
  frameColor: z.string().optional(),
  frameText: z.string().optional(),

  logoFileId: z.string().optional(),
  logoUrl: z.string().optional(),
  logoScale: z.number().min(0).max(0.3).default(0),
  logoMargin: z.number().min(0).max(20).default(0),

  margin: z.number().int().min(0).max(16).default(2),
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
});

function validatePayloadUrls(payload: Record<string, unknown>, contentType: string): boolean {
  const check = (url: unknown) =>
    typeof url === "string" && isSafeUrl(url);

  if (["PDF", "IMAGE", "MP3"].includes(contentType)) {
    const fileUrl = payload.fileUrl;
    if (fileUrl !== undefined && fileUrl !== null && !check(fileUrl)) return false;
  }
  if (contentType === "VIDEO") {
    const videoUrl = payload.videoUrl ?? payload.fileUrl;
    if (videoUrl !== undefined && videoUrl !== null && !check(videoUrl)) return false;
  }
  if (contentType === "URL") {
    const url = payload.url;
    if (url !== undefined && url !== null && !check(url)) return false;
  }
  if (contentType === "LINK_LIST") {
    const links = payload.links;
    if (Array.isArray(links)) {
      for (const l of links) {
        if (l && typeof l === "object" && "url" in l && l.url != null && !check(l.url))
          return false;
      }
    }
  }
  if (["BUSINESS", "SOCIAL_LINKS"].includes(contentType)) {
    const website = payload.website;
    if (website !== undefined && website !== null) {
      const href = typeof website === "string" && website.startsWith("http")
        ? website
        : `https://${website}`;
      if (!check(href)) return false;
    }
    const logoUrl = payload.logo ?? payload.logoUrl;
    if (logoUrl !== undefined && logoUrl !== null && !check(logoUrl)) return false;
    const socialLinks = payload.socialLinks;
    if (Array.isArray(socialLinks)) {
      for (const l of socialLinks) {
        if (l && typeof l === "object" && "url" in l && l.url != null) {
          const href =
            typeof l.url === "string" && l.url.startsWith("http")
              ? l.url
              : `https://${l.url}`;
          if (!check(href)) return false;
        }
      }
    }
  }
  return true;
}

export const createQrSchema = z
  .object({
    workspaceId: z.string().min(1),
    projectId: z.string().optional(),
    name: z.string().min(1).max(120),
    kind: z.enum(QrKind),
    contentType: z.enum(QrContentType),
    payload: z.record(z.string(), z.unknown()).default({}),
    style: styleSchema,
    expireAt: z.string().datetime().optional(),
    maxScans: z.number().int().min(1).optional(),
    password: z.string().min(1).optional(),
  })
  .refine(
    (d) => validatePayloadUrls(d.payload, d.contentType),
    { message: MSG.INVALID_PAYLOAD_URL, path: ["payload"] }
  );

export const updateDynamicTargetSchema = z.object({
  targetUrl: z.string().url().refine(isSafeUrl, {
    message: MSG.ONLY_HTTPS_HTTP_URL,
  }),
});

export const updateQrSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  style: styleSchema.optional(),
  expireAt: z.string().datetime().nullable().optional(),
  maxScans: z.number().int().min(1).nullable().optional(),
  password: z.string().optional(),
});

export { validatePayloadUrls };
