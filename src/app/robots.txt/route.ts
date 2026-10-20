import { NextResponse } from "next/server";
import { getSiteSettings, getDefaultRobotsTxt } from "@/lib/site-settings";
import { allowBlogMediaRobots } from "@/lib/blog-media-robots";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSiteSettings();
  const content =
    settings.robotsTxtContent?.trim() || getDefaultRobotsTxt();
  return new NextResponse(allowBlogMediaRobots(content), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
