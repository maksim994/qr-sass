import type { Metadata } from "next";
import { publicSiteUrl } from "@/lib/public-url";
export const metadata: Metadata = {title:"Восстановление пароля | QR-S.ru",openGraph:{url:publicSiteUrl("/forgot-password"),images:[publicSiteUrl("/opengraph-image.png")]}};
import { ForgotPasswordClient } from "./forgot-password-client";

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
