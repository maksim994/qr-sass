import Link from "next/link";

export function LoginEntryLegalNote() {
  return (
    <p className="qrs-auth-entry-legal">
      Входя, ты подтверждаешь условия{" "}
      <Link href="/terms-of-service" className="qrs-auth-inline-link">
        оферты
      </Link>{" "}
      и{" "}
      <Link href="/privacy-policy" className="qrs-auth-inline-link">
        политики обработки персональных данных
      </Link>
      .
    </p>
  );
}
