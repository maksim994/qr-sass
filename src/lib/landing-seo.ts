import type { Metadata } from "next";
import { publicSiteUrl } from "@/lib/public-url";

type LandingIdentity = { slug: string; title: string; description: string; keywords: string[] };

export function landingMetadata(page: LandingIdentity): Metadata {
  const url = publicSiteUrl(`/${page.slug}`);
  const image = { url: publicSiteUrl(`/images/landings/${page.slug}.png`), width: 1200, height: 630, alt: page.title };
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: { type: "website", locale: "ru_RU", siteName: "QR-S.ru", title: page.title, description: page.description, url, images: [image] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image.url] },
  };
}

export function landingStructuredData(page: LandingIdentity, label: string) {
  const url = publicSiteUrl(`/${page.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: "ru-RU", breadcrumb: { "@id": `${url}#breadcrumb` } },
      { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: publicSiteUrl() },
        { "@type": "ListItem", position: 2, name: label, item: url },
      ] },
    ],
  };
}
