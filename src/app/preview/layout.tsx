import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo-hygiene";

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
