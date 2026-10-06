import Link from "next/link";

export function PaymentTermsLinks({ newTab = false }: { newTab?: boolean }) {
  const target = newTab ? "_blank" : undefined;
  const rel = newTab ? "noopener noreferrer" : undefined;

  return <div className="space-y-2">
    <p>Оплачивая выбранный тариф, вы принимаете <Link href="/terms-of-service" target={target} rel={rel} className="underline underline-offset-4">публичную оферту</Link>.</p>
    <nav aria-label="Условия покупки" className="flex flex-wrap gap-x-4 gap-y-2">
    <Link href="/terms-of-service#payment" target={target} rel={rel} className="underline underline-offset-4">Оплата и предоставление доступа</Link>
    <Link href="/terms-of-service#refund" target={target} rel={rel} className="underline underline-offset-4">Отказ и возврат денег</Link>
    </nav>
  </div>;
}
