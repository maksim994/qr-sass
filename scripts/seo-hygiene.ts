/**
 * Local + live SEO hygiene: sitemap must not list service URLs.
 * Usage:
 *   npx tsx --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/seo-hygiene.ts
 *   npm run seo:hygiene
 *   npm run seo:hygiene -- --live
 */
import { buildIndexableStaticPaths, findSitemapServiceUrls, getDefaultRobotsTxt } from "@/lib/seo-hygiene";
import { publicOrigin } from "@/lib/public-url";

const live = process.argv.includes("--live");
const liveOrigin = process.argv.find((arg) => arg.startsWith("--origin="))?.slice("--origin=".length) ?? "https://qr-s.ru";

function parseSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url, { headers: { "User-Agent": "QR-S-seo-hygiene/1.0" } });
  return { status: res.status, body: await res.text() };
}

async function main() {
  const staticPaths = buildIndexableStaticPaths();
  const localDenied = findSitemapServiceUrls(staticPaths.map((path) => `https://qr-s.ru${path === "/" ? "" : path}`));
  const robots = getDefaultRobotsTxt(publicOrigin());

  console.log(JSON.stringify({
    local: {
      staticPaths,
      deniedInStatic: localDenied,
      robotsDisallowsLogin: /Disallow:\s*\/login/i.test(robots),
    },
  }, null, 2));

  if (localDenied.length > 0) {
    throw new Error(`Local indexable paths include service URLs: ${localDenied.join(", ")}`);
  }

  if (!live) return;

  const sitemapUrl = `${liveOrigin.replace(/\/$/, "")}/sitemap.xml`;
  const robotsUrl = `${liveOrigin.replace(/\/$/, "")}/robots.txt`;
  const sitemap = await fetchText(sitemapUrl);
  const liveRobots = await fetchText(robotsUrl);
  const locs = sitemap.status === 200 ? parseSitemapLocs(sitemap.body) : [];
  const liveDenied = findSitemapServiceUrls(locs);

  const report = {
    live: {
      origin: liveOrigin,
      sitemapStatus: sitemap.status,
      sitemapCount: locs.length,
      serviceUrlsStillListed: liveDenied,
      robotsStatus: liveRobots.status,
      robotsDisallowsLogin: /Disallow:\s*\/login/i.test(liveRobots.body),
      note: liveDenied.length
        ? "После деплоя B30 login/register должны исчезнуть из sitemap. Не объединять статьи 301 без данных Вебмастера."
        : "Живой sitemap без служебных URL.",
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (liveDenied.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
