import type { StaticQrType } from "@/lib/static-qr";
import type { LandingInputMode } from "@/lib/landing-input";

type Faq = { question: string; answer: string };

export type SearchLanding = {
  slug: string;
  label: string;
  title: string;
  heading: string;
  description: string;
  type: StaticQrType;
  inputMode?: LandingInputMode;
  inputLabel?: string;
  placeholder?: string;
  frame?: string;
  steps: [string, string][];
  sections: { heading: string; text: string }[];
  staticCopy: string;
  dynamicCopy: string;
  articles: [string, string][];
  related: string[];
  faqs: Faq[];
  hosted?: { type: string; label: string; text: string };
  source?: { url: string; label: string };
  noindex?: boolean;
  faqSectionTitle?: string;
  skipGenerator?: boolean;
  /** Steps without web-generator guide screenshots (e.g. Bitrix admin flow). */
  stepsTextOnly?: boolean;
};
