// Pure SEO field helpers shared with the editor; no database or server imports.
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

export type SeoFieldDefaults = { title: string; description: string; heading: string | null; noindex: boolean };

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function mergeSeoFields(
  defaults: SeoFieldDefaults,
  override: SeoOverrideSnapshot | null | undefined,
): ResolvedSeoFields {
  return {
    title: trimOrNull(override?.metaTitle) ?? defaults.title,
    description: trimOrNull(override?.metaDescription) ?? defaults.description,
    heading: trimOrNull(override?.heading) ?? defaults.heading ?? defaults.title,
    noindex: override?.noindex ?? defaults.noindex,
  };
}

export function seoLengthWarnings(title: string, description: string): { title?: string; description?: string } {
  const warnings: { title?: string; description?: string } = {};
  if (title.length > 60) warnings.title = `Title длиннее 60 символов (${title.length}).`;
  if (description.length > 160) warnings.description = `Description длиннее 160 символов (${description.length}).`;
  return warnings;
}

