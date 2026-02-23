import { QreateFooter } from "./qreate-footer";

type LinkItem = { label?: string; url?: string };

type Props = { payload: Record<string, unknown> };

export function LinkListLanding({ payload }: Props) {
  const title = (payload.title as string) || "Ссылки";
  const links = (payload.links as LinkItem[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <h1 className="text-center text-2xl font-bold text-gray-900">{title}</h1>

        {links.length === 0 && (
          <p className="mt-4 text-center text-gray-500">Нет ссылок</p>
        )}

        <div className="mt-6 space-y-3">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-gray-200 px-5 py-4 text-sm font-medium text-gray-800 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <span>{link.label || link.url}</span>
              <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      <QreateFooter />
    </div>
  );
}
