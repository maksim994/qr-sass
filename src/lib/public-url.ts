/** Public origin without a trailing slash. Avoids `https://qr-s.ru//blog/...` canonicals. */
export function publicOrigin(): string {
  return new URL((process.env.APP_URL ?? "https://qr-s.ru").trim()).origin;
}

export function publicSiteUrl(path = ""): string {
  const origin = publicOrigin();
  if (!path) return origin;
  // Normalize only the pathname: a query may legitimately contain https:// URLs.
  // A leading // is a local path here, never a protocol-relative external host.
  const boundary = path.search(/[?#]/);
  const pathname = boundary < 0 ? path : path.slice(0, boundary);
  const queryOrHash = boundary < 0 ? "" : path.slice(boundary);
  const normalized = `/${pathname}`.replace(/\/{2,}/g, "/");
  return `${origin}${normalized}${queryOrHash}`;
}
