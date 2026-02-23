import { QrContentType, QrKind } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  workspaceName: z.string().min(2).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

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

export const createQrSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().optional(),
  name: z.string().min(1).max(120),
  kind: z.enum(QrKind),
  contentType: z.enum(QrContentType),
  payload: z.record(z.string(), z.unknown()).default({}),
  style: styleSchema,
});

export const updateDynamicTargetSchema = z.object({
  targetUrl: z.url(),
});

export const updateQrSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  style: styleSchema.optional(),
});
