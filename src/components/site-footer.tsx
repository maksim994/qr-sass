import Link from "next/link";

type Props = {
  session: { sub: string } | null;
};

export function SiteFooter({ session }: Props) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-slate-900">qr-s.ru</p>
            <p className="mt-2 text-sm text-slate-500">
              Генератор QR-кодов для бизнеса. Создавайте, кастомизируйте и отслеживайте.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Продукт</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/#features" className="text-sm text-slate-500 hover:text-slate-900">
                  Возможности
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="text-sm text-slate-500 hover:text-slate-900">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-sm text-slate-500 hover:text-slate-900">
                  FAQ
                </Link>
              </li>

              <li>
                <Link href="/changelog" className="text-sm text-slate-500 hover:text-slate-900">
                  Истоиия изменения
                </Link>
              </li>



              
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Решения</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/blog" className="text-sm text-slate-500 hover:text-slate-900">
                  Блог
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-sm text-slate-500 hover:text-slate-900">
                  История изменений
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Аккаунт</p>
            <ul className="mt-3 space-y-2">
              {session ? (
                <>
                  <li>
                    <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
                      Панель управления
                    </Link>
                  </li>
                  <li>
                    <form action="/api/auth/logout" method="post" className="inline">
                      <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
                        Выйти
                      </button>
                    </form>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900">
                      Войти
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-sm text-slate-500 hover:text-slate-900">
                      Регистрация
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
                      Панель управления
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-200 pt-8 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} qr-s.ru. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
