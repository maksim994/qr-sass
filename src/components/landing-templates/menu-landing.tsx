import { QreateFooter } from "./qreate-footer";

type MenuItem = { name?: string; description?: string; price?: string | number };
type Category = { name?: string; items?: MenuItem[] };

type Props = { payload: Record<string, unknown> };

export function MenuLanding({ payload }: Props) {
  const title = (payload.title as string) || "Меню";
  const categories = (payload.categories as Category[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        {categories.length === 0 && (
          <p className="mt-4 text-gray-500">Меню пока пусто</p>
        )}

        <div className="mt-6 space-y-8">
          {categories.map((cat, ci) => (
            <section key={ci}>
              {cat.name && (
                <h2 className="border-b border-gray-100 pb-2 text-lg font-semibold text-gray-800">
                  {cat.name}
                </h2>
              )}

              <ul className="mt-3 space-y-3">
                {(cat.items ?? []).map((item, ii) => (
                  <li
                    key={ii}
                    className="flex items-start justify-between gap-4 rounded-xl bg-gray-50 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                      )}
                    </div>
                    {item.price != null && (
                      <span className="shrink-0 font-semibold text-blue-600">
                        {item.price}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <QreateFooter />
    </div>
  );
}
