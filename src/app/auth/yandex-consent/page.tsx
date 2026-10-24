import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LegalConsentForm } from "@/components/auth/legal-consent-form";
import { readYandexPendingFromCookie } from "@/lib/legal-consent";

export default async function YandexConsentPage() {
  const pending = await readYandexPendingFromCookie();
  if (!pending) {
    redirect("/login");
  }

  const maskedEmail = pending.email.replace(/^(.{2})(.*)(@.*)$/, (_m, a, b, c) => `${a}${"*".repeat(Math.min(b.length, 4))}${c}`);

  return (
    <AuthShell mode="register" title="Завершение регистрации" subtitle={`Аккаунт Яндекс ID: ${maskedEmail}`}>
      <LegalConsentForm
        title=""
        subtitle=""
        submitLabel="Создать аккаунт"
        apiPath="/api/auth/yandex/complete"
        cancelHref="/api/auth/yandex/cancel"
        cancelLabel="Отмена — не создавать аккаунт"
      />
      <p className="qrs-auth-switch" style={{ marginTop: "16px" }}>
        <Link href="/api/auth/yandex/cancel" className="qrs-auth-switch__link">
          Вернуться ко входу без сохранения данных
        </Link>
      </p>
    </AuthShell>
  );
}
