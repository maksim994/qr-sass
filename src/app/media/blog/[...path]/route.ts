import { blogMedia } from "@/lib/blog-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, context: Context) {
  return blogMedia.handle(req, (await context.params).path);
}
export async function HEAD(req: Request, context: Context) {
  return blogMedia.handle(req, (await context.params).path);
}
