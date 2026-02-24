import Link from "next/link";

const navLinks = [
  { label: "Возможности", href: "/#features" },
  { label: "Тарифы", href: "/#pricing" },
  { label: "Блог", href: "/blog" },
  { label: "История изменений", href: "/changelog" },
  { label: "FAQ", href: "/#faq" },
];

type Props = {
  session: { sub: string } | null;
  isAdmin?: boolean;
};

export function SiteHeader({ session, isAdmin }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
          qr-s.ru
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {isAdmin && (
                <Link href="/admin" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                  Админ
                </Link>
              )}
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                В кабинет
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Войти
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Начать бесплатно
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
