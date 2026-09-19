/** Public origin without a trailing slash. Avoids `https://qr-s.ru//blog/...` canonicals. */
export function publicOrigin(): string {
  return (process.env.APP_URL ?? "https://qr-s.ru").replace(/\/$/, "");
}

export function publicSiteUrl(path = ""): string {
  const origin = publicOrigin();
  if (!path) return origin;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${suffix}`;
}
