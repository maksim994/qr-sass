import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo-hygiene";

export const metadata: Metadata = {
  title: "Telegram Mini App",
  robots: NOINDEX_ROBOTS,
};

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return children;
}
