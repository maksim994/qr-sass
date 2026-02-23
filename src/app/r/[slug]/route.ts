import { NextResponse } from "next/server";
import { trackScan } from "@/lib/analytics";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const db = getDb();
    const qr = await db.qrCode.findFirst({
      where: {
        shortCode: slug,
        kind: "DYNAMIC",
        isArchived: false,
      },
      select: {
        id: true,
        currentTargetUrl: true,
      },
    });

    if (!qr?.currentTargetUrl) {
      logger.warn({
        area: "api",
        route: "/r/[slug]",
        message: "Dynamic QR target not found",
        code: "NOT_FOUND",
        status: 302,
        details: { slug },
      });
      return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
    }

    await trackScan(qr.id, qr.currentTargetUrl);
    return NextResponse.redirect(qr.currentTargetUrl);
  } catch (error) {
    logger.error({
      area: "api",
      route: "/r/[slug]",
      message: "Redirect route failed",
      code: "INTERNAL_ERROR",
      status: 302,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
  }
}
