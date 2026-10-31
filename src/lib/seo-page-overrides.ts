import type { Metadata } from "next";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { landingMetadata } from "@/lib/landing-seo";
import { NOINDEX_ROBOTS } from "@/lib/seo-hygiene";
import { mergeSeoFields, type SeoOverrideSnapshot, type ResolvedSeoFields } from "@/lib/seo-page-fields";
import { publicSiteUrl } from "@/lib/public-url";
import { getSeoPageCatalog, getSeoPageCatalogEntry, type SeoPageCatalogEntry } from "@/lib/seo-page-registry";
import type { SearchLanding } from "@/lib/search-landing-types";

export type { SeoOverrideSnapshot, ResolvedSeoFields } from "@/lib/seo-page-fields";

// Memoized only within a render request: edits are visible on the next request,
// including in another worker. A process-local TTL cannot be invalidated reliably.
const loadOverrideMap = cache(async () => {
  try {
    const rows = await getDb().seoPageOverride.findMany();
    return new Map(rows.map(row => [row.path, row]));
  } catch {
    // Public pages keep their code defaults while the additive migration is pending.
    return new Map();
  }
});

export async function getSeoOverrideSnapshot(path: string): Promise<SeoOverrideSnapshot | null> {
  const map = await loadOverrideMap();
  const row = map.get(path);
  if (!row) return null;
  return {
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    heading: row.heading,
    noindex: row.noindex,
  };
}

export async function resolveSeoFieldsForPath(
  path: string,
  defaults: Pick<SeoPageCatalogEntry, "title" | "description" | "heading" | "noindex">,
): Promise<ResolvedSeoFields> {
  const override = await getSeoOverrideSnapshot(path);
  return mergeSeoFields(defaults, override);
}

export async function resolveSeoFieldsFromCatalog(path: string): Promise<ResolvedSeoFields | null> {
  const entry = getSeoPageCatalogEntry(path);
  if (!entry) return null;
  return resolveSeoFieldsForPath(entry.path, entry);
}

export async function applySeoOverridesToSearchLanding(page: SearchLanding): Promise<SearchLanding & ResolvedSeoFields> {
  const resolved = await resolveSeoFieldsForPath(`/${page.slug}`, {
    title: page.title,
    description: page.description,
    heading: page.heading,
    noindex: Boolean(page.noindex),
  });
  return { ...page, ...resolved };
}

export async function buildPathMetadata(
  path: string,
  defaults: {
    title: string;
    description: string;
    keywords?: string[];
    noindex?: boolean;
  },
): Promise<Metadata> {
  const resolved = await resolveSeoFieldsForPath(path, {
    title: defaults.title,
    description: defaults.description,
    heading: null,
    noindex: defaults.noindex ?? false,
  });
  const slug = path === "/" ? "home" : path.replace(/^\//, "");
  const base = landingMetadata({
    slug,
    title: resolved.title,
    description: resolved.description,
    keywords: defaults.keywords ?? [],
    noindex: resolved.noindex,
  });
  const url = publicSiteUrl(path === "/" ? "" : path);
  return {
    ...base,
    alternates: { canonical: url },
    openGraph: { ...base.openGraph, url },
  };
}

export async function getSeoPageHeading(path: string, fallback: string): Promise<string> {
  return (await getSeoOverrideSnapshot(path))?.heading?.trim() || fallback;
}

/** Preserve each route's canonical, OG and query indexing policy. */
export async function applySeoOverridesToMetadata(
  path: string,
  defaults: Metadata,
  options: { preserveRobots?: boolean } = {},
): Promise<Metadata> {
  const override = await getSeoOverrideSnapshot(path);
  const title = override?.metaTitle?.trim();
  const description = override?.metaDescription?.trim();
  const robots = options.preserveRobots ? defaults.robots
    : override?.noindex == null ? defaults.robots
      : override.noindex ? NOINDEX_ROBOTS : { index: true, follow: true };
  return {
    ...defaults,
    ...(title ? { title: { absolute: title } } : {}),
    ...(description ? { description } : {}),
    ...(robots ? { robots } : {}),
    ...(title || description ? {
      openGraph: { ...defaults.openGraph, ...(title ? { title } : {}), ...(description ? { description } : {}) },
      twitter: { ...defaults.twitter, ...(title ? { title } : {}), ...(description ? { description } : {}) },
    } : {}),
  };
}

export async function seoPageIndexing(): Promise<Map<string, boolean>> {
  const overrides = await loadOverrideMap();
  return new Map(getSeoPageCatalog().map(entry => [entry.path, overrides.get(entry.path)?.noindex ?? entry.noindex]));
}
