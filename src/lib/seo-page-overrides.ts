import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { landingMetadata } from "@/lib/landing-seo";
import { NOINDEX_ROBOTS } from "@/lib/seo-hygiene";
import { publicSiteUrl } from "@/lib/public-url";
import { getSeoPageCatalogEntry, type SeoPageCatalogEntry } from "@/lib/seo-page-registry";
import type { SearchLanding } from "@/lib/search-landing-types";

export type SeoOverrideSnapshot = {
  metaTitle: string | null;
  metaDescription: string | null;
  heading: string | null;
  noindex: boolean | null;
};

export type ResolvedSeoFields = {
  title: string;
  description: string;
  heading: string;
  noindex: boolean;
};

type OverrideRow = {
  path: string;
  metaTitle: string | null;
  metaDescription: string | null;
  heading: string | null;
  noindex: boolean | null;
  updatedAt: Date;
};

const CACHE_TTL_MS = 60_000;
let cache: { loadedAt: number; map: Map<string, OverrideRow> } | null = null;

export function invalidateSeoPageOverrideCache(): void {
  cache = null;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function loadOverrideMap(): Promise<Map<string, OverrideRow>> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.map;
  try {
    const rows = await getDb().seoPageOverride.findMany();
    const map = new Map(rows.map((row) => [row.path, row]));
    cache = { loadedAt: Date.now(), map };
    return map;
  } catch {
    return new Map();
  }
}

export function mergeSeoFields(
  defaults: Pick<SeoPageCatalogEntry, "title" | "description" | "heading" | "noindex">,
  override: SeoOverrideSnapshot | null | undefined,
): ResolvedSeoFields {
  return {
    title: trimOrNull(override?.metaTitle) ?? defaults.title,
    description: trimOrNull(override?.metaDescription) ?? defaults.description,
    heading: trimOrNull(override?.heading) ?? defaults.heading ?? defaults.title,
    noindex: override?.noindex ?? defaults.noindex,
  };
}

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

export function snapshotIsEmpty(snapshot: SeoOverrideSnapshot): boolean {
  return (
    !trimOrNull(snapshot.metaTitle) &&
    !trimOrNull(snapshot.metaDescription) &&
    !trimOrNull(snapshot.heading) &&
    snapshot.noindex === null
  );
}

export function seoLengthWarnings(title: string, description: string): { title?: string; description?: string } {
  const warnings: { title?: string; description?: string } = {};
  if (title.length > 60) warnings.title = `Title длиннее 60 символов (${title.length}).`;
  if (description.length > 160) warnings.description = `Description длиннее 160 символов (${description.length}).`;
  return warnings;
}

export { NOINDEX_ROBOTS };
