import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LegalConsentForm } from "@/components/auth/legal-consent-form";
import { getSession } from "@/lib/auth";
import { userNeedsConsentRenewal } from "@/lib/legal-consent";

export default async function ConsentRenewPage() {
  const session = await getSession();
  if (!session?.sub) {
    redirect("/login");
  }

  const needs = await userNeedsConsentRenewal(session.sub);
  if (!needs) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      mode="login"
      title="Обновление согласия"
      subtitle="Мы обновили условия обработки персональных данных. Подтвердите согласие, чтобы продолжить работу в кабинете."
    >
      <LegalConsentForm
        title=""
        subtitle=""
        submitLabel="Подтвердить и продолжить"
        apiPath="/api/auth/legal-consent"
      />
    </AuthShell>
  );
}
