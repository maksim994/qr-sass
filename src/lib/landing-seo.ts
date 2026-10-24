import type { Metadata } from "next";
import { publicSiteUrl } from "@/lib/public-url";

import { NOINDEX_ROBOTS } from "@/lib/seo-hygiene";

type LandingIdentity = { slug: string; title: string; description: string; keywords: string[]; noindex?: boolean };

export function landingMetadata(page: LandingIdentity): Metadata {
  const url = publicSiteUrl(`/${page.slug}`);
  const image = { url: publicSiteUrl("/opengraph-image.png"), width: 1200, height: 630, alt: page.title };
  const robots = page.noindex ? NOINDEX_ROBOTS : { index: true, follow: true };
  return {
    title: { absolute: page.title },
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: url },
    robots,
    openGraph: { type: "website", locale: "ru_RU", siteName: "QR-S.ru", title: page.title, description: page.description, url, images: [image] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image.url] },
  };
}

export function landingStructuredData(page: LandingIdentity, label: string, faqs: {question:string;answer:string}[] = []) {
  const url = publicSiteUrl(`/${page.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...(faqs.length ? [{"@type":"FAQPage", mainEntity:faqs.map(faq=>({"@type":"Question",name:faq.question,acceptedAnswer:{"@type":"Answer",text:faq.answer}}))}] : []),
      { "@type": "WebPage", "@id": `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: "ru-RU", breadcrumb: { "@id": `${url}#breadcrumb` } },
      { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: publicSiteUrl() },
        { "@type": "ListItem", position: 2, name: label, item: url },
      ] },
    ],
  };
}
