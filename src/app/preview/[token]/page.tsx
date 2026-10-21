import { blogMediaImageSrc } from "@/lib/blog-media-url";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { hashPreviewToken } from "@/lib/blog-workflow";
import { pendingArticleView } from "@/lib/blog-pending-revision";
import { renderArticleBody } from "@/lib/blog-render";
import { sanitizeBlogFields } from "@/lib/blog-sanitize";
import { BlogPostContent } from "@/components/blog/blog-post-content";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Предпросмотр статьи", robots: { index: false, follow: false }, alternates: { canonical: null }, referrer: "no-referrer" };
export default async function PreviewArticle({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const link = await getDb().blogPreviewToken.findUnique({ where: { hash: hashPreviewToken(token), revokedAt: null }, include: { post: true, pendingRevision: true } });
  if (!link) notFound();
  const post = link.pendingRevision ? pendingArticleView(link.post, link.pendingRevision) : link.post;
  const copy = post.format === "markdown" ? post : { ...post, ...sanitizeBlogFields(post) };
  const body = renderArticleBody(copy.content, post.format === "markdown" ? "markdown" : "html", post.faq);
  return <main className="qrs-container py-10">
    <p>{link.pendingRevision ? "Предпросмотр черновика изменений" : "Предпросмотр сохранённой версии"} · Доступ по секретной ссылке</p>
    <h1 className="qrs-h1">{copy.title}</h1>
    {copy.excerpt && <p>{copy.excerpt}</p>}
    {post.coverImageUrl && <Image src={blogMediaImageSrc(post.coverImageUrl)} alt={copy.title} width={1200} height={630} unoptimized className="max-w-full h-auto rounded-xl" />}
    <BlogPostContent body={body} />
  </main>;
}
