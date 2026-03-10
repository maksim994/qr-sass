export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  heading: string;
  bullets: string[];
  cta: string;
  keywords: string[];
};

const seoPages: SeoPage[] = [];

export function getSeoPages() {
  return seoPages;
}

export function getSeoPage(slug: string) {
  return seoPages.find((item) => item.slug === slug);
}
