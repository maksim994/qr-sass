import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { defaultStyle, renderQrPng, renderQrSvg } from "@/lib/qr";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]/download";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "png";

    const db = getDb();
    const qr = await db.qrCode.findUnique({
      where: { id },
    });
    if (!qr) {
      return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const style = (qr.styleConfig as Record<string, unknown> | null) ?? defaultStyle;
    const renderStyle = {
      foreground: typeof style.foreground === "string" ? style.foreground : defaultStyle.foreground,
      background: typeof style.background === "string" ? style.background : defaultStyle.background,
      margin: typeof style.margin === "number" ? style.margin : defaultStyle.margin,
      errorCorrectionLevel:
        style.errorCorrectionLevel === "L" ||
        style.errorCorrectionLevel === "M" ||
        style.errorCorrectionLevel === "Q" ||
        style.errorCorrectionLevel === "H"
          ? style.errorCorrectionLevel
          : defaultStyle.errorCorrectionLevel,
    } as const;

    const safeFilename = qr.name.replace(/[^\w.-]/g, "_");
    const utf8Filename = encodeURIComponent(qr.name);

    if (format === "svg") {
      const svg = await renderQrSvg(qr.encodedContent, renderStyle);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}.svg"; filename*=UTF-8''${utf8Filename}.svg`,
        },
      });
    }

    const png = await renderQrPng(qr.encodedContent, renderStyle);
    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${safeFilename}.png"; filename*=UTF-8''${utf8Filename}.png`,
      },
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Unexpected download error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError("Could not generate download.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
