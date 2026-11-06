import { createBlogMediaHandler } from "@/lib/blog-media-http";
import { getPublicAssetObject } from "@/lib/s3";
import { publicAssetKey } from "@/lib/public-media-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const media = createBlogMediaHandler(getPublicAssetObject, 16 * 1024 * 1024, 128, publicAssetKey);
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  return media.handle(request, (await context.params).path);
}
export async function HEAD(request: Request, context: Context) {
  return media.handle(request, (await context.params).path);
}
