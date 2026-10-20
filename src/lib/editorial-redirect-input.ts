import { z } from "zod";
import { MSG } from "@/lib/user-messages";
export class RedirectError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export const redirectInput = z
  .object({
    source: z.string().min(1).max(2000),
    target: z.string().min(1).max(4000),
    comment: z.string().trim().max(2000).optional(),
  })
  .strict();
const reserved =
  /^\/(?:api|admin|dashboard|preview|r|p|g|v|_next|login|register|forgot-password|reset-password|mini|expired|unavailable)(?:\/|$)/i;
export function normalizeRedirectPath(value: string) {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\?#\u0000-\u0020\u007f]/.test(value)
  )
    throw new RedirectError(MSG.BLOG_REDIRECT_PATH);
  let path: string;
  try {
    path = decodeURIComponent(value);
  } catch {
    throw new RedirectError(MSG.BLOG_REDIRECT_PATH);
  }
  if (
    /[\\?#%\u0000-\u0020\u007f]/.test(path) ||
    path.split("/").some((s) => s === "." || s === "..")
  )
    throw new RedirectError(MSG.BLOG_REDIRECT_PATH);
  return encodeURI(
    path
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "")
      .toLowerCase() || "/",
  );
}
export function isEditorialRedirectPath(path: string) {
  return (
    !path.startsWith("/_") && !path.startsWith("/.") &&
    !reserved.test(path) &&
    !/\.(?:txt|xml|json|js|css|png|jpe?g|gif|webp|svg|ico|pdf|woff2?|map)$/i.test(
      path,
    )
  );
}
export function normalizeRedirectTarget(value: string) {
  if (/[\\\u0000-\u0020\u007f]/.test(value))
    throw new RedirectError(MSG.BLOG_REDIRECT_TARGET);
  let url: URL;
  try {
    url = new URL(value, "https://qr-s.ru");
  } catch {
    throw new RedirectError(MSG.BLOG_REDIRECT_TARGET);
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (!value.startsWith("/") && !/^https?:\/\//i.test(value))
  )
    throw new RedirectError(MSG.BLOG_REDIRECT_TARGET);
  if (["qr-s.ru", "www.qr-s.ru"].includes(url.hostname) && !url.port)
    return normalizeRedirectPath(url.pathname) + url.search + url.hash;
  if (value.startsWith("//")) throw new RedirectError(MSG.BLOG_REDIRECT_TARGET);
  return url.href;
}
export function redirectTargetPath(target: string) {
  return target.startsWith("/") ? target.split(/[?#]/)[0] : null;
}
export function assertNoRedirectChain(
  source: string,
  target: string,
  rules: { source: string; target: string }[],
) {
  const path = redirectTargetPath(target);
  if (path === source) throw new RedirectError(MSG.BLOG_REDIRECT_CYCLE);
  if (rules.some((r) => r.source === source))
    throw new RedirectError(MSG.BLOG_REDIRECT_EXISTS, 409);
  const outgoing = rules.find((r) => r.source === path);
  if (outgoing) {
    if (redirectTargetPath(outgoing.target) === source)
      throw new RedirectError(MSG.BLOG_REDIRECT_CYCLE);
    throw new RedirectError(
      `${MSG.BLOG_REDIRECT_CHAIN} ${source} → ${outgoing.target}`,
      409,
    );
  }
  const incoming = rules.find((r) => redirectTargetPath(r.target) === source);
  if (incoming)
    throw new RedirectError(
      `${MSG.BLOG_REDIRECT_CHAIN} ${incoming.source} → ${target}`,
      409,
    );
}
