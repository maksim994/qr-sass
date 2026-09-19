import crypto from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { getSession } from "@/lib/auth";
import { classifyOpen, FUNNEL_EVENTS, recordFunnelEvent } from "@/lib/funnel";

function parseUtm(urlString?: string | null) {
  if (!urlString) return {};
  try {
    const url = new URL(urlString);
    return {
      utmSource: url.searchParams.get("utm_source") ?? undefined,
      utmMedium: url.searchParams.get("utm_medium") ?? undefined,
      utmCampaign: url.searchParams.get("utm_campaign") ?? undefined,
      utmTerm: url.searchParams.get("utm_term") ?? undefined,
      utmContent: url.searchParams.get("utm_content") ?? undefined,
    };
  } catch {
    return {};
  }
}

export function parseUserAgent(ua: string) {
  const bot = /bot|crawler|spider|slurp|facebookexternalhit|preview|whatsapp|telegram|discord|slackbot/i.test(ua);
  const tablet = /iPad|Tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const mobile = /Mobile|Android|iPhone|iPod|webOS|BlackBerry/i.test(ua);

  const deviceType = bot ? "bot" : tablet ? "tablet" : mobile ? "mobile" : "desktop";

  let os: string | null = null;
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows Phone/i.test(ua)) os = "Windows Phone";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/CrOS/i.test(ua)) os = "Chrome OS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { deviceType, os, browser: parseBrowserFamily(ua) };
}

export function parseBrowserFamily(ua: string): string | null {
  if (!ua) return null;
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Other";
}

function hashClientIp(ip: string): string | undefined {
  const secret = process.env.ANALYTICS_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) return undefined;
  return crypto.createHmac("sha256", secret).update(ip).digest("hex");
}

export async function trackScan(
  qrCodeId: string,
  destinationUrl?: string | null,
  abVariant?: "A" | "B" | null,
  viewerUserId?: string | null,
) {
  const db = getDb();
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const ua = h.get("user-agent") ?? "";
  const referer = h.get("referer") ?? undefined;
  const { deviceType, os, browser } = parseUserAgent(ua);

  await db.scanEvent.create({
    data: {
      qrCodeId,
      referer,
      deviceType,
      os,
      browser,
      ipHash: ip ? hashClientIp(ip) : undefined,
      abVariant: abVariant ?? null,
      ...parseUtm(destinationUrl),
    },
  });

  const qr = await db.qrCode.findUnique({
    where: { id: qrCodeId },
    select: {
      workspaceId: true,
      workspace: { select: { memberships: { select: { userId: true } } } },
    },
  });
  if (!qr) return;

  const sessionUserId =
    viewerUserId !== undefined ? viewerUserId : ((await getSession().catch(() => null))?.sub ?? null);
  const classified = classifyOpen({
    userAgent: ua,
    ip: ip ?? null,
    referer: referer ?? null,
    viewerUserId: sessionUserId,
    ownerUserIds: qr.workspace.memberships.map((member) => member.userId),
  });
  if (!classified.isExternal) return;

  await recordFunnelEvent({
    name: FUNNEL_EVENTS.first_external_open,
    workspaceId: qr.workspaceId,
    qrCodeId,
    userId: sessionUserId,
    isTest: false,
    oncePerQr: true,
  });
}
