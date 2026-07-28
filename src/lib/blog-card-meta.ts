const CATEGORY_META: Record<string, { color: string; bg: string; icon: "chart" | "menu" | "palette" | "qr" | "megaphone" }> = {
  guides: {
    color: "var(--color-primary)",
    bg: "linear-gradient(135deg, var(--color-primary-subtle), color-mix(in srgb, var(--color-accent) 14%, transparent))",
    icon: "qr",
  },
  analytics: {
    color: "var(--color-primary)",
    bg: "linear-gradient(135deg, var(--color-accent-subtle), color-mix(in srgb, var(--color-primary) 14%, transparent))",
    icon: "chart",
  },
  cases: {
    color: "var(--color-primary)",
    bg: "linear-gradient(135deg, var(--color-primary-subtle), color-mix(in srgb, var(--color-accent) 14%, transparent))",
    icon: "menu",
  },
  design: {
    color: "var(--color-accent)",
    bg: "linear-gradient(135deg, var(--color-accent-subtle), color-mix(in srgb, var(--color-primary) 14%, transparent))",
    icon: "palette",
  },
  marketing: {
    color: "var(--color-accent)",
    bg: "linear-gradient(135deg, var(--color-primary-subtle), color-mix(in srgb, var(--color-accent) 16%, transparent))",
    icon: "megaphone",
  },
};

const FALLBACK_META = [
  CATEGORY_META.analytics,
  CATEGORY_META.cases,
  CATEGORY_META.design,
] as const;

export function getBlogCardMeta(categorySlug: string | null | undefined, index = 0) {
  if (categorySlug && CATEGORY_META[categorySlug]) {
    return CATEGORY_META[categorySlug];
  }
  return FALLBACK_META[index % FALLBACK_META.length];
}
