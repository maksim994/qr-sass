import { QrContentType, QrKind } from "@prisma/client";
import { MSG } from "@/lib/user-messages";
import { isSafeUrl } from "@/lib/url";
import { workspaceFileIdFromPath } from "@/lib/workspace-file-path";
import { z } from "zod";

export const safeUrlSchema = z.string().refine(isSafeUrl, {
  message: MSG.ONLY_HTTPS_HTTP_URL,
});

import { DEFAULT_WORKSPACE_NAME } from "@/lib/workspace-name";
export { DEFAULT_WORKSPACE_NAME } from "@/lib/workspace-name";

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
  remember: z.boolean().optional(),
  consent: z.boolean().refine(val => val === true, {
    message: "Необходимо согласие на обработку персональных данных",
  }).optional(), // Optional for backward compatibility with API, but required on frontend
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
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
  )
  .refine(
    (d) => !d.email || (d.currentPassword != null && d.currentPassword.length > 0),
    { message: "Текущий пароль обязателен для смены email", path: ["currentPassword"] }
  );

const opaqueHex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Укажите непрозрачный HEX-цвет");

export const styleSchema = z.object({
  dotType: z.enum(["square", "dots", "rounded", "classy", "classy-rounded", "extra-rounded"]).default("square"),
  dotColor: opaqueHex.default("#111111"),
  dotGradient: z.object({
    type: z.enum(["linear", "radial"]),
    colors: z.tuple([opaqueHex, opaqueHex]),
    rotation: z.number().optional(),
  }).optional(),

  bgColor: opaqueHex.default("#ffffff"),
  bgTransparent: z.boolean().default(false),
  bgGradient: z.object({
    type: z.enum(["linear", "radial"]),
    colors: z.tuple([opaqueHex, opaqueHex]),
    rotation: z.number().optional(),
  }).optional(),

  cornerSquareType: z.enum(["square", "dot", "extra-rounded"]).default("square"),
  cornerSquareColor: opaqueHex.default("#111111"),

  cornerDotType: z.enum(["square", "dot"]).default("square"),
  cornerDotColor: opaqueHex.default("#111111"),

  frameStyle: z.string().optional(),
  frameColor: z.string().optional(),
  frameText: z.string().optional(),

  logoFileId: z.string().max(64).optional(),
  logoUrl: z
    .string()
    .max(2048)
    .optional()
    .refine((value) => !value || value.startsWith("data:image/") || isSafeUrl(value) || (value.startsWith("/") && !value.includes("..")), {
      message: "Логотип: только https, относительный путь или data:image.",
    }),
  logoScale: z.number().min(0).max(0.3).default(0),
  logoMargin: z.number().min(0).max(20).default(0),

  margin: z.number().int().min(0).max(16).default(2),
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).default("M"),
});

function nonempty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasNamedMenuItem(payload: Record<string, unknown>): boolean {
  const categories = payload.categories;
  if (!Array.isArray(categories)) return nonempty(payload.title).length > 0;
  return categories.some((category) => {
    if (!category || typeof category !== "object") return false;
    const items = (category as { items?: unknown }).items;
    if (!Array.isArray(items)) return nonempty((category as { name?: unknown }).name).length > 0;
    return items.some((item) => item && typeof item === "object" && nonempty((item as { name?: unknown }).name));
  });
}

/** Reject empty/incomplete payloads before they are stored. */
export function payloadMeetsType(payload: Record<string, unknown>, contentType: string): boolean {
  switch (contentType) {
    case "URL":
      return nonempty(payload.url).length > 0;
    case "TEXT":
      return nonempty(payload.text).length > 0;
    case "EMAIL":
      return nonempty(payload.email).length > 0;
    case "PHONE":
    case "WHATSAPP":
    case "SMS":
      return nonempty(payload.phone).length > 0;
    case "WIFI":
      return nonempty(payload.ssid).length > 0;
    case "VCARD":
      return Boolean(
        nonempty(payload.firstName) ||
          nonempty(payload.lastName) ||
          nonempty(payload.organization) ||
          nonempty(payload.phone) ||
          nonempty(payload.email),
      );
    case "LOCATION": {
      const lat = Number(payload.latitude);
      const lng = Number(payload.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng) && nonempty(payload.latitude) !== "" && nonempty(payload.longitude) !== "";
    }
    case "MENU":
      return hasNamedMenuItem(payload);
    case "PDF":
    case "IMAGE":
    case "MP3":
      return nonempty(payload.fileUrl).length > 0;
    case "VIDEO":
      return nonempty(payload.videoUrl) !== "" || nonempty(payload.fileUrl) !== "";
    case "LINK_LIST":
      return Array.isArray(payload.links) && payload.links.some((link) => link && typeof link === "object" && nonempty((link as { url?: unknown }).url));
    case "BUSINESS":
    case "SOCIAL_LINKS":
      return nonempty(payload.name) !== "" || nonempty(payload.title) !== "" || nonempty(payload.website) !== "";
    case "COUPON":
      return nonempty(payload.code) !== "" || nonempty(payload.title) !== "";
    case "APP_STORE":
      return nonempty(payload.iosUrl) !== "" || nonempty(payload.androidUrl) !== "" || nonempty(payload.url) !== "";
    case "INSTAGRAM":
    case "FACEBOOK":
      return nonempty(payload.username) !== "" || nonempty(payload.pageUrl) !== "";
    default:
      return Object.keys(payload).length > 0;
  }
}

function isHttpOrOwnedWorkspaceFileUrl(url: unknown, fileId?: unknown): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  if (isSafeUrl(url)) return true;
  const pathId = workspaceFileIdFromPath(url);
  if (!pathId) return false;
  if (typeof fileId === "string" && fileId && fileId !== pathId) return false;
  return true;
}

function validatePayloadUrls(payload: Record<string, unknown>, contentType: string): boolean {
  const check = (url: unknown) => typeof url === "string" && isSafeUrl(url);

  if (["PDF", "IMAGE", "MP3"].includes(contentType)) {
    const fileUrl = payload.fileUrl;
    if (fileUrl !== undefined && fileUrl !== null && !isHttpOrOwnedWorkspaceFileUrl(fileUrl, payload.fileId)) {
      return false;
    }
  }
  if (contentType === "VIDEO") {
    const videoUrl = payload.videoUrl ?? payload.fileUrl;
    if (videoUrl !== undefined && videoUrl !== null && !isHttpOrOwnedWorkspaceFileUrl(videoUrl, payload.fileId)) {
      return false;
    }
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
    if (logoUrl !== undefined && logoUrl !== null && !isHttpOrOwnedWorkspaceFileUrl(logoUrl, payload.logoFileId)) {
      return false;
    }
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
    (d) => payloadMeetsType(d.payload, d.contentType),
    { message: MSG.INVALID_PAYLOAD, path: ["payload"] }
  )
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
