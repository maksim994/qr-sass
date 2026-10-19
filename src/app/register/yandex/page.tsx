import type { Metadata } from "next";
import { safePostAuthPath } from "@/lib/safe-redirect";
import { YandexRegistration } from "./yandex-registration";
import { isYandexAuthConfigured } from "@/lib/yandex-auth-config";
import { redirect } from "next/navigation";
export const metadata: Metadata = { title: "Регистрация через Яндекс", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safePostAuthPath((await searchParams).next, "/dashboard");
  if (!isYandexAuthConfigured()) redirect(`/register?next=${encodeURIComponent(nextPath)}`);
  return <YandexRegistration nextPath={nextPath} />;
}
