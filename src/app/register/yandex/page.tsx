import type { Metadata } from "next";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { YandexRegistration } from "./yandex-registration";
export const metadata: Metadata = { title: "Регистрация через Яндекс", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return <YandexRegistration nextPath={safePostAuthPath((await searchParams).next, "/dashboard")} />;
}
