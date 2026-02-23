import crypto from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

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

export async function trackScan(qrCodeId: string, destinationUrl?: string | null) {
  const db = getDb();
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim();
  const ua = h.get("user-agent") ?? "";
  const referer = h.get("referer") ?? undefined;

  const deviceType =
    /Mobile|Android|iPhone|iPad/i.test(ua) ? "mobile" : /Bot|Crawler|Spider/i.test(ua) ? "bot" : "desktop";

  const ipHash = ip
    ? crypto
        .createHash("sha256")
        .update(ip)
        .digest("hex")
    : undefined;

  await db.scanEvent.create({
    data: {
      qrCodeId,
      referer,
      deviceType,
      browser: ua.slice(0, 120),
      userAgentRaw: ua.slice(0, 512),
      ipHash,
      ...parseUtm(destinationUrl),
    },
  });
}
