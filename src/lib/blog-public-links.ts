/** Byte-preserving maintenance of three known public CTA targets in legacy HTML. */
export function replacePrivateArticleLinks(content: string) {
  const targets: Record<string, string> = {
    "/dashboard/billing": "/pricing",
    "/dashboard/create/menu": "/qr-menu",
    "/dashboard/create/url": "/#create-qr",
  };
  return content.replace(/(<a\b[^>]*?\bhref\s*=\s*)(["'])([^"']*)\2/gi, (match, prefix, quote, href) => {
    const path = href.replace(/^https?:\/\/(?:www\.)?qr-s\.ru/i, "");
    return targets[path] ? `${prefix}${quote}${targets[path]}${quote}` : match;
  });
}
export function isPublicLinkMaintenance(before: string, after: string) {
  return before !== after && replacePrivateArticleLinks(before) === after;
}
